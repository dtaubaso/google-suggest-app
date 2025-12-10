// Archivo: /pages/api/suggestions.js

import fetch from 'node-fetch';
import { Redis } from '@upstash/redis'; 
import { parseStringPromise } from 'xml2js';

// Inicialización de Redis (Asegúrate de que estas variables estén configuradas en Vercel)
const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

// --- Definiciones Generales ---
const BASE_URL = "https://suggestqueries.google.com/complete/search";

// Expansiones para ES (Mantenemos preguntas en español como en tu script)
const meses = {
    // Español (es / es-419)
    es: [
        "enero", "febrero", "marzo", "abril", "mayo", "junio", 
        "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
    ],
    // Inglés (en)
    en: [
        "january", "february", "march", "april", "may", "june", 
        "july", "august", "september", "october", "november", "december"
    ],
    // Portugués (pr)
    pr: [
        "janeiro", "fevereiro", "março", "abril", "maio", "junho", 
        "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
    ]
};
const alfabetos = [...Array(26)].map((_, i) => String.fromCharCode(97 + i)); // a-z
const numeros = [...Array(10)].map((_, i) => (i + 1).toString()); // 1-10

// Preguntas en español para la categoría "preguntas"
const preguntas_es = ["cómo", "qué", "por qué", "cuándo", "dónde", "quién", "cuál"];
// Preguntas en inglés para la categoría "preguntas"
const preguntas_en = ["how", "what", "why", "when", "where", "who", "which"]; 
// Preguntas en portugués para la categoría "preguntas"
const preguntas_pr = ["como", "o que", "por que", "quando", "onde", "quem", "qual"];

const preguntasMap = {
    es: preguntas_es,
    "es-419": preguntas_es,
    en: preguntas_en,
    pr: preguntas_pr,
};

// Función auxiliar para obtener y parsear sugerencias (XML)
async function fetchSuggestions(query, language, country, category, consultaOriginal) {    
    // 💡 USAMOS EL CLIENTE XML/TOOLBAR ORIGINAL
    const params_base = new URLSearchParams({
        output: "toolbar", // Cliente XML
        hl: language,      // Idioma
        gl: country,       // País
        q: query           // Consulta
    });
    
    const url = `${BASE_URL}?${params_base.toString()}`;

    try {
        const response = await fetch(url);
        
        // 1. Obtener buffer y decodificar a 'latin1' (ISO-8859-1) para corregir acentos y ñ
        const arrayBuffer = await response.arrayBuffer(); 
        const buffer = Buffer.from(arrayBuffer);
        const xml = buffer.toString('latin1'); // **Corrección de codificación**
        
        // 2. Parsear el XML
        // NOTA: xml2js fue inicializado con explicitArray: false para simplificar la estructura
        const result = await parseStringPromise(xml, { explicitArray: false, ignoreAttrs: false });
        
        let sugerencias = [];

        // Obtener el potencial array de sugerencias
        const xmlSuggestions = result.toplevel?.CompleteSuggestion;
        
        // 💡 CORRECCIÓN CLAVE: Asegurar que xmlSuggestions sea un array, incluso si es un solo elemento.
        const suggestionsArray = Array.isArray(xmlSuggestions) ? xmlSuggestions : (xmlSuggestions ? [xmlSuggestions] : []);
        
        // Mapear los datos de sugerencia
        sugerencias = suggestionsArray
            .map(s => s.suggestion?.$?.data)
            .filter(s => s); // Filtrar nulos o vacíos

        // Mapear los resultados al formato deseado (AÑADIDO: consultaOriginal)
        return sugerencias.map(s => ({
            categoria: category,
            consulta: consultaOriginal, 
            sugerencia: s,
        }));

    } catch (error) {
        console.error(`Error al obtener sugerencias para "${query}" o parsear XML:`, error);
        return [];
    }
}


export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Solo se acepta el método POST' });
    }

    const { keyword, country, language } = req.body;
    const glCode = country === 'pr' ? 'us' : country; 

   // Determinar el idioma de los meses
    const langKey = language.startsWith('es') ? 'es' : (language === 'en' ? 'en' : 'pr');
    const meses_del_idioma = meses[langKey] || meses['es']; // Fallback a español
    
    // Obtener los valores temporales
    const año_actual = new Date().getFullYear();
    const año_siguiente = año_actual + 1;
    const año_anterior = año_actual - 1;

    // 1. Definir todas las expansiones (MODIFICADO para usar meses_del_idioma y año_siguiente/anterior)
    const expansiones = {
        "Base (K)": [keyword], 
        
        // 💡 MODIFICADO: Uso de los meses en el idioma correcto
        "Meses (K + M)": meses_del_idioma.map(m => `${keyword} ${m}`), 
        
        // Uso de años (Actual, Siguiente, Anterior)
        "Años (K + A)": [
            `${keyword} ${año_actual}`, 
            `${keyword} ${año_siguiente}`,
            `${keyword} ${año_anterior}`,
        ],

        "Alfabeto (K + L)": alfabetos.map(l => `${keyword} ${l}`),
        "Números (K + N)": numeros.map(n => `${keyword} ${n}`),
        "Preguntas (P + K)": preguntas[langKey].map(p => `${p} ${keyword}`), // Preguntas ya usa langKey
    };

    let finalResults = [];

    // 2. Ejecutar todas las expansiones (MODIFICADO para incluir la consulta)
    for (const [categoria, consultas] of Object.entries(expansiones)) {
        for (const consulta of consultas) {
            const results = await fetchSuggestions(consulta, language, glCode, categoria, consulta);
        
            finalResults.push(...results);
        }
    }
    
    // 3. Eliminar duplicados y formatear
    const uniqueMap = new Map();
    finalResults.forEach(item => {
        const suggestionKey = item.sugerencia; // Clave: la sugerencia misma
        
        // 💡 CORRECCIÓN CLAVE: Solo establecer la clave si NO existe.
        // Esto garantiza que la sugerencia conserva la CATEGORÍA de la PRIMERA expansión
        // que la encontró (que suele ser la más simple/directa, como "Base (K)" si no se repite).
        if (!uniqueMap.has(suggestionKey)) {
             uniqueMap.set(suggestionKey, item);
        }
    });

    const uniqueResults = Array.from(uniqueMap.values());
    
    // 4. Lógica de Logging (sin cambios)
    try {
        const timestamp = Date.now();
        const logEntry = {
            keyword: keyword,
            country: country,
            language: language,
            results_count: uniqueResults.length,
            date: new Date().toISOString(),
        };
        await redis.set(`search_log:${timestamp}`, JSON.stringify(logEntry));
    } catch (error) {
        console.error("Error al guardar log en Upstash Redis:", error);
    }

    // 5. Responder al frontend
    res.status(200).json({ data: uniqueResults });
}
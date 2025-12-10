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
const meses_es = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
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
        const result = await parseStringPromise(xml, { explicitArray: false, ignoreAttrs: false });
        
        let sugerencias = [];

        // Navegar a través de la estructura XML para obtener las sugerencias
        const xmlSuggestions = result.toplevel?.CompleteSuggestion;
        
        if (Array.isArray(xmlSuggestions)) {
            sugerencias = xmlSuggestions.map(s => s.suggestion?.$?.data).filter(s => s);
        } else if (xmlSuggestions) { 
            const data = xmlSuggestions.suggestion?.$?.data;
            if (data) sugerencias.push(data);
        }

        // Mapear los resultados al formato deseado (Solo categoria y sugerencia)
       return sugerencias.map(s => ({
        categoria: category,
        consulta: consultaOriginal, // <-- CLAVE: Trazar la consulta que generó la sugerencia
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

    const now = new Date();
    const mes_actual_index = now.getMonth(); // 0 a 11
    const mes_actual = meses_es[mes_actual_index];
    const año_actual = now.getFullYear().toString();
    const preguntas = preguntasMap[language] || preguntas_es;

    // 1. Definir todas las expansiones
    const expansiones = {
        // 💡 AÑADIDO: Ejecución de la Keyword Base (solo la KW)
        "Base (K)": [keyword], 
        "Mes y Año (K + T)": [
            `${keyword} ${mes_actual}`, 
            `${keyword} ${año_actual}`
        ],
        "Alfabeto (K + L)": alfabetos.map(l => `${keyword} ${l}`),
        "Números (K + N)": numeros.map(n => `${keyword} ${n}`),
        "Preguntas (P + K)": preguntas.map(p => `${p} ${keyword}`),
    };

    let finalResults = [];

    // 2. Ejecutar todas las expansiones (MODIFICADO para incluir la consulta)
    for (const [categoria, consultas] of Object.entries(expansiones)) {
        for (const consulta of consultas) {
            // El fetchSuggestions debe devolver la 'consulta' para rastrearla
            const results = await fetchSuggestions(consulta, language, glCode, categoria, consulta);
            finalResults.push(...results);
        }
    }
    
    // 3. Eliminar duplicados y formatear
    const uniqueMap = new Map();
    finalResults.forEach(item => {
        // Usamos la sugerencia como clave para asegurar unicidad
        uniqueMap.set(item.sugerencia, item);
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
// Archivo: /pages/api/suggestions.js

import fetch from 'node-fetch';
import { Redis } from '@upstash/redis'; 

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

// --- FUNCIÓN PRINCIPAL DE SCRAPING ---
async function fetchSuggestions(query, language, country, category) {
    const params_base = new URLSearchParams({
        client: "chrome", // Clave para obtener respuesta JSON con relevancia
        hl: language,     // Idioma
        gl: country,      // País
        q: query          // Consulta
    });
    
    const url = `${BASE_URL}?${params_base.toString()}`;

    try {
        const response = await fetch(url);
        
        // El cliente=chrome debería devolver un JSON que Node.js puede parsear directamente
        // Sin necesidad de buffer o latin1. Si hay problemas, ajustamos.
        const data = await response.json(); 
        
        // Estructura de la respuesta JSON del cliente chrome:
        // [ "consulta", [sugerencias], ..., [metadatos de relevancia] ]
        
        let sugerencias = [];

        if (Array.isArray(data) && data.length > 1 && Array.isArray(data[1])) {
            sugerencias = data[1];
        }
        
        // Mapear los resultados al formato deseado (Solo categoria y sugerencia)
        return sugerencias.map(s => ({
            categoria: category,
            sugerencia: s,
        }));

    } catch (error) {
        console.error(`Error al obtener sugerencias para "${query}":`, error);
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
        "Base": [keyword],
        "Mes y Año": [
            `${keyword} ${mes_actual}`, 
            `${keyword} ${año_actual}`
        ],
        "Alfabeto (K + L)": alfabetos.map(l => `${keyword} ${l}`),
        "Números (K + N)": numeros.map(n => `${keyword} ${n}`),
        "Preguntas (P + K)": preguntas.map(p => `${p} ${keyword}`),
    };

    let finalResults = [];

    // 2. Ejecutar todas las expansiones de forma concurrente
    for (const [categoria, consultas] of Object.entries(expansiones)) {
        for (const consulta of consultas) {
            const results = await fetchSuggestions(consulta, language, glCode, categoria);
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
// Archivo: /pages/api/suggestions.js

import fetch from 'node-fetch';
import { parseStringPromise } from 'xml2js'; 

// --- Definiciones Globales ---
const questionSets = {
  en: ["", "what", "who", "where", "when", "why", "which", "how much", "how many", "how", "can", "is", "could", "should", "would", "want to"],
  es: ["", "qué", "quién", "dónde", "cuándo", "por qué", "cuál", "cuánto", "cuántos", "cómo", "puede", "ser", "podría", "debería", "quisiera"],
  "es-419": ["", "qué", "quién", "dónde", "cuándo", "por qué", "cuál", "cuánto", "cuántos", "cómo", "puede", "ser", "podría", "debería", "quisiera"], 
  pr: ["", "o que", "quem", "onde", "quando", "porque", "qual", "quanto", "quantos", "como", "pode", "ser", "poderia", "deveria", "gostaria"],
};

const letters = [
  new Date().getFullYear().toString(), 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
  '1', '2', '3', '4', '5', '6', '7', '8', '9'
];

const allowedCountries = ['mx', 'gt', 'hn', 'sv', 'ni', 'cr', 'pa', 'do', 'co', 've', 'ec', 'pe', 'bo', 'cl', 'ar', 'uy', 'py', 'br', 'es', 'us'];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Solo se acepta el método POST' });
  }

  const { keyword, country, language } = req.body;

  if (!keyword || !country || !language) {
    return res.status(400).json({ error: 'Faltan parámetros: keyword, country, o language.' });
  }

  if (!questionSets[language] || !allowedCountries.includes(country)) {
     // Nota: La validación de 'country' podría fallar si enviamos 'pr', pero lo corregimos abajo.
  }
  
  // 💡 CLAVE: Procesamos el código geográfico aquí
  const glCode = country === 'pr' ? 'us' : country; 

  let keywords = new Set(); // Usamos Set para evitar duplicados

  // 💡 CLAVE: Definimos fetchSuggestions DENTRO del handler para que herede las variables (closure)
  async function fetchSuggestions(query) {
    // Usamos glCode y language, que son accesibles desde el handler
    const url = `http://suggestqueries.google.com/complete/search?output=toolbar&hl=${language}&q=${encodeURIComponent(query)}&gl=${glCode}`;

    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const xml = buffer.toString('latin1');

      // Parsea el XML
      const result = await parseStringPromise(xml, { explicitArray: false, ignoreAttrs: false });

      const suggestions = result.toplevel?.CompleteSuggestion;
      
      if (Array.isArray(suggestions)) {
        suggestions.forEach(suggestion => {
          const data = suggestion.suggestion?.$?.data;
          if (data) {
            keywords.add(data);
          }
        });
      } else if (suggestions) { 
          const data = suggestions.suggestion?.$?.data;
          if (data) {
            keywords.add(data);
          }
      }

    } catch (error) {
      console.error(`Error al obtener sugerencias para "${query}":`, error);
      // Opcional: Propagar error o continuar
    }
  }

  // 1. Obtener sugerencias con preguntas
  const questions = questionSets[language];
  for (const q of questions) {
    await fetchSuggestions(`${q} ${keyword}`);
  }

  // 2. Obtener sugerencias con letras antes y después
  for (const l of letters) {
    await fetchSuggestions(`${keyword} ${l}`);
    await fetchSuggestions(`${l} ${keyword}`);
  }

  const resultList = Array.from(keywords).map(k => [k]);
  resultList.unshift(["Sugerencias de Google"]); // Añade la cabecera

  res.status(200).json({ data: resultList });
}
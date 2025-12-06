// Archivo: pages/index.js
import { useState } from 'react';
import Head from 'next/head'; // 💡 IMPORTANTE: Importar el componente Head

// --- ESTILO PARA EL SPINNER (Animación de carga) ---
const spinnerStyle = {
  border: '4px solid rgba(0, 0, 0, .1)',
  borderTop: '4px solid #fff',
  borderRadius: '50%',
  width: '16px',
  height: '16px',
  animation: 'spin 1s linear infinite',
  display: 'inline-block',
  marginRight: '8px',
};

// Next.js permite agregar CSS globalmente.
// Si esto se ejecutara fuera de un ambiente de React/Next.js, necesitarías agregar esta regla CSS globalmente.
// En un archivo .css o dentro de <style> en el componente.
const globalStyles = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

// Conjuntos de idioma (hl) para el parámetro de Google
const questionSets = {
  es: "Español (España)",
  "es-419": "Español (Latinoamérica)",
  en: "Inglés (EN)",
  pr: "Portugués (PR)",
};

// Países permitidos (gl) para el parámetro de Google (Sin orden alfabético inicial)
const countriesMap = {
  ar: "Argentina", mx: "México", gt: "Guatemala", hn: "Honduras", sv: "El Salvador", 
  ni: "Nicaragua", cr: "Costa Rica", pa: "Panamá", do: "República Dominicana", pr: "Puerto Rico", 
  co: "Colombia", ve: "Venezuela", ec: "Ecuador", pe: "Perú", bo: "Bolivia", cl: "Chile", 
  uy: "Uruguay", py: "Paraguay", br: "Brasil", es: "España", us: "EE. UU. (Resto)",
};

// Función para exportar a CSV
const exportToCSV = (data, keyword) => {
  const csvContent = data.map(e => e.join(",")).join("\n");
  const bom = "\ufeff"; 
  
  // 💡 CLAVE: Generar un timestamp numérico (similar a int(time.time()) de Python)
  // Date.now() devuelve milisegundos. Dividimos por 1000 y usamos Math.floor para obtener segundos enteros.
  const timestamp = Math.floor(Date.now() / 1000); 
  
  // Limpiar la palabra clave y construir el nombre del archivo
  const safeKeyword = keyword.replace(/\s/g, '_').replace(/[^a-zA-Z0-9_]/g, ''); // Eliminar caracteres especiales
  const filename = `sugerencias_${safeKeyword}_${timestamp}.csv`;
  
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename); // Usamos el nombre de archivo único
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// --- ORDENAR PAÍSES ALFABÉTICAMENTE ---
const sortedCountries = Object.entries(countriesMap)
  .sort(([, nameA], [, nameB]) => nameA.localeCompare(nameB));


export default function Home() {
  const [keyword, setKeyword] = useState('');
  const [country, setCountry] = useState('ar'); 
  const [language, setLanguage] = useState('es-419'); 
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResults([]);
    setError(null);

    const glCode = country === 'pr' ? 'us' : country; 

    try {
      const response = await fetch('/api/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ keyword, country: glCode, language }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ocurrió un error en el servidor. Revisa el terminal de VS Code para más detalles.');
      }

      setResults(data.data);
    } catch (err) {
      setError(err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };


  return (
    <>
      {/* 💡 AÑADIDO: Título de la página para la pestaña del navegador */}
      <Head>
        <title>Google Suggest Tool | Keyword Harvester SEO</title>
      </Head>

      <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
        <style dangerouslySetInnerHTML={{ __html: globalStyles }} />

        <h1>🔍 Buscador de Sugerencias de Google</h1>
        
        {/* 💡 AÑADIDO: Crédito y enlace con tipografía más pequeña */}
        <p style={{ fontSize: '0.85em', color: '#555', marginTop: '-10px', marginBottom: '20px' }}>
          Por <a href="https://www.linkedin.com/in/dtaubaso/" target="_blank" rel="noopener noreferrer" style={{ color: '#0070f3', textDecoration: 'none' }}>Damian Taubaso</a>
        </p>
        
        <p>Introduce una palabra clave (keyword), selecciona la región y el idioma de los resultados de autocompletado.</p>
        
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', padding: '20px', border: '1px solid #0070f3', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
          
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Palabra Clave (ej: recetas)"
            required
            style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
          
          <select value={country} onChange={(e) => setCountry(e.target.value)} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}>
            {sortedCountries.map(([code, name]) => (
              <option key={code} value={code}>{name}</option>
            ))}
          </select>
          
          <select value={language} onChange={(e) => setLanguage(e.target.value)} style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}>
            {Object.entries(questionSets).map(([code, name]) => (
              <option key={code} value={code}>{name}</option>
            ))}
          </select>
          
          <button 
            type="submit" 
            disabled={loading || !keyword} 
            style={{ 
              gridColumn: 'span 3', padding: '10px', backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: '4px', 
              cursor: (loading || !keyword) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            {loading && <div style={spinnerStyle}></div>}
            {loading ? 'Consultando Sugerencias...' : 'Buscar Sugerencias'}
          </button>
        </form>

        {error && <p style={{ color: 'red', marginTop: '20px' }}>⚠️ Error: {error}</p>}

        {results.length > 0 && (
          <div style={{ marginTop: '30px' }}>
            <h2>Resultados ({results.length > 1 ? results.length - 1 : 0} Sugerencias)</h2>
            <button 
              onClick={() => exportToCSV(results, keyword)}
              style={{ padding: '10px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginBottom: '15px' }}
            >
              Descargar CSV
            </button>
            
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
              <thead>
                <tr>
                  <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left', backgroundColor: '#e6f7ff' }}>Palabra Clave</th>
                </tr>
              </thead>
              <tbody>
                {results.slice(1).map((row, index) => (
                  <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f0f0f0' }}>
                    <td style={{ border: '1px solid #ddd', padding: '10px' }}>{row[0]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div style={{ textAlign: 'center', marginTop: '40px', marginBottom: '20px', fontFamily: 'Arial, sans-serif' }}>
        <p style={{ fontSize: '0.85em', color: '#555' }}>
          <a href="https://profile-builder-discover.streamlit.app/" target="_blank" rel="noopener noreferrer" style={{ color: '#0070f3', textDecoration: 'none' }}>
            Google Profile URL Builder
          </a>
        </p>
      </div>
    </>
  );
}
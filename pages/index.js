// Archivo: pages/index.js
import { useState } from 'react';
import Head from 'next/head';

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

const globalStyles = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

// --- DEFINICIONES DE SELECCIÓN ---
const questionSets = {
  es: "Español (España)",
  "es-419": "Español (Latinoamérica)",
  en: "Inglés (EN)",
  pr: "Portugués (PR)",
};

const countriesMap = {
  ar: "Argentina", mx: "México", gt: "Guatemala", hn: "Honduras", sv: "El Salvador", 
  ni: "Nicaragua", cr: "Costa Rica", pa: "Panamá", do: "República Dominicana", pr: "Puerto Rico", 
  co: "Colombia", ve: "Venezuela", ec: "Ecuador", pe: "Perú", bo: "Bolivia", cl: "Chile", 
  uy: "Uruguay", py: "Paraguay", br: "Brasil", es: "España", us: "EE. UU. (Resto)",
};

// --- ORDENAR PAÍSES ALFABÉTICAMENTE ---
const sortedCountries = Object.entries(countriesMap)
  .sort(([, nameA], [, nameB]) => nameA.localeCompare(nameB));

// --- FUNCIONES AUXILIARES ---

// Función para agrupar y contar las sugerencias por categoría
const summarizeResults = (data) => {
    const summary = data.reduce((acc, item) => {
        const category = item.categoria;
        if (!acc[category]) {
            acc[category] = 0;
        }
        acc[category]++;
        return acc;
    }, {});
    
    // Devolver un array ordenado por el total de sugerencias (descendente)
    return Object.entries(summary).sort(([, countA], [, countB]) => countB - countA);
};

// Función para exportar a CSV
const exportToCSV = (data, keyword) => {
    // data es un array de objetos: [{categoria: "...", sugerencia: "..."}, ...]
    
    const headers = ["categoria", "sugerencia"];
    
    const csvRows = data.map(row => 
        // Usamos comillas dobles para la sugerencia para manejar comas internas
        `${row.categoria},"${row.sugerencia.replace(/"/g, '""')}"`
    );
    
    const csvContent = [
        headers.join(','), // Cabecera
        ...csvRows          // Filas
    ].join('\n');
    
    const bom = "\ufeff"; 
    const timestamp = Math.floor(Date.now() / 1000); 
    
    const safeKeyword = keyword.replace(/\s/g, '_').replace(/[^a-zA-Z0-9_]/g, ''); 
    const filename = `sugerencias_expandidas_${safeKeyword}_${timestamp}.csv`;
    
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename); 
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};


// --- COMPONENTE PRINCIPAL ---
export default function Home() {
  const [keyword, setKeyword] = useState('');
  const [country, setCountry] = useState('ar'); 
  const [language, setLanguage] = useState('es-419'); 
  const [results, setResults] = useState([]); // Almacena [{categoria, sugerencia}, ...]
  const [summary, setSummary] = useState([]); // Almacena el resumen por categoría
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResults([]);
    setSummary([]);
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
        throw new Error(data.error || 'Ocurrió un error en el servidor. Revise los logs.');
      }

      const processedResults = data.data || [];
      setResults(processedResults);
      setSummary(summarizeResults(processedResults));
    } catch (err) {
      setError(err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };


  return (
    <>
      <Head>
        <title>Google Suggest Tool | Keyword Harvester SEO</title>
      </Head>

      <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
        <style dangerouslySetInnerHTML={{ __html: globalStyles }} />

        <h1>🔍 Buscador de Sugerencias de Google</h1>
        
        <p style={{ fontSize: '0.85em', color: '#555', marginTop: '-10px', marginBottom: '20px' }}>
          Por: <a href="https://www.linkedin.com/in/dtaubaso/" target="_blank" rel="noopener noreferrer" style={{ color: '#0070f3', textDecoration: 'none' }}>Damian Taubaso</a>
        </p>
        
        <p>Introduce una palabra clave y configura la segmentación de la búsqueda.</p>
        
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

        {/* --- Sección de Resultados --- */}
        {results.length > 0 && (
          <div style={{ marginTop: '30px' }}>
            <h2>Resultados Encontrados ({results.length} Sugerencias Únicas)</h2>
            
            {/* 1. RESUMEN POR CATEGORÍA (MANTENIDO ARRIBA) */}
            <h3 style={{ borderBottom: '1px solid #ccc', paddingBottom: '5px' }}>Resumen por Categoría</h3>
            <table style={{ width: '50%', minWidth: '300px', borderCollapse: 'collapse', border: '1px solid #ccc', marginBottom: '30px' }}>
              <thead>
                  <tr>
                      <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left', backgroundColor: '#e6f7ff' }}>Categoría</th>
                      <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'right', backgroundColor: '#e6f7ff' }}>Total Sugerencias</th>
                  </tr>
              </thead>
              <tbody>
                  {summary.map(([category, count]) => (
                      <tr key={category}>
                          <td style={{ border: '1px solid #ccc', padding: '8px' }}>{category}</td>
                          <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'right' }}>{count}</td>
                      </tr>
                  ))}
                  <tr style={{ fontWeight: 'bold', backgroundColor: '#f2f2f2' }}>
                      <td style={{ border: '1px solid #ccc', padding: '8px' }}>TOTAL ÚNICO</td>
                      <td style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'right' }}>{results.length}</td>
                  </tr>
              </tbody>
            </table>
            
            {/* 2. BOTÓN DE DESCARGA CSV (QUEDA SOLO ESTE) */}
            <button 
              onClick={() => exportToCSV(results, keyword)}
              style={{ padding: '10px 15px', backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginBottom: '20px' }}
            >
              Descargar Resultados Actuales a CSV
            </button>

            {/* 3. TABLA DE DETALLE */}
            <h3 style={{ borderBottom: '1px solid #ccc', paddingBottom: '5px' }}>Detalle de Sugerencias</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
              <thead>
                <tr>
                  <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left', backgroundColor: '#e6f7ff', width: '30%' }}>Categoría</th>
                  <th style={{ border: '1px solid #ddd', padding: '10px', textAlign: 'left', backgroundColor: '#e6f7ff', width: '70%' }}>Sugerencia</th>
                </tr>
              </thead>
              <tbody>
                {results.map((item, index) => (
                  <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f0f0f0' }}>
                    <td style={{ border: '1px solid #ddd', padding: '10px' }}>{item.categoria}</td>
                    <td style={{ border: '1px solid #ddd', padding: '10px' }}>{item.sugerencia}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            
          </div>
        )}
      </div>
    </>
  );
}
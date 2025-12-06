// Archivo: pages/api/export.js (Código modificado)

import { Redis } from '@upstash/redis'; 
import { parse } from 'json2csv'; 
// ... (inicialización de Redis) ...

// 💡 Se recomienda instalar el cliente redis fuera del handler
const redis = Redis.fromEnv();


export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Solo se acepta el método GET' });
  }

  // 1. OBTENER LA CONTRASEÑA DE LA VARIABLE DE ENTORNO
  const SECRET_PASSWORD = process.env.EXPORT_PASSWORD;

  // 2. OBTENER LA CONTRASEÑA DEL PARÁMETRO DE CONSULTA (QUERY)
  const userPassword = req.query.pass; // Busca el valor de ?pass=...

  // 3. 🛡️ VERIFICACIÓN DE SEGURIDAD
  if (!SECRET_PASSWORD || userPassword !== SECRET_PASSWORD) {
    // Si la contraseña no está definida o no coincide, devuelve un error 401
    return res.status(401).json({ error: 'Acceso no autorizado. Contraseña requerida o incorrecta.' });
  }

  // --------------------------------------------------------
  // Si la verificación pasa, el código de exportación se ejecuta
  // --------------------------------------------------------

  try {
    const keys = await redis.keys('search_log:*');
    
    if (keys.length === 0) {
      return res.status(200).json({ message: "No hay logs para exportar." });
    }

    const rawLogs = await redis.mget(...keys);
    const logs = rawLogs.filter(log => log !== null);
    
    const csv = parse(logs, {
        fields: ['keyword', 'country', 'language', 'date']
    });

    const bom = '\ufeff';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="search_logs_export_${Date.now()}.csv"`);
    
    res.status(200).send(bom + csv);

  } catch (error) {
    console.error("Error durante la exportación:", error);
    res.status(500).json({ error: 'Error interno al procesar la exportación.' });
  }
}
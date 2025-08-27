const cron = require('node-cron');
const adminController = require('../controllers/adminController'); // o donde tengas la función

// Ejecutar todos los días 30 a las 02:00 AM
cron.schedule('0 2 30 * *', async () => {
  const hoy = new Date();
  const mes = hoy.getMonth() + 1;
  const anio = hoy.getFullYear();

  console.log(`[CRON] Generando resumen mensual automático para ${mes}/${anio}`);
  
  // Simular req/res para llamar a la función
  const req = { query: { mes, anio } };
  const res = {
    json: (data) => console.log('[CRON]', data),
    status: (code) => ({ json: (msg) => console.error('[CRON]', code, msg) })
  };

  await adminController.generarResumenMensual(req, res);
});

const cron = require('node-cron');
const evoController = require('../controllers/evoController');
const fs = require('fs');

// Programar la tarea diaria a las 8:00 AM
cron.schedule('2 0 * * *', async () => {
    console.log('Iniciando sincronización automática desde EVO -', new Date());
    try {
        await evoController.sincronizarClientesDesdeEvo(
            { method: 'AUTO' },
            {
                send: (msg) => console.log('Resultado:', msg),
                status: () => ({
                    send: (err) => console.error('Error HTTP:', err),
                }),
            }
        );
    } catch (err) {
        console.error('Error inesperado en la sincronización:', err);
    }
});

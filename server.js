const https = require('https');
const fs = require('fs');
const app = require('./app');
const db = require('./models/db');
require('./models/cron.js'); 
require('./models/cronJobs.js'); 
// Agregar esta línea en app.js (o aquí si quieres)
// para que Express confíe en el proxy (nginx)
app.set('trust proxy', true);

const sslOptions = {
    key: fs.readFileSync('./certs/key.pem'),
    cert: fs.readFileSync('./certs/cert.pem')
};

app.listen(3000, () => {
    console.log('Servidor corriendo en el puerto 3000');
});



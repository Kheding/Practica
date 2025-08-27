const db = require('../models/db');
const path = require('path');

exports.subirDocumento = async (req, res) => {
    try {
        const administrativoId = req.body.administrativo_id;
        const razon = req.body.razon;
        const files = req.files;

        if (!files || files.length === 0) {
            return res.status(400).json({ error: 'No se subió ningún archivo' });
        }

        const pool = await db.connect();
        const detallesSubidos = [];

        for (const file of files) {
            const ruta = `/uploads/${file.filename}`;
            await pool.request()
                .input('administrativo_id', db.sql.Int, administrativoId)
                .input('nombre', db.sql.VarChar(255), file.originalname)
                .input('ruta', db.sql.VarChar(1000), ruta)
                .input('tipo', db.sql.VarChar(100), file.mimetype)
                .input('razon', db.sql.VarChar(500), razon)
                .query(`
                    INSERT INTO documentos (administrativo_id, nombre, ruta, tipo, razon)
                    VALUES (@administrativo_id, @nombre, @ruta, @tipo, @razon)
                `);

            detallesSubidos.push({
                nombre: file.originalname,
                ruta,
                tipo: file.mimetype
            });
        }

        res.status(201).json({
            message: 'Documentos subidos correctamente',
            archivos: detallesSubidos
        });

    } catch (err) {
        console.error('Error al subir documentos:', err);
        res.status(500).json({ error: err.message });
    }
};

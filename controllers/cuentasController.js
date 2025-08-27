const express = require('express');
const router = express.Router();
const path = require('path');
const db = require('../models/db');
const sql = require('mssql');
const { json } = require('stream/consumers');
const jwt = require('jsonwebtoken');


exports.getPerfil = async (req, res) => {
    const filePath = path.join(__dirname, '../views/Front/dist/html/demo10/account/home/user-profile.html');
    res.sendFile(filePath);
}


exports.PerfilData = async (req, res) => {
    console.log('PerfilData llamado');

    // Intentamos obtener el token de las cookies
    const token = req.cookies.token;
    if (!token) {
        console.log('No se encontró el token');
        return res.status(401).json({ error: 'No autorizado' });
    }

    try {
        // Decodificamos el token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Token decodificado con éxito:', decoded);

        // Verificamos si el id está presente en el decoded
        if (!decoded.id) {
            console.log('No se encontró el id en el token decodificado');
            return res.status(401).json({ error: 'Token inválido' });
        }

        req.user = decoded;
        console.log('ID del usuario:', req.user.id);

        // Realizamos la consulta SQL
        const pool = await db.connect();
        console.log('Conectando a la base de datos...');

        const result = await pool.request()
            .input('id', sql.Int, req.user.id)
            .query('SELECT * FROM Administrativos WHERE id = @id');
        
        // Verificamos si la consulta devolvió datos
        if (result.recordset.length === 0) {
            console.log('No se encontraron datos para el id:', req.user.id);
            return res.status(404).json({ error: 'Administrativo no encontrado' });
        }

        console.log('Datos del administrativo obtenidos:', result.recordset[0]);

        // Enviar los datos al frontend
        res.json({
            id: result.recordset[0].id,
            nombre_completo: result.recordset[0].nombre_completo,
            email_personal: result.recordset[0].email_personal,
            sede: result.recordset[0].sede,
            rut: result.recordset[0].rut,
            fono_contacto: result.recordset[0].fono_contacto,
            estado_vd: result.recordset[0].estado_vd,
            contacto_emergencia: result.recordset[0].contacto_emergencia,
            relacion: result.recordset[0].relacion,
            fono_emergencia: result.recordset[0].fono_emergencia,
            enfermedades: result.recordset[0].enfermedades,
            alergias: result.recordset[0].Alergias,
        });

    } catch (error) {
        console.error('Error al obtener los datos del perfil:', error);
        res.status(500).json({ error: 'Error al obtener los datos del perfil' });
    }
};




exports.apiEditarDatosAdministrativo = async (req, res) => {
    const id = req.user.id;
    const {
        nombre_completo,
        sede,
        rut,
        fono_contacto,
        estado_vd,
        contacto_emergencia,
        relacion,
        fono_emergencia,
        enfermedades,
        alergias,
        //urlImagen // campo para actualizar imagen
    } = req.body;

    try {
        const pool = await db.connect();

        // Actualizar datos personales en la tabla Administrativos
        await pool.request()
            .input('id', sql.Int, id)
            .input('nombre_completo', sql.VarChar, nombre_completo)
            .input('sede', sql.VarChar, sede)
            .input('rut', sql.VarChar, rut)
            .input('fono_contacto', sql.VarChar, fono_contacto)
            .input('estado_vd', sql.Char, estado_vd)
            .input('contacto_emergencia', sql.VarChar, contacto_emergencia)
            .input('relacion', sql.VarChar, relacion)
            .input('fono_emergencia', sql.VarChar, fono_emergencia)
            .input('enfermedades', sql.VarChar, enfermedades)
            .input('alergias', sql.VarChar, alergias)
            .query(`
                UPDATE Administrativos SET
                    nombre_completo = @nombre_completo,
                    sede = @sede,
                    rut = @rut,
                    fono_contacto = @fono_contacto,
                    estado_vd = @estado_vd,
                    contacto_emergencia = @contacto_emergencia,
                    relacion = @relacion,
                    fono_emergencia = @fono_emergencia,
                    enfermedades = @enfermedades,
                    alergias = @alergias
                WHERE id = @id
            `);

        // Actualizar o insertar la imagen en la tabla ImagenAdministrativo
        //const imgResult = await pool.request()
            //.input('administrativo_id', sql.Int, id)
            //.query('SELECT * FROM ImagenAdministrativo WHERE administrativo_id = @administrativo_id');

        //if (imgResult.recordset.length > 0) {
            // Si ya existe imagen, actualiza
            //await pool.request()
                //.input('administrativo_id', sql.Int, id)
                //.input('urlImagen', sql.VarChar, urlImagen)
                //.query('UPDATE ImagenAdministrativo SET urlImagen = @urlImagen WHERE administrativo_id = @administrativo_id');
        //} else {
            // Si no existe imagen, inserta
            //await pool.request()
                //.input('administrativo_id', sql.Int, id)
                //.input('urlImagen', sql.VarChar, urlImagen)
                //.query('INSERT INTO ImagenAdministrativo (administrativo_id, urlImagen) VALUES (@administrativo_id, @urlImagen)');
        //}

        res.json({ success: true, message: 'Datos actualizados correctamente' });

    } catch (error) {
        console.error('Error al actualizar datos del administrativo:', error);
        res.status(500).json({ error: 'Error al actualizar los datos del administrativo' });
    }
};




exports.apiGetEmailPersonal = async (req, res) => {
    const id = req.user.id;
    try {
        const pool = await db.connect();
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT email_personal FROM Administrativos WHERE id = @id');
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Administrativo no encontrado' });
        }
        res.json({ email_personal: result.recordset[0].email_personal });
    } catch (error) {
        console.error('Error al obtener email_personal:', error);
        res.status(500).json({ error: 'Error al obtener el email_personal' });
    }
};

exports.apiPostEditarEmailPersonal = async (req, res) => {
    const id = req.user.id;
    const { email_personal } = req.body;

    try {
        const pool = await db.connect();
        await pool.request()
            .input('id', sql.Int, id)
            .input('email_personal', sql.VarChar, email_personal)
            .query('UPDATE Administrativos SET email_personal = @email_personal WHERE id = @id');
        res.json({ success: true, message: 'Email personal actualizado correctamente' });
    } catch (error) {
        console.error('Error al actualizar email personal:', error);
        res.status(500).json({ error: 'Error al actualizar el email personal' });
    }
};


exports.apiGetClave = async (req, res) => {
    const id = req.user.id;
    try {
        const pool = await db.connect();
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT clave FROM Administrativos WHERE id = @id');
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Administrativo no encontrado' });
        }
        res.json({ clave: result.recordset[0].clave });
    } catch (error) {
        console.error('Error al obtener clave:', error);
        res.status(500).json({ error: 'Error al obtener la clave' });
    }
};

exports.apiPostEditarClave = async (req, res) => {
    const id = req.user.id;
    const { clave_actual, clave } = req.body;

    try {
        const pool = await db.connect();

        // Obtener la clave actual de la BD
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT clave FROM Administrativos WHERE id = @id');

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Administrativo no encontrado' });
        }

        const claveBD = result.recordset[0].clave;

        if (claveBD !== clave_actual) {
            return res.status(401).json({ error: 'La contraseña actual es incorrecta' });
        }

        // Actualizar con la nueva clave
        await pool.request()
            .input('id', sql.Int, id)
            .input('clave', sql.VarChar, clave)
            .query('UPDATE Administrativos SET clave = @clave WHERE id = @id');

        res.json({ success: true, message: 'Clave actualizada correctamente' });

    } catch (error) {
        console.error('Error al actualizar clave:', error);
        res.status(500).json({ error: 'Error al actualizar la clave' });
    }
};

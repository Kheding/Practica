require('dotenv').config();
const path = require('path');
const jwt = require('jsonwebtoken');
const db = require('../models/db');
const SECRET = process.env.JWT_SECRET;
const evoController = require('./evoController')

const bcrypt = require('bcrypt');
// Mostrar el formulario de login
exports.formLogin = (req, res) => {
    console.log('Form Login llamado');
    const filePath = path.join(__dirname, '../views/Front/dist/html/demo10/authentication/branded/sign-in/index.html');
    res.sendFile(filePath);
};



exports.login = async (req, res) => {
    const { email_personal, clave } = req.body;

    try {
        const pool = await db.connect();
        const result = await pool.request()
            .input('email_personal', db.sql.VarChar, email_personal)
            .query('SELECT * FROM Administrativos WHERE email_personal = @email_personal');

        const user = result.recordset[0];

        if (!user) {
            return res.status(401).send('Credenciales incorrectas');
        }

        let passwordMatch = false;

        // Intentar comparar como hash
        try {
            passwordMatch = await bcrypt.compare(clave, user.clave);
        } catch (err) {
            // Si da error, puede que la clave no sea un hash válido
            passwordMatch = false;
        }

        // Si no es un hash válido, comprobar si coincide directamente
        if (!passwordMatch && user.clave === clave) {
            // Hashear y actualizar
            const nuevoHash = await bcrypt.hash(clave, 10);
            await pool.request()
                .input('id', db.sql.Int, user.id)
                .input('hash', db.sql.VarChar, nuevoHash)
                .query('UPDATE Administrativos SET clave = @hash WHERE id = @id');
            passwordMatch = true;
            console.log('Contraseña migrada a hash para:', user.email_personal);
        }

        if (!passwordMatch) {
            return res.status(401).send('Credenciales incorrectas');
        }

        const token = jwt.sign({
            id: user.id,
            email_personal: user.email_personal,
            nombre_completo: user.nombre_completo,
            rol_id: user.rol_id,
            sede: user.sede
        }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.cookie('token', token, {
            httpOnly: true,
            secure: true,
            maxAge: parseInt(process.env.COOKIE_MAX_AGE)
        });

        // Sincronización y redirección según rol (igual que antes)
        if ((user.rol_id === 1) || (user.rol_id === 2)) {
            evoController.sincronizarClientesDesdeEvo(
                { method: 'LOGIN_ADMIN' },
                {
                    send: (msg) => console.log('Sincronización al iniciar sesión:', msg),
                    status: () => ({
                        send: (err) => console.error('Error al sincronizar:', err),
                    }),
                }
            ).catch(err => console.error('Error inesperado en sincronización:', err));

            return res.redirect('/admin/panel');
        }

        switch (user.rol_id) {
            case 4: return res.redirect('/rrhh/dashboard');
            case 8: return res.redirect('/staff/dashboard');
            case 6: return res.redirect('/rs/dashboard');
            case 3: return res.redirect('/jo/dashboard');
            case 5: return res.redirect('/coordinador/dashboard');
            case 7: return res.redirect('/vendedor/dashboard');
            default: return res.status(403).send('Rol no reconocido');
        }

    } catch (err) {
        console.error('Error real en login:', err);
        res.status(500).send('Error en el login');
    }
};



// Procesar logout
exports.logout = (req, res) => {
    // Limpiar la cookie del token para cerrar sesión
    res.clearCookie('token', {
        httpOnly: true,
        secure: false, // Igual que en login, ajustar para producción
        sameSite: 'lax'
    });
    res.redirect('/');
};


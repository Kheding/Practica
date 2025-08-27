const path = require('path');
const db = require('../models/db');
const sql = require('mssql');
const { json } = require('stream/consumers');
const express = require('express');
const xlsx = require('xlsx');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const { Document, Packer, Paragraph, TextRun } = require('docx');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const bcrypt = require('bcrypt');

// Mostrar el panel de administración
exports.mostrarPanel = (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'Front', 'dist', 'html', 'demo10', 'index.html'));
};
// Datos para el panel de administracion
exports.panel = async (req, res) => {
    const token = req.cookies.token;
    console.log('Token recibido:', token);

    if (!token) {
        return res.status(401).json({ error: 'No autorizado, token faltante' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Token decodificado:', decoded);

        const pool = await db.connect();

        const totalClientes = await pool.request()
            .query('SELECT COUNT(*) AS total FROM Clientes');

        const totalAdministrativos = await pool.request()
            .query('SELECT COUNT(*) AS total FROM Administrativos');

        const totalHoy = await pool.request()
            .query('SELECT COUNT(*) AS total FROM Clientes WHERE FechaRegistro = CAST(GETDATE() AS DATE)');

        res.json({
            totalClientes: totalClientes.recordset[0].total,
            totalAdministrativos: totalAdministrativos.recordset[0].total,
            totalIngresadosHoy: totalHoy.recordset[0].total
        });
    } catch (err) {
        console.error('Error al verificar token o cargar datos:', err.message);
        res.status(403).json({ error: 'Token inválido o expirado' });
    }
};



exports.generarResumenMensual = async (req, res) => {
    const { mes, anio } = req.query;

    if (!mes || !anio) {
        return res.status(400).json({ error: 'Debe indicar mes y año' });
    }

    const valoresPlanes = {
        'PLAN BRONZE (PREPAGO)': 45000,
        'PLAN SHARK': 39000,
        'PROGRAMA SHARKFAST': 234000,
        'PROGRAMA SHARK ELITE': 399000,
        'PLAN SILVER (PREPAGO)': 55000,
        'PLAN GOLD': 65000,
        'PLAN SHARK MULTISEDE': 42900,
        'PLAN SHARKPLATINUM': 48000
    };

    try {
        const pool = await db.connect();
        const sedes = ['Nogales', 'Colón', 'El Bosque', 'La Cisterna', 'Buin'];
        const inicio = `${anio}-${mes}-01`;
        const fin = `${anio}-${mes}-31`;

        for (const sede of sedes) {
            // 1. Ingresos por ventas manuales
            const ventasResult = await pool.request()
                .input('mes', db.sql.Int, mes)
                .input('anio', db.sql.Int, anio)
                .input('sede', db.sql.VarChar, sede)
                .query(`
                    SELECT ISNULL(SUM(Monto), 0) AS total
                    FROM Ventas
                    WHERE sede = @sede AND MONTH(FechaVenta) = @mes AND YEAR(FechaVenta) = @anio
                `);
            const ingresosVentas = ventasResult.recordset[0].total;

            // 2. Ingresos por clientes nuevos según plan
            const clientesResult = await pool.request()
                .input('sede', db.sql.VarChar, sede)
                .input('inicio', db.sql.Date, inicio)
                .input('fin', db.sql.Date, fin)
                .query(`
                    SELECT PlanC
                    FROM Clientes
                    WHERE Sede = @sede AND FechaRegistro BETWEEN @inicio AND @fin
                `);

            let ingresosPlanes = 0;
            clientesResult.recordset.forEach(c => {
                const plan = c.PlanC?.trim();
                ingresosPlanes += valoresPlanes[plan] || 0;
            });

            // 3. Socios activos con plan vigente
            const activosResult = await pool.request()
                .input('sede', db.sql.VarChar, sede)
                .input('inicio', db.sql.Date, inicio)
                .query(`
                    SELECT COUNT(*) AS total
                    FROM Clientes
                    WHERE Sede = @sede AND VencimientoPlan >= @inicio
                `);
            const sociosActivos = activosResult.recordset[0].total;

            // 4. Socios cumplidores (con al menos una asistencia)
            const cumplidoresResult = await pool.request()
                .input('sede', db.sql.VarChar, sede)
                .input('inicio', db.sql.Date, inicio)
                .input('fin', db.sql.Date, fin)
                .query(`
                    SELECT COUNT(DISTINCT a.IdCliente) AS total
                    FROM Asistencias a
                    JOIN Clientes c ON a.IdCliente = c.IdCliente
                    WHERE c.Sede = @sede AND a.Fecha BETWEEN @inicio AND @fin
                `);
            const sociosCumplidores = cumplidoresResult.recordset[0].total;

            const ingresosTotales = ingresosPlanes + ingresosVentas;

            // 5. Insertar o actualizar resumen mensual
            await pool.request()
                .input('sede', db.sql.VarChar, sede)
                .input('mes', db.sql.Int, mes)
                .input('anio', db.sql.Int, anio)
                .input('ingresos', db.sql.Int, ingresosTotales)
                .input('activos', db.sql.Int, sociosActivos)
                .input('cumplidores', db.sql.Int, sociosCumplidores)
                .query(`
                    IF NOT EXISTS (
                        SELECT 1 FROM ResumenMensual WHERE sede = @sede AND mes = @mes AND anio = @anio
                    )
                    BEGIN
                        INSERT INTO ResumenMensual (sede, mes, anio, ingresos, socios_activos, socios_cumplidores)
                        VALUES (@sede, @mes, @anio, @ingresos, @activos, @cumplidores)
                    END
                    ELSE
                    BEGIN
                        UPDATE ResumenMensual
                        SET ingresos = @ingresos,
                            socios_activos = @activos,
                            socios_cumplidores = @cumplidores
                        WHERE sede = @sede AND mes = @mes AND anio = @anio
                    END
                `);
        }

        res.json({ message: '✅ Resumen mensual generado correctamente para todas las sedes.' });

    } catch (err) {
        console.error('❌ Error generando resumen:', err);
        res.status(500).json({ error: 'Error generando resumen mensual' });
    }
};


exports.obtenerResumenMensual = async (req, res) => {
    const { mes, anio } = req.query;
    try {
        const pool = await db.connect();
        const result = await pool.request()
            .input('mes', sql.Int, mes)
            .input('anio', sql.Int, anio)
            .query(`
        SELECT * FROM ResumenMensual
        WHERE mes = @mes AND anio = @anio
        ORDER BY sede
      `);
        res.json({ resumen: result.recordset });
    } catch (err) {
        console.error('Error obteniendo resumen:', err);
        res.status(500).json({ error: 'Error al obtener resumen mensual' });
    }
};


exports.compararResumenMensual = async (req, res) => {
    const { mes, anio } = req.query;

    if (!mes || !anio) return res.status(400).json({ error: 'Falta mes o año' });

    const mesAnterior = mes == 1 ? 12 : mes - 1;
    const anioAnterior = mes == 1 ? anio - 1 : anio;

    try {
        const pool = await db.connect();

        const actual = await pool.request()
            .input('mes', sql.Int, mes)
            .input('anio', sql.Int, anio)
            .query(`SELECT sede, ingresos FROM ResumenMensual WHERE mes = @mes AND anio = @anio`);

        const anterior = await pool.request()
            .input('mes', sql.Int, mesAnterior)
            .input('anio', sql.Int, anioAnterior)
            .query(`SELECT sede, ingresos FROM ResumenMensual WHERE mes = @mes AND anio = @anio`);

        const mapAnterior = {};
        anterior.recordset.forEach(r => mapAnterior[r.sede] = r.ingresos);

        const comparativa = actual.recordset.map(r => {
            const ingresosAntes = mapAnterior[r.sede] || 0;
            return {
                sede: r.sede,
                ingresos_actual: r.ingresos,
                ingresos_anterior: ingresosAntes,
                diferencia: r.ingresos - ingresosAntes
            };
        });

        const totalActual = actual.recordset.reduce((acc, r) => acc + r.ingresos, 0);
        const totalAnterior = anterior.recordset.reduce((acc, r) => acc + r.ingresos, 0);
        const totalDiferencia = totalActual - totalAnterior;

        res.json({ comparativa, totalDiferencia });
    } catch (err) {
        console.error('Error al comparar resumen:', err);
        res.status(500).json({ error: 'Error al comparar resumen mensual' });
    }
};



// Mostrar el formulario de creación de Administrativo
exports.formCrear = async (req, res) => {
    console.log('Form Crear llamado');
    const filePath = path.join(__dirname, '../views/Front/dist/html/demo10/network/GestionCuentas/Crear-Usuario.html');
    res.sendFile(filePath);
};
// Crear nuevo administrativo


exports.crearUsuario = async (req, res) => {
    const {
        rol_id,
        sede,
        estado_vd,
        nombre_completo,
        rut,
        email_personal,
        clave,
        direccion,
        fono_contacto,
        contacto_emergencia,
        relacion,
        fono_emergencia,
        enfermedades,
        Alergias
    } = req.body;

    try {
        // Hashear la clave con bcrypt
        const saltRounds = 10;
        const hashedClave = await bcrypt.hash(clave, saltRounds);

        const pool = await db.connect();
        await pool.request()
            .input('rol_id', sql.Int, rol_id)
            .input('sede', sql.VarChar, sede)
            .input('estado_vd', sql.Char, estado_vd)
            .input('nombre_completo', sql.VarChar, nombre_completo)
            .input('rut', sql.VarChar, rut)
            .input('email_personal', sql.VarChar, email_personal)
            .input('clave', sql.VarChar, hashedClave) // Clave hasheada aquí
            .input('direccion', sql.Text, direccion)
            .input('fono_contacto', sql.VarChar, fono_contacto)
            .input('contacto_emergencia', sql.VarChar, contacto_emergencia)
            .input('relacion', sql.VarChar, relacion)
            .input('fono_emergencia', sql.VarChar, fono_emergencia)
            .input('enfermedades', sql.VarChar, enfermedades)
            .input('Alergias', sql.VarChar, Alergias)
            .query(`
                INSERT INTO Administrativos (
                    rol_id, sede, estado_vd, nombre_completo, rut, email_personal, clave,
                    direccion, fono_contacto, contacto_emergencia, relacion, fono_emergencia,
                    enfermedades, Alergias
                ) VALUES (
                    @rol_id, @sede, @estado_vd, @nombre_completo, @rut, @email_personal, @clave,
                    @direccion, @fono_contacto, @contacto_emergencia, @relacion, @fono_emergencia,
                    @enfermedades, @Alergias
                )
            `);

        return res.json({ message: 'Usuario creado exitosamente' });
    } catch (error) {
        console.error('Error al crear administrativo:', error);
        res.status(500).send('Error al crear el administrativo');
    }
};



exports.formCrearCliente = async (req, res) => {
    console.log('Form Crear Cliente llamado');
    const filePath = path.join(__dirname, '../views/Front/dist/html/demo10/network/GestionCuentas/Crear-Cliente.html');
    res.sendFile(filePath);
};



exports.crearCliente = async (req, res) => {
    const {
        Nombre, SegundoNombre, Apellido, SegundoApellido, PlanC,
        FechaRegistro, Conversion, VencimientoPlan, Sede,
        PlanFirmado, RUT, FechaNacimiento, DiasActivos,
        CorreoElectronico, Genero, Edad, TelefonoMovil,
        UltimaPresencia, ValorPlan
    } = req.body;

    try {
        const pool = await db.connect();
        const transaction = new sql.Transaction(pool);

        await transaction.begin();
        // Insertar el nuevo cliente
        await transaction.request()
            .input('Nombre', sql.VarChar, Nombre)
            .input('SegundoNombre', sql.VarChar, SegundoNombre)
            .input('Apellido', sql.VarChar, Apellido)
            .input('SegundoApellido', sql.VarChar, SegundoApellido)
            .input('PlanC', sql.VarChar, PlanC)
            .input('FechaRegistro', sql.Date, FechaRegistro)
            .input('Conversion', sql.Date, Conversion)
            .input('VencimientoPlan', sql.Date, VencimientoPlan)
            .input('Sede', sql.VarChar, Sede)
            .input('PlanFirmado', sql.VarChar, PlanFirmado)
            .input('RUT', sql.VarChar, RUT)
            .input('FechaNacimiento', sql.Date, FechaNacimiento)
            .input('DiasActivos', sql.Int, DiasActivos)
            .input('CorreoElectronico', sql.VarChar, CorreoElectronico)
            .input('Genero', sql.VarChar, Genero)
            .input('Edad', sql.Int, Edad)
            .input('TelefonoMovil', sql.VarChar, TelefonoMovil)
            .input('UltimaPresencia', sql.Date, UltimaPresencia)
            .input('ValorPlan', sql.Decimal(10, 2), ValorPlan)
            .query(`
                INSERT INTO Clientes (
                    Nombre, SegundoNombre, Apellido, SegundoApellido, PlanC, FechaRegistro, Conversion,
                    VencimientoPlan, Sede, PlanFirmado, RUT, FechaNacimiento, DiasActivos,
                    CorreoElectronico, Genero, Edad, TelefonoMovil, UltimaPresencia, ValorPlan
                )
                VALUES (
                    @Nombre, @SegundoNombre, @Apellido, @SegundoApellido, @PlanC, @FechaRegistro, @Conversion,
                    @VencimientoPlan, @Sede, @PlanFirmado, @RUT, @FechaNacimiento, @DiasActivos,
                    @CorreoElectronico, @Genero, @Edad, @TelefonoMovil, @UltimaPresencia, @ValorPlan
                )
            `);

        await transaction.commit();
        res.redirect('/admin/panel');

    } catch (error) {
        console.error('Error al crear cliente:', error);
        res.status(500).send('Error al crear el cliente');
    }
};

//(sede, estado_vd, nombre_completo, rut, email_personal, clave, direccion, fono_contacto, contacto_emergencia, relacion, fono_emergencia)

exports.crearEmpleadoPost = async (req, res) => {
    const {
        sede,
        estado_vd,
        nombre_completo,
        rut,
        email_personal,
        clave,
        direccion,
        fono_contacto,
        contacto_emergencia,
        relacion,
        fono_emergencia,
    } = req.body;
    try {
        const pool = await db.connect();
        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        await transaction.request()
            .input('sede', sql.VarChar, sede)
            .input('estado_vd', sql.Char, estado_vd)
            .input('nombre_completo', sql.VarChar, nombre_completo)
            .input('rut', sql.VarChar, rut)
            .input('email_personal', sql.VarChar, email_personal)
            .input('clave', sql.VarChar, clave)
            .input('direccion', sql.Text, direccion)
            .input('fono_contacto', sql.VarChar, fono_contacto)
            .input('contacto_emergencia', sql.VarChar, contacto_emergencia)
            .input('relacion', sql.VarChar, relacion)
            .input('fono_emergencia', sql.VarChar, fono_emergencia)
            .query(`
                INSERT INTO empleados (
                    sede, estado_vd, nombre_completo, rut, email_personal, clave,
                    direccion, fono_contacto, contacto_emergencia, relacion, fono_emergencia
                )
                VALUES (
                    @sede, @estado_vd, @nombre_completo, @rut, @email_personal, @clave,
                    @direccion, @fono_contacto, @contacto_emergencia, @relacion, @fono_emergencia
                )
            `);
        await transaction.commit();
        res.redirect('/admin/panel');
    } catch (error) {
        console.error('Error al crear empleado:', error);
        res.status(500).send('Error al crear el empleado');
    }
};

// Mostrar el formulario de edición de cliente
exports.formEditarCliente = (req, res) => {
    console.log('Formulario de edición llamado');
    const filePath = path.join(__dirname, '../views/Front/dist/html/demo10/network/GestionCuentas/Editar-Cliente.html');
    res.sendFile(filePath);
};

// Mostrar el formulario de edición de usuario 
exports.formEditarP = async (req, res) => {
    console.log('Formulario de edición llamado');
    const filePath = path.join(__dirname, '../views/Front/dist/html/demo10/network/GestionCuentas/Editar-Administrativo.html');
    res.sendFile(filePath);
};



exports.apiEditarPersonal = async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await db.connect();
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT * FROM Administrativos WHERE id = @id');
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Administrativo no encontrado' });
        }
        res.json(result.recordset[0]);
    } catch (err) {
        console.error('Error al obtener el administrativo:', err);
        res.status(500).json({ error: 'Error al obtener el administrativo' });
    }
};

exports.apiEditarPersonalPost = async (req, res) => {
    const { id } = req.params;
    const {
        sede,
        estado_vd,
        nombre_completo,
        rut,
        email_personal,
        direccion,
        fono_contacto,
        contacto_emergencia,
        relacion,
        fono_emergencia,
        clave // nueva clave opcional
    } = req.body;

    try {
        const pool = await db.connect();
        const request = pool.request()
            .input('id', sql.Int, id)
            .input('sede', sql.VarChar, sede)
            .input('estado_vd', sql.Char, estado_vd)
            .input('nombre_completo', sql.VarChar, nombre_completo)
            .input('rut', sql.VarChar, rut)
            .input('email_personal', sql.VarChar, email_personal)
            .input('direccion', sql.Text, direccion)
            .input('fono_contacto', sql.VarChar, fono_contacto)
            .input('contacto_emergencia', sql.VarChar, contacto_emergencia)
            .input('relacion', sql.VarChar, relacion)
            .input('fono_emergencia', sql.VarChar, fono_emergencia);

        let query = `
            UPDATE Administrativos SET
                sede = @sede,
                estado_vd = @estado_vd,
                nombre_completo = @nombre_completo,
                rut = @rut,
                email_personal = @email_personal,
                direccion = @direccion,
                fono_contacto = @fono_contacto,
                contacto_emergencia = @contacto_emergencia,
                relacion = @relacion,
                fono_emergencia = @fono_emergencia`;

        if (clave && clave.trim() !== '') {
            const hashedClave = await bcrypt.hash(clave, 10);
            request.input('clave', sql.VarChar, hashedClave);
            query += `, clave = @clave`;
        }

        query += ` WHERE id = @id`;

        await request.query(query);

        res.json({ success: true, message: 'Administrativo actualizado correctamente' });
    } catch (error) {
        console.error('Error al editar administrativo:', error);
        res.status(500).json({ error: 'Error al editar el administrativo' });
    }
};


exports.listarPersonalAPI = async (req, res) => {
    try {
        const pool = await db.connect();
        const result = await pool.request().query('SELECT * FROM Administrativos'); // Consulta a la tabla 'usuario'
        const usuarios = result.recordset;
        res.json(usuarios); // Enviar los datos como JSON
    } catch (err) {
        console.error('Error al obtener los usuarios:', err);
        res.status(500).send('Error al obtener los usuarios');
    }
};

// Controlador para la ruta /listarPersonal
exports.listarPersonal = async (req, res) => {
    const filePath = path.join(__dirname, '../views/Front/dist/html/demo10/network/GestionCuentas/ListarAdministrativo.html');
    res.sendFile(filePath); // Enviar el archivo HTML
};


// API para eliminar usuario
// Esta función se llamará desde el script del HTML

exports.apiEliminarPersonal = async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await db.connect();
        await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM Administrativos WHERE id = @id');
        console.log('ID recibido para eliminar:', id);
        res.json({ success: true });
    } catch (error) {
        console.error('Error al eliminar usuario:', error);
        res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
};


// Controlador para la ruta /listarClientes
exports.listarClientes = async (req, res) => {
    const filePath = path.join(__dirname, '../views/Front/dist/html/demo10/network/GestionCuentas/Clientes.html');
    res.sendFile(filePath); // Enviar el archivo HTML
};

exports.apiListarClientes = async (req, res) => {
    try {
        const pool = await db.connect();
        const result = await pool.request()
            .query('SELECT * FROM Clientes ORDER BY Nombre');
        const clientes = result.recordset;
        res.json(clientes); // Enviar los datos como JSON
    } catch (err) {
        console.error('Error al obtener los clientes:', err);
        res.status(500).send('Error al obtener los clientes');
    }
}

exports.editarCliente = async (req, res) => {
    const { IdCliente } = req.params;
    console.log('ID recibido para editar:', IdCliente);
    try {
        const pool = await db.connect();
        const result = await pool.request()
            .input('IdCliente', sql.Int, IdCliente)
            .query('SELECT * FROM Clientes WHERE IdCliente = @IdCliente');
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }
        res.json(result.recordset[0]);

    } catch (err) {
        console.error('Error al obtener el cliente:', err);
        res.status(500).send('Error al obtener el cliente');
    }
}

exports.apiEditarCliente = async (req, res) => {
    const { idCliente } = req.params;
    console.log('ID recibido para obtener datos:', idCliente);
    try {
        const pool = await db.connect();
        const result = await pool.request()
            .input('IdCliente', sql.Int, idCliente)
            .query('SELECT * FROM Clientes WHERE IdCliente = @idCliente');
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        res.json(result.recordset[0]);

    } catch (err) {
        console.error('Error al obtener el cliente:', err);
        res.status(500).send('Error al obtener el cliente');
    }
}

//Consejos RUN BITCH RUN

exports.apiEditarClientePost = async (req, res) => {
    const { IdCliente, Nombre, SegundoNombre, Apellido, SegundoApellido, PlanC, FechaRegistro, Conversion, VencimientoPlan, Sede, PlanFirmado
        , RUT, FechaNacimiento, DiasActivos, CorreoElectronico, Genero, Edad, TelefonoMovil, ValorPlan } = req.body;
    console.log(`Editando usuario ID: ${IdCliente}`);
    try {
        const pool = await db.connect();
        await pool.request()
            .input('IdCliente', sql.Int, IdCliente)
            .input('Nombre', sql.VarChar, Nombre)
            .input('SegundoNombre', sql.VarChar, SegundoNombre)
            .input('Apellido', sql.VarChar, Apellido)
            .input('SegundoApellido', sql.VarChar, SegundoApellido)
            .input('PlanC', sql.VarChar, PlanC)
            .input('FechaRegistro', sql.DATETIME, FechaRegistro)
            .input('Conversion', sql.DATETIME, Conversion)
            .input('VencimientoPlan', sql.DATETIME, VencimientoPlan)
            .input('Sede', sql.VarChar, Sede)
            .input('PlanFirmado', sql.VarChar, PlanFirmado)
            .input('RUT', sql.VarChar, RUT)
            .input('FechaNacimiento', sql.DATETIME, FechaNacimiento)
            .input('DiasActivos', sql.Int, DiasActivos)
            .input('CorreoElectronico', sql.VarChar, CorreoElectronico)
            .input('Genero', sql.VarChar, Genero)
            .input('Edad', sql.Int, Edad)
            .input('TelefonoMovil', sql.VarChar, TelefonoMovil)
            .input('ValorPlan', sql.Int, ValorPlan)
            .query(`
                UPDATE Clientes
                SET Nombre = @Nombre,
                    SegundoNombre = @SegundoNombre,
                    Apellido = @Apellido,
                    SegundoApellido = @SegundoApellido,
                    PlanC = @PlanC,
                    FechaRegistro = @FechaRegistro,
                    Conversion = @Conversion,
                    VencimientoPlan = @VencimientoPlan,
                    Sede = @Sede,
                    PlanFirmado = @PlanFirmado,
                    RUT = @RUT,
                    FechaNacimiento = @FechaNacimiento,
                    DiasActivos = @DiasActivos,
                    CorreoElectronico = @CorreoElectronico,
                    Genero = @Genero,
                    Edad = @Edad,
                    TelefonoMovil = @TelefonoMovil,
                    ValorPlan = @ValorPlan
                WHERE IdCliente = @IdCliente
            `);

        res.json({ success: true, message: 'Cliente actualizado correctamente' });
    } catch (err) {
        console.error('Error al editar el cliente:', err);
        res.status(500).json({ error: 'Error al editar el cliente' });
    }
}

exports.apiEliminarCliente = async (req, res) => {
    const { IdCliente } = req.params;
    console.log('ID recibido para eliminar:', IdCliente);
    try {
        const pool = await db.connect();
        await pool.request()
            .input('IdCliente', sql.Int, IdCliente)
            .query('DELETE FROM Clientes WHERE IdCliente = @IdCliente');
        res.json({ success: true, message: 'Cliente eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar cliente:', error);
        res.status(500).json({ error: 'Error al eliminar el cliente' });
    }
}


/**
 * Contar total de clientes
 */
exports.contarClientes = async (req, res) => {
    try {
        const pool = await db.connect();
        const result = await pool.request().query('SELECT COUNT(*) AS total FROM Clientes');
        res.json({ total: result.recordset[0].total });
    } catch (err) {
        console.error('Error al contar clientes:', err);
        res.status(500).json({ error: 'Error al contar clientes' });
    }
};



/**
 * Contar total de administrativos
 */
exports.contarAdministrativos = async (req, res) => {
    try {
        const pool = await db.connect();
        const result = await pool.request().query('SELECT COUNT(*) AS total FROM Administrativos');
        res.json({ total: result.recordset[0].total });
    } catch (err) {
        console.error('Error al contar administrativos:', err);
        res.status(500).json({ error: 'Error al contar administrativos' });
    }
};


exports.contarCapacitaciones = async (req, res) => {
    try {
        const pool = await db.connect();
        const result = await pool.request().query('SELECT COUNT(*) AS total FROM Capacitaciones');
        res.json({ total: result.recordset[0].total });
    } catch (err) {
        console.error('Error al contar archivos:', err);
        res.status(500).json({ error: 'Error al contar archivos' });
    }
};

exports.vistaCrearSolicitud = (req, res) => {
    const filePath = path.join(__dirname, '../views/Front/dist/html/demo10/network/Acciones/Crear-Solicitud.html');
    res.sendFile(filePath); // Enviar el archivo HTML
};

exports.crearSolicitud = async (req, res) => {
    try {
        const { tipo, fechaInicio, fechaFin, motivo } = req.body;
        const idAdministrativo = req.user.id; // obtenido desde el token

        const pool = await db.connect();
        await pool.request()
            .input('idAdministrativo', db.sql.Int, idAdministrativo)
            .input('tipo', db.sql.VarChar, tipo)
            .input('fechaInicio', db.sql.DateTime, fechaInicio)
            .input('fechaFin', db.sql.DateTime, fechaFin)
            .input('motivo', db.sql.VarChar, motivo)
            .input('estado', db.sql.Int, 1) // estado 1 = en espera
            .query(`
                INSERT INTO solicitudes (idAdministrativo, tipo, fechaInicio, fechaFin, motivo, estado)
                VALUES (@idAdministrativo, @tipo, @fechaInicio, @fechaFin, @motivo, @estado)
            `);

        res.status(201).json({ message: 'Solicitud creada correctamente.' });

    } catch (err) {
        console.error('Error al crear solicitud:', err);
        res.status(500).json({ error: 'Error al crear la solicitud.' });
    }
};

exports.vistaObtenerSolicitudes = (req, res) => {
    const filePath = path.join(__dirname, '../views/Front/dist/html/demo10/network/Acciones/Obtener-Solicitudes.html');
    res.sendFile(filePath); // Enviar el archivo HTML
};

exports.obtenerSolicitudes = async (req, res) => {
    try {
        const pool = await db.connect();
        const resultado = await pool.request().query(`
      SELECT 
        s.id,
        s.tipo,
        s.fechaInicio,
        s.fechaFin,
        s.motivo,
        s.estado,
        a.nombre_completo,
        a.rut,
        a.sede
      FROM solicitudes s
      INNER JOIN Administrativos a ON s.idAdministrativo = a.id
      ORDER BY s.fechaInicio DESC
    `);

        res.json({ solicitudes: resultado.recordset });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

exports.vistaDocumentos = (req, res) => {
    const filePath = path.join(__dirname, '../views/Front/dist/html/demo10/network/Acciones/Documentos.html');
    res.sendFile(filePath); // Enviar el archivo HTML
};
exports.obtenerDocumentos = async (req, res) => {
    try {
        const pool = await db.connect();
        const result = await pool.request().query(`
            SELECT d.id, d.nombre AS nombre_documento, d.tipo, d.razon, d.ruta AS url, d.visto, d.descargado,
                   a.nombre_completo AS Nombre, a.rut AS RUT
            FROM documentos d
            JOIN Administrativos a ON d.administrativo_id = a.id
            WHERE d.subido_por_rrhh = 0
        `);

        res.json({ documentos: result.recordset });
    } catch (err) {
        console.error('Error al obtener documentos:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.vistaIncidencias = (req, res) => {
    const filePath = path.join(__dirname, '../views/Front/dist/html/demo10/network/Acciones/Incidencias.html');
    res.sendFile(filePath); // Enviar el archivo HTML
};
exports.incidencias = async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'No autorizado' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const sede = decoded.sede;

        const pool = await db.connect();
        const result = await pool.request()
            .input('sede', sql.VarChar, sede)
            .query(`
                SELECT * FROM Incidencias
            `);

        res.json(result.recordset);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener las incidencias.' });
    }
};

exports.vistaCrearPlanMejora = (req, res) => {
    const filePath = path.join(__dirname, '../views/Front/dist/html/demo10/network/Acciones/Crear-Plan-Mejora.html');
    res.sendFile(filePath); // Enviar el archivo HTML
};

exports.apiAdministrativos = async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'No autorizado' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const pool = await db.connect();
        const result = await pool.request()
            .query(`
                SELECT id, nombre_completo, sede FROM Administrativos
            `);
        res.json(result.recordset);
    } catch (error) {
        console.error('Error al obtener administrativos:', error);
        res.status(500).json({ error: 'Error al obtener los administrativos.' });
    }
};
exports.crearPlanMejora = async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'No autorizado' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // Opcional: validar si el usuario tiene permiso para crear planes

        const {
            nombre,
            sede,
            fechaInicio,
            fechaEsperadaFin,
            fechaFinReal,
            idResponsable,
            estado,
        } = req.body;

        // Validaciones básicas
        if (
            !nombre ||
            !sede ||
            !fechaInicio ||
            !fechaEsperadaFin ||
            !idResponsable ||
            !estado
        ) {
            return res.status(400).json({ error: 'Faltan campos obligatorios' });
        }

        // Validar estado permitido
        const estadosValidos = ['verde', 'amarillo', 'rojo', 'pendiente'];

        if (!estadosValidos.includes(estado.toLowerCase())) {
            return res.status(400).json({ error: 'Estado inválido' });
        }

        const pool = await db.connect();

        await pool
            .request()
            .input('nombre', sql.NVarChar(100), nombre)
            .input('sede', sql.VarChar(50), sede)
            .input('fechaInicio', sql.Date, fechaInicio)
            .input('fechaEsperadaFin', sql.Date, fechaEsperadaFin)
            .input('fechaFinReal', sql.Date, fechaFinReal || null)
            .input('idResponsable', sql.Int, idResponsable)
            .input('estado', sql.VarChar(10), estado.toLowerCase())
            .query(
                `INSERT INTO Proyectos
          (nombre, sede, fechaInicio, fechaEsperadaFin, fechaFinReal, idResponsable, estado)
         VALUES
          (@nombre, @sede, @fechaInicio, @fechaEsperadaFin, @fechaFinReal, @idResponsable, @estado)`
            );

        res.status(201).json({ message: 'Plan de mejora creado correctamente.' });
    } catch (error) {
        console.error('Error en crearPlanMejora:', error);
        res.status(500).json({ error: 'Error al crear el plan de mejora.' });
    }
};

exports.vistaPlanesMejora = (req, res) => {
    const filePath = path.join(__dirname, '../views/Front/dist/html/demo10/network/Acciones/Planes-Mejora.html');
    res.sendFile(filePath); // Enviar el archivo HTML
};
exports.planesMejora = async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'No autorizado' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const pool = await db.connect();
        const result = await pool.request()
            .query(`
                Select * FROM Proyectos
            `);

        res.json(result.recordset);
    } catch (error) {
        console.error('Error al obtener proyectos:', error);
        res.status(500).json({ error: 'Error al obtener los planes de mejora.' });
    }
};

exports.vistaSubirDocumento = (req, res) => {
    const filePath = path.join(__dirname, '../views/Front/dist/html/demo10/network/Acciones/Subir-Documento.html');
    res.sendFile(filePath); // Enviar el archivo HTML
};
exports.subirDocumento = async (req, res) => {
    try {
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({ error: 'No autorizado' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const administrativo_id = decoded.id;

        const { razon, tipo } = req.body;
        const archivos = req.files;

        if (!archivos || archivos.length === 0) {
            return res.status(400).json({ error: 'No se subió ningún archivo.' });
        }

        const pool = await db.connect();

        for (const archivo of archivos) {
            const ruta = `/uploads/${archivo.filename}`;

            await pool.request()
                .input('administrativo_id', db.sql.Int, administrativo_id)
                .input('nombre', db.sql.VarChar, archivo.originalname)
                .input('ruta', db.sql.VarChar, `/uploads/${archivo.filename}`)

                .input('tipo', db.sql.VarChar, tipo)
                .input('razon', db.sql.VarChar, razon)
                .input('subido_por_rrhh', db.sql.Bit, 0) // 0 = subido por administrativo
                .query(`
                    INSERT INTO documentos (administrativo_id, nombre, ruta, tipo, razon, subido_por_rrhh)
                    VALUES (@administrativo_id, @nombre, @ruta, @tipo, @razon, @subido_por_rrhh)
                `);
        }

        res.status(201).json({ message: 'Documentos subidos correctamente.' });

    } catch (err) {
        console.error('Error al subir documentos:', err);
        res.status(500).json({ error: 'Error al subir los documentos.' });
    }
};

exports.importarClientesExcel = async (req, res) => {
    const archivo = req.file;
    if (!archivo) {
        return res.status(400).send('no se envio ningun archivo');
    }
    try {
        const work = xlsx.readFile(archivo.path);
        const sheet = Workbook.Sheets[work.SheetName[0]];
        const datos = xlsx.utils.sheet_to_json(sheet);
        const pool = await db.connect();

        let insertados = 0;
        let duplicado = 0;
        for (const cliente of datos) {
            const { Nombre, SegundoNombre, Apellido, SegundoApellido, PlanC, FechaRegistro, Conversion, VencimientoPlan, Sede, PlanFirmado,
                RUT, FechaNacimiento, DiasActivos, CorreoElectronico, Genero, Edad, TelefonoMovil,
                UltimaPresencia, ValorPlan } = cliente;

            const existente = await pool.request()
                .input('RUT', sql.VarChar, RUT)
                .query('SELECT * FROM Clientes WHERE RUT = @RUT');
            if (existente.recordset.length === 0) {
                await pool.request()
                    .input('Nombre', sql.VarChar, Nombre)
                    .input('SegundoNombre', sql.VarChar, SegundoNombre)
                    .input('Apellido', sql.VarChar, Apellido)
                    .input('SegundoApellido', sql.VarChar, SegundoApellido)
                    .input('PlanC', sql.VarChar, PlanC)
                    .input('FechaRegistro', sql.Date, FechaRegistro)
                    .input('Conversion', sql.Date, Conversion)
                    .input('VencimientoPlan', sql.Date, VencimientoPlan)
                    .input('Sede', sql.VarChar, Sede)
                    .input('PlanFirmado', sql.VarChar, PlanFirmado)
                    .input('RUT', sql.VarChar, RUT)
                    .input('FechaNacimiento', sql.Date, FechaNacimiento)
                    .input('DiasActivos', sql.Int, DiasActivos)
                    .input('CorreoElectronico', sql.VarChar, CorreoElectronico)
                    .input('Genero', sql.VarChar, Genero)
                    .input('Edad', sql.Int, Edad)
                    .input('TelefonoMovil', sql.VarChar, TelefonoMovil)
                    .input('UltimaPresencia', sql.Date, UltimaPresencia)
                    .input('ValorPlan', sql.Decimal(10, 2), ValorPlan)
                    .query(`
                        INSERT INTO Clientes (
                            Nombre, SegundoNombre, Apellido, SegundoApellido, PlanC,
                            FechaRegistro, Conversion, VencimientoPlan, Sede,
                            PlanFirmado, RUT, FechaNacimiento,
                            DiasActivos, CorreoElectronico,
                            Genero, Edad,
                            TelefonoMovil,
                            UltimaPresencia,
                            ValorPlan
                        ) VALUES (
                            @Nombre, @SegundoNombre, @Apellido,
                            @SegundoApellido, @PlanC,
                            @FechaRegistro, @Conversion,
                            @VencimientoPlan,
                            @Sede,
                            @PlanFirmado,
                            @RUT,
                            @FechaNacimiento,
                            @DiasActivos,
                            @CorreoElectronico,
                            @Genero,
                            @Edad,
                            @TelefonoMovil,
                            @UltimaPresencia,
                            @ValorPlan
                        )
                    `);
                insertados++;
            } else {
                duplicados++;
            }
        }
        res.send('Clientes nuevos insertados: ${insertados}, Duplicados ignorados: ${duplicados}.');
    } catch (error) {
        console.error('Error al importar clientes desde Excel:', error);
        res.status(500).send('Error al importar clientes desde Excel');
    }
};

exports.exportarClientesExcel = async (req, res) => {
    try {
        const pool = await db.connect();
        // Seleccionamos todas las columnas que definiste en crearCliente
        const result = await pool.request().query(`
      SELECT
        Nombre,
        SegundoNombre,
        Apellido,
        SegundoApellido,
        PlanC,
        FechaRegistro,
        Conversion,
        VencimientoPlan,
        Sede,
        PlanFirmado,
        RUT,
        FechaNacimiento,
        DiasActivos,
        CorreoElectronico,
        Genero,
        Edad,
        TelefonoMovil,
        UltimaPresencia,
        ValorPlan
      FROM Clientes
      ORDER BY Nombre
    `);
        const clientes = result.recordset;

        // Creamos un nuevo Workbook y agregamos una hoja
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Clientes');

        // Definimos las columnas del Excel exactamente igual que en la BD
        worksheet.columns = [
            { header: 'Nombre', key: 'Nombre', width: 30 },
            { header: 'SegundoNombre', key: 'SegundoNombre', width: 30 },
            { header: 'Apellido', key: 'Apellido', width: 30 },
            { header: 'SegundoApellido', key: 'SegundoApellido', width: 30 },
            { header: 'PlanC', key: 'PlanC', width: 20 },
            { header: 'FechaRegistro', key: 'FechaRegistro', width: 15 },
            { header: 'Conversion', key: 'Conversion', width: 15 },
            { header: 'VencimientoPlan', key: 'VencimientoPlan', width: 15 },
            { header: 'Sede', key: 'Sede', width: 20 },
            { header: 'PlanFirmado', key: 'PlanFirmado', width: 20 },
            { header: 'RUT', key: 'RUT', width: 20 },
            { header: 'FechaNacimiento', key: 'FechaNacimiento', width: 15 },
            { header: 'DiasActivos', key: 'DiasActivos', width: 12 },
            { header: 'CorreoElectronico', key: 'CorreoElectronico', width: 30 },
            { header: 'Genero', key: 'Genero', width: 10 },
            { header: 'Edad', key: 'Edad', width: 10 },
            { header: 'TelefonoMovil', key: 'TelefonoMovil', width: 20 },
            { header: 'UltimaPresencia', key: 'UltimaPresencia', width: 15 },
            { header: 'ValorPlan', key: 'ValorPlan', width: 15 }
        ];

        // Añadimos todas las filas extraídas de la base de datos
        worksheet.addRows(clientes);

        // Configuramos encabezados HTTP para descarga
        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            'attachment; filename="clientes_exportados.xlsx"'
        );

        // Enviamos el workbook al cliente
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Error al exportar Excel:', error);
        res.status(500).send('Error al exportar clientes');
    }
};

exports.obtenerClientesPorPeriodoYSede = async (req, res) => {
    try {
        console.log("Funcion llamada");
        const pool = await db.connect();
        const result = await pool.request().query(`
      SELECT 
        sede,
        COUNT(*) AS total,
        SUM(CASE WHEN CAST(FechaRegistro AS DATE) = CAST(GETDATE() AS DATE) THEN 1 ELSE 0 END) AS hoy,
        SUM(CASE WHEN FechaRegistro >= DATEADD(DAY, -7, GETDATE()) THEN 1 ELSE 0 END) AS semana,
        SUM(CASE WHEN MONTH(FechaRegistro) = MONTH(GETDATE()) AND YEAR(FechaRegistro) = YEAR(GETDATE()) THEN 1 ELSE 0 END) AS mes,
        SUM(CASE WHEN YEAR(FechaRegistro) = YEAR(GETDATE()) THEN 1 ELSE 0 END) AS año FROM clientes
        GROUP BY sede;
    `);

        res.json(result.recordset);
    } catch (err) {
        console.error('Error al obtener datos de clientes:', err);
        res.status(500).send('Error en el servidor');
    }
};


exports.vistaReportes = (req, res) => {
    const filePath = path.join(__dirname, '../views/Front/dist/html/demo10/network/Reportes/reportesAdministrador.html');
    res.sendFile(filePath); // Enviar el archivo HTML
};




exports.reportesAdministrador = async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'No autorizado' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const pool = await db.connect();

        const totalResult = await pool.request().query(`
            SELECT COUNT(*) AS totalAdministrativos FROM Administrativos
        `);

        const nuevosClientesResult = await pool.request().query(`
            SELECT COUNT(*) AS totalNuevosClientes
            FROM Clientes
            WHERE MONTH(FechaRegistro) = MONTH(GETDATE()) AND YEAR(FechaRegistro) = YEAR(GETDATE())
        `);

        const solicitudesResult = await pool.request().query(`
            SELECT COUNT(*) AS totalSolicitudesPendientes
            FROM solicitudes s
            INNER JOIN Administrativos a ON s.idAdministrativo = a.id
            WHERE s.estado = 0
        `);

        const documentosResult = await pool.request().query(`
            SELECT COUNT(*) AS totalDocumentos
            FROM documentos d
            INNER JOIN Administrativos a ON d.administrativo_id = a.id
            WHERE MONTH(d.fecha_subida) = MONTH(GETDATE()) AND YEAR(d.fecha_subida) = YEAR(GETDATE())
        `);

        const incidenciasResult = await pool.request().query(`
            SELECT COUNT(*) AS totalIncidenciasPendientes
            FROM Incidencias
            WHERE estado = 'Pendiente'
        `);

        const capacitacionesResult = await pool.request().query(`
            SELECT COUNT(*) AS totalCapacitacionesPendientes
            FROM CapacitacionesAsistentes ca
            INNER JOIN Administrativos a ON ca.responsable_id = a.id
            WHERE ca.asistio = 0
        `);

        // Lista de administrativos con cargo
        let listaAdministrativos = [];
        const formato = (req.query.formato || 'json').toLowerCase();

        if (formato !== 'json') {
            const listaResult = await pool.request().query(`
                SELECT a.nombre_completo, a.rut, r.nombre AS cargo
                FROM Administrativos a
                INNER JOIN Rol r ON a.rol_id = r.id
                ORDER BY a.nombre_completo
            `);
            listaAdministrativos = listaResult.recordset;
        }

        const reporteData = {
            totalAdministrativos: totalResult.recordset[0].totalAdministrativos,
            nuevosClientes: nuevosClientesResult.recordset[0].totalNuevosClientes,
            solicitudesPendientes: solicitudesResult.recordset[0].totalSolicitudesPendientes,
            documentosAgregados: documentosResult.recordset[0].totalDocumentos,
            incidenciasPendientes: incidenciasResult.recordset[0].totalIncidenciasPendientes,
            capacitacionesPendientes: capacitacionesResult.recordset[0].totalCapacitacionesPendientes,
            listaAdministrativos
        };

        // === PDF ===
        if (formato === 'pdf') {
            const doc = new PDFDocument();
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename="reporte_administrativos.pdf"');
            doc.pipe(res);

            doc.fontSize(18).text(`Reporte Administrativos`, { underline: true });
            doc.moveDown();

            for (const [key, value] of Object.entries(reporteData)) {
                if (key !== 'listaAdministrativos') {
                    doc.fontSize(14).text(`${key.replace(/([A-Z])/g, ' $1').toUpperCase()}: ${value}`);
                }
            }

            doc.moveDown().fontSize(16).text('Listado de Administrativos', { underline: true });
            doc.moveDown();

            if (reporteData.listaAdministrativos.length > 0) {
                reporteData.listaAdministrativos.forEach((adm, idx) => {
                    doc.fontSize(12).text(`${idx + 1}. ${adm.nombre_completo} | RUT: ${adm.rut} | Cargo: ${adm.cargo}`);
                });
            } else {
                doc.fontSize(12).text('No hay administrativos registrados.');
            }

            doc.end();
            return;
        }

        // === EXCEL ===
        if (formato === 'excel') {
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Reporte Administrativos');

            sheet.addRow(['Indicador', 'Valor']);
            for (const [key, value] of Object.entries(reporteData)) {
                if (key !== 'listaAdministrativos') {
                    sheet.addRow([
                        key.replace(/([A-Z])/g, ' $1').toUpperCase(),
                        value
                    ]);
                }
            }

            sheet.addRow([]);
            sheet.addRow(['Listado de Administrativos']);
            sheet.addRow(['Nombre', 'RUT', 'Cargo']);

            reporteData.listaAdministrativos.forEach(a => {
                sheet.addRow([a.nombre_completo, a.rut, a.cargo]);
            });

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename="reporte_administrativos.xlsx"');
            await workbook.xlsx.write(res);
            res.end();
            return;
        }

        // === WORD ===
        if (formato === 'word' || formato === 'docx') {
            const doc = new Document({
                sections: [{
                    children: [
                        new Paragraph({
                            text: `Reporte Administrativos`,
                            heading: "Heading1"
                        }),
                        ...Object.entries(reporteData).filter(([k]) => k !== 'listaAdministrativos').map(([key, value]) =>
                            new Paragraph({
                                children: [
                                    new TextRun({ text: `${key.replace(/([A-Z])/g, ' $1').toUpperCase()}: `, bold: true }),
                                    new TextRun(String(value))
                                ]
                            })
                        ),
                        new Paragraph({ text: ' ', spacing: { after: 200 } }),
                        new Paragraph({ text: 'Listado de Administrativos', heading: "Heading2" }),
                        ...(reporteData.listaAdministrativos.length > 0
                            ? reporteData.listaAdministrativos.map((a, i) =>
                                new Paragraph(`${i + 1}. ${a.nombre_completo} | RUT: ${a.rut} | Cargo: ${a.cargo}`)
                            )
                            : [new Paragraph('No hay administrativos registrados.')])
                    ]
                }]
            });

            const buffer = await Packer.toBuffer(doc);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            res.setHeader('Content-Disposition', 'attachment; filename="reporte_administrativos.docx"');
            res.send(buffer);
            return;
        }

        // === JSON ===
        delete reporteData.listaAdministrativos;
        res.json(reporteData);

    } catch (error) {
        console.error('Error al generar el reporte de administrativos:', error);
        res.status(500).json({ error: 'Error al generar el reporte de administrativos.' });
    }
};



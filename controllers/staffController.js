const express = require('express');
const router = express.Router();
const path = require('path');
const db = require('../models/db');
const sql = require('mssql');
const jwt = require('jsonwebtoken');

// --- VISTAS HTML ---
exports.dashboard = async (req, res) => {
    res.sendFile(path.join(__dirname, '../views/Front/dist/html/demo10/staff/dashboardStaff.html'));
};

exports.formcrearCliente = async (req, res) => {
    res.sendFile(path.join(__dirname, '../views/Front/dist/html/demo10/staff/CrearClienteStaff.html'));
};

exports.formEditarCliente = async (req, res) => {
    res.sendFile(path.join(__dirname, '../views/Front/dist/html/demo10/staff/EditarClienteStaff.html'));
};

exports.listarClientes = async (req, res) => {
    res.sendFile(path.join(__dirname, '../views/Front/dist/html/demo10/staff/ClientesStaff.html'));
};

exports.formCrearAgenda = async (req, res) => {
    res.sendFile(path.join(__dirname, '../views/Front/dist/html/demo10/staff/AgendarClaseStaff.html'));
};

exports.verAgenda = async (req, res) => {
    res.sendFile(path.join(__dirname, '../views/Front/dist/html/demo10/staff/AgendaStaff.html'));
};

exports.formCrearSolicitud = async (req, res) => {
    res.sendFile(path.join(__dirname, '../views/Front/dist/html/demo10/staff/CrearSolicitudStaff.html'));
};

exports.verSolicitudes = async (req, res) => {
    res.sendFile(path.join(__dirname, '../views/Front/dist/html/demo10/staff/SolicitudesStaff.html'));
};

// --- API / LÓGICA ---

// Dashboard: resumen
exports.dashboardData = async (req, res) => {
    try {
        const token = req.cookies.token;
        if (!token) return res.status(401).json({ error: 'No autorizado' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const sede = decoded.sede;
        const nombre_completo = decoded.nombre_completo;

        const pool = await db.connect();

        // Total clientes de la sede
        const totalClientesResult = await pool.request()
            .input('sede', sql.VarChar, sede)
            .query('SELECT COUNT(*) AS totalClientes FROM Clientes WHERE Sede = @sede');
        const totalClientes = totalClientesResult.recordset[0].totalClientes;

        // Fechas para hoy y mañana (sin horas)
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const manana = new Date(hoy);
        manana.setDate(hoy.getDate() + 1);

        // Clientes agendados hoy en la sede
        const clientesHoyResult = await pool.request()
            .input('sede', sql.VarChar, sede)
            .input('fechaInicio', sql.DateTime, hoy)
            .input('fechaFin', sql.DateTime, manana)
            .query(`
                SELECT COUNT(DISTINCT ac.IdCliente) AS clientesHoy
                FROM Agenda a
                INNER JOIN AgendaClientes ac ON a.IdAgenda = ac.IdAgenda
                INNER JOIN Clientes c ON ac.IdCliente = c.IdCliente
                WHERE c.Sede = @sede
                  AND a.Fecha >= @fechaInicio AND a.Fecha < @fechaFin
            `);
        const clientesHoy = clientesHoyResult.recordset[0].clientesHoy;

        res.json({ nombre_completo, sede, totalClientes, clientesHoy });
    } catch (error) {
        console.error('Error en dashboardData:', error);
        res.status(500).json({ error: 'Error al obtener datos del dashboard.' });
    }
};


// Crear cliente
exports.crearClientePost = async (req, res) => {
    try {
        const pool = await db.connect();
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        await transaction.request()
            .input('Nombre', sql.VarChar, req.body.Nombre)
            .input('SegundoNombre', sql.VarChar, req.body.SegundoNombre)
            .input('Apellido', sql.VarChar, req.body.Apellido)
            .input('SegundoApellido', sql.VarChar, req.body.SegundoApellido)
            .input('PlanC', sql.VarChar, req.body.PlanC)
            .input('FechaRegistro', sql.Date, req.body.FechaRegistro)
            .input('Conversion', sql.Date, req.body.Conversion)
            .input('VencimientoPlan', sql.Date, req.body.VencimientoPlan)
            .input('Sede', sql.VarChar, req.body.Sede)
            .input('PlanFirmado', sql.VarChar, req.body.PlanFirmado)
            .input('RUT', sql.VarChar, req.body.RUT)
            .input('FechaNacimiento', sql.Date, req.body.FechaNacimiento)
            .input('DiasActivos', sql.Int, req.body.DiasActivos)
            .input('CorreoElectronico', sql.VarChar, req.body.CorreoElectronico)
            .input('Genero', sql.VarChar, req.body.Genero)
            .input('Edad', sql.Int, req.body.Edad)
            .input('TelefonoMovil', sql.VarChar, req.body.TelefonoMovil)
            .input('UltimaPresencia', sql.Date, req.body.UltimaPresencia)
            .input('ValorPlan', sql.Decimal(10, 2), req.body.ValorPlan)
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
        res.redirect('/staff/dashboard');
    } catch (error) {
        console.error('Error al crear cliente:', error);
        res.status(500).send('Error al crear el cliente');
    }
};

// Obtener cliente por ID
exports.apiEditarCliente = async (req, res) => {
    try {
        const pool = await db.connect();
        const result = await pool.request()
            .input('idCliente', sql.Int, req.params.idCliente)
            .query('SELECT * FROM Clientes WHERE IdCliente = @idCliente');

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'Cliente no encontrado' });
        }

        res.json(result.recordset[0]);
    } catch (error) {
        console.error('Error al obtener el cliente:', error);
        res.status(500).send('Error al obtener el cliente');
    }
};

// Editar cliente
exports.apiEditarClientePost = async (req, res) => {
    try {
        const pool = await db.connect();
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        await transaction.request()
            .input('IdCliente', sql.Int, req.params.idCliente)
            .input('Nombre', sql.VarChar, req.body.Nombre)
            .input('SegundoNombre', sql.VarChar, req.body.SegundoNombre)
            .input('Apellido', sql.VarChar, req.body.Apellido)
            .input('SegundoApellido', sql.VarChar, req.body.SegundoApellido)
            .input('PlanC', sql.VarChar, req.body.PlanC)
            .input('FechaRegistro', sql.Date, req.body.FechaRegistro)
            .input('Conversion', sql.Date, req.body.Conversion)
            .input('VencimientoPlan', sql.Date, req.body.VencimientoPlan)
            .input('Sede', sql.VarChar, req.body.Sede)
            .input('PlanFirmado', sql.VarChar, req.body.PlanFirmado)
            .input('RUT', sql.VarChar, req.body.RUT)
            .input('FechaNacimiento', sql.Date, req.body.FechaNacimiento)
            .input('DiasActivos', sql.Int, req.body.DiasActivos)
            .input('CorreoElectronico', sql.VarChar, req.body.CorreoElectronico)
            .input('Genero', sql.VarChar, req.body.Genero)
            .input('Edad', sql.Int, req.body.Edad)
            .input('TelefonoMovil', sql.VarChar, req.body.TelefonoMovil)
            .input('UltimaPresencia', sql.Date, req.body.UltimaPresencia)
            .input('ValorPlan', sql.Decimal(10, 2), req.body.ValorPlan)
            .query(`
                UPDATE Clientes SET
                    Nombre = @Nombre,
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
                    UltimaPresencia = @UltimaPresencia,
                    ValorPlan = @ValorPlan
                WHERE IdCliente = @IdCliente
            `);

        await transaction.commit();
        res.redirect('/staff/dashboard');
    } catch (error) {
        console.error('Error al editar cliente:', error);
        res.status(500).send('Error al editar el cliente');
    }
};

// Listar clientes por sede
exports.apiListarClientes = async (req, res) => {
    try {
        const token = req.cookies.token;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const sede = decoded.sede;

        const pool = await db.connect();
        const result = await pool.request()
            .input('sede', sql.VarChar, sede)
            .query('SELECT * FROM Clientes WHERE Sede = @sede');

        res.json(result.recordset);
    } catch (error) {
        console.error('Error al obtener clientes por sede:', error);
        res.status(500).json({ error: 'Error al obtener clientes' });
    }
};

// Eliminar cliente
exports.apiEliminarCliente = async (req, res) => {
    try {
        const pool = await db.connect();
        await pool.request()
            .input('IdCliente', sql.Int, req.params.idCliente)
            .query('DELETE FROM Clientes WHERE IdCliente = @IdCliente');

        res.json({ message: 'Cliente eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar el cliente:', error);
        res.status(500).send('Error al eliminar el cliente');
    }
};

// Listar agenda por usuario
exports.apiListarAgenda = async (req, res) => {
    try {
        const token = req.cookies.token;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const sede = decoded.sede;

        const pool = await db.connect();
        const result = await pool.request()
            .input('sede', sql.VarChar, sede)
            .query(`
        SELECT IdAgenda, Fecha, Descripcion
        FROM Agenda
        WHERE IdAgenda IN (
          SELECT DISTINCT ac.IdAgenda
          FROM AgendaClientes ac
          INNER JOIN Clientes c ON ac.IdCliente = c.IdCliente
          WHERE c.Sede = @sede
        )
        ORDER BY Fecha ASC
      `);

        res.json(result.recordset);
    } catch (error) {
        console.error('Error al obtener agenda:', error);
        res.status(500).json({ error: 'Error al obtener la agenda' });
    }
};

exports.apiListarClientesClase = async (req, res) => {
    try {
        const { idAgenda } = req.params;

        const pool = await db.connect();
        const result = await pool.request()
            .input('idAgenda', sql.Int, idAgenda)
            .query(`
        SELECT ac.IdAgendaCliente, c.IdCliente, c.Nombre, c.Apellido, ac.Asistio
        FROM AgendaClientes ac
        INNER JOIN Clientes c ON ac.IdCliente = c.IdCliente
        WHERE ac.IdAgenda = @idAgenda
      `);

        res.json(result.recordset);
    } catch (error) {
        console.error('Error al obtener clientes de la clase:', error);
        res.status(500).json({ error: 'Error al obtener clientes de la clase' });
    }
};

exports.apiMarcarAsistencia = async (req, res) => {
    try {
        const { idAgendaCliente, asistio } = req.body; // asistio = true/false o 1/0

        const pool = await db.connect();
        await pool.request()
            .input('idAgendaCliente', sql.Int, idAgendaCliente)
            .input('asistio', sql.Bit, asistio)
            .query(`
        UPDATE AgendaClientes
        SET Asistio = @asistio
        WHERE IdAgendaCliente = @idAgendaCliente
      `);

        res.json({ message: 'Asistencia actualizada' });
    } catch (error) {
        console.error('Error al actualizar asistencia:', error);
        res.status(500).json({ error: 'Error al actualizar asistencia' });
    }
};



// Agendar clase
exports.agendarFecha = async (req, res) => {
    try {
        const pool = await db.connect();
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        const request = transaction.request();

        // Insertar nueva clase en Agenda
        const resultAgenda = await request
            .input('Fecha', sql.DateTime, req.body.fecha)
            .input('Descripcion', sql.NVarChar(255), req.body.descripcion || '')
            .query(`
                INSERT INTO Agenda (Fecha, Descripcion)
                OUTPUT INSERTED.IdAgenda
                VALUES (@Fecha, @Descripcion)
            `);

        const idAgenda = resultAgenda.recordset[0].IdAgenda;

        // Insertar clientes relacionados en AgendaClientes
        const clientes = req.body.clientes; // Debe ser un array con los IdCliente seleccionados
        if (Array.isArray(clientes) && clientes.length > 0) {
            for (const idCliente of clientes) {
                // Crear un nuevo request para cada inserción y evitar duplicidad de parámetros
                const requestInsert = transaction.request();
                await requestInsert
                    .input('IdAgenda', sql.Int, idAgenda)
                    .input('IdCliente', sql.Int, idCliente)
                    .query(`
                        INSERT INTO AgendaClientes (IdAgenda, IdCliente)
                        VALUES (@IdAgenda, @IdCliente)
                    `);
            }
        }

        await transaction.commit();
        res.redirect('/staff/verAgenda');
    } catch (error) {
        console.error('Error al agendar fecha:', error);
        res.status(500).send('Error al agendar la fecha');
    }
};



// Crear solicitud
// Crear solicitud
exports.crearSolicitud = async (req, res) => {
    try {
        const token = req.cookies.token;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const idAdministrativo = decoded.id || decoded.id_usuario;

        const pool = await db.connect();
        await pool.request()
            .input('idAdministrativo', sql.Int, idAdministrativo)
            .input('tipo', sql.VarChar(50), req.body.tipo)
            .input('fechaInicio', sql.DateTime, req.body.fechaInicio)
            .input('fechaFin', sql.DateTime, req.body.fechaFin)
            .input('motivo', sql.VarChar(500), req.body.motivo)
            .input('estado', sql.Int, 1) // 1 = En espera
            .query(`
                INSERT INTO solicitudes (idAdministrativo, tipo, fechaInicio, fechaFin, motivo, estado)
                VALUES (@idAdministrativo, @tipo, @fechaInicio, @fechaFin, @motivo, @estado)
            `);

        res.redirect('/staff/verSolicitudes');
    } catch (error) {
        console.error('Error creando solicitud:', error);
        res.status(500).json({ error: error.message });
    }
};

// Listar solicitudes del administrativo logueado
exports.apiListarSolicitudes = async (req, res) => {
    try {
        const token = req.cookies.token;
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const idAdministrativo = decoded.id || decoded.id_usuario;

        const pool = await db.connect();
        const result = await pool.request()
            .input('idAdministrativo', sql.Int, idAdministrativo)
            .query(`
                SELECT * FROM solicitudes
                WHERE idAdministrativo = @idAdministrativo
                ORDER BY fechaInicio DESC
            `);

        res.json(result.recordset);
    } catch (error) {
        console.error('Error al obtener solicitudes:', error);
        res.status(500).json({ error: 'Error al obtener solicitudes' });
    }
};

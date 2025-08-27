const express = require('express');
const router = express.Router();
const path = require('path');
const db = require('../models/db');
const sql = require('mssql');
const { json } = require('stream/consumers');
const jwt = require('jsonwebtoken');


exports.dashboard = (req, res) => {
    const filePath = path.join(__dirname, '../views/Front/dist/html/demo10/responsable-sede/dashboardRS.html');
    res.sendFile(filePath);
};

exports.dashboardData = async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
        return res.status(401).json({ error: 'No autorizado' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const sede = decoded.sede;

        // Consulta para contar empleados y clientes en la sede
        const pool = await db.connect();
        const result = await pool.request()
            .input('sede', sql.VarChar, sede)
            .query(`
                SELECT 
                    (SELECT COUNT(*) FROM Empleados WHERE Sede = @sede) AS totalEmpleados,
                    (SELECT COUNT(*) FROM Clientes WHERE Sede = @sede) AS totalClientes
            `);

        const { totalEmpleados, totalClientes } = result.recordset[0];

        res.json({
            nombre_completo: decoded.nombre_completo,
            sede: sede,
            totalEmpleados,
            totalClientes
        });
    } catch (err) {
        console.error('Error en dashboardData:', err);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
};

exports.formCrearCliente = (req, res) => {
    console.log('Form Crear Cliente llamado');
    const filePath = path.join(__dirname, '../views/Front/dist/html/demo10/responsable-sede/crearClienteRS.html');
    res.sendFile(filePath);
}

exports.formCrearClientePost = async (req, res) => {
    console.log('Form Crear Cliente Post llamado');
    const {
        Nombre, SegundoNombre, Apellido, SegundoApellido, PlanC,
        FechaRegistro, Conversion, VencimientoPlan, Sede,
        PlanFirmado, RUT, FechaNacimiento, DiasActivos,
        CorreoElectronico, Genero, Edad, TelefonoMovil,
        UltimaPresencia, ValorPlan
    } = req.body;
    console.log('Datos recibidos:', req.body);
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
                        IdCliente, Nombre, SegundoNombre, Apellido, SegundoApellido, PlanC, FechaRegistro, Conversion,
                        VencimientoPlan, Sede, PlanFirmado, RUT, FechaNacimiento, DiasActivos,
                        CorreoElectronico, Genero, Edad, TelefonoMovil, UltimaPresencia, ValorPlan
                    )
                    VALUES (
                        @IdCliente, @Nombre, @SegundoNombre, @Apellido, @SegundoApellido, @PlanC, @FechaRegistro, @Conversion,
                        @VencimientoPlan, @Sede, @PlanFirmado, @RUT, @FechaNacimiento, @DiasActivos,
                        @CorreoElectronico, @Genero, @Edad, @TelefonoMovil, @UltimaPresencia, @ValorPlan
                    )
                `);

        await transaction.commit();
        res.redirect('/rs/dashboard');

    } catch (error) {
        console.error('Error al crear cliente:', error);
        res.status(500).send('Error al crear el cliente');
    }
}

exports.formEditarCliente = async (req, res) => {
    console.log('Form Editar Cliente llamado');
    const filePath = path.join(__dirname, '../views/Front/dist/html/demo10/responsable-sede/editarClienteRS.html');
    res.sendFile(filePath);
}

exports.apiEditarCliente = async (req, res) => {
    console.log('API Editar Cliente llamado');
    const { idCliente } = req.params;
    console.log('ID Cliente:', idCliente);
    try {
        const pool = await db.connect();
        const result = await pool.request()
            .input('IdCliente', sql.Int, idCliente)
            .query('SELECT * FROM Clientes WHERE IdCliente = @IdCliente');
        console.log('Resultado de SQL:', result.recordset);
        res.json(result.recordset[0]);
    } catch (error) {
        console.error('Error al obtener cliente:', error);
        res.status(500).send('Error al obtener el cliente');
    }
}
exports.apiEditarClientePost = async (req, res) => {
    console.log('API Editar Cliente Post llamado');
    const { idCliente } = req.params;
    const {
        Nombre, SegundoNombre, Apellido, SegundoApellido, PlanC,
        FechaRegistro, Conversion, VencimientoPlan, Sede,
        PlanFirmado, RUT, FechaNacimiento, DiasActivos,
        CorreoElectronico, Genero, Edad, TelefonoMovil,
        UltimaPresencia, ValorPlan
    } = req.body;
    console.log('Datos recibidos:', req.body);
    try {
        const pool = await db.connect();
        const transaction = new sql.Transaction(pool);

        await transaction.begin();

        // Actualizar el cliente
        await transaction.request()
            .input('IdCliente', sql.Int, idCliente)
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
            .input('UltimaPresencia', sql.Date, UltimaPresencia || null)
            .input('ValorPlan', sql.Decimal(10, 2), ValorPlan)
            .query(`
                    UPDATE Clientes
                    SET 
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
        res.redirect('/rs/dashboard');
    }
    catch (error) {
        console.error('Error al editar cliente:', error);
        res.status(500).send('Error al editar el cliente');
    }
}

exports.listarClientes = (req, res) => {
    const filePath = path.join(__dirname, '../views/Front/dist/html/demo10/responsable-sede/listarClientesRS.html');
    res.sendFile(filePath);
};


exports.apiListarClientes = async (req, res) => {
    console.log('API Listar Clientes - Responsable de Sede');

    try {
        const sede = req.user?.sede;
        console.log('Sede del responsable:', sede);
        if (!sede) return res.status(400).json({ error: 'Sede no encontrada en token' });

        const pool = await db.connect();
        const result = await pool.request()
            .input('sede', db.sql.VarChar, sede)
            .query('SELECT * FROM Clientes WHERE Sede = @sede');

        const clientes = result.recordset;
        console.log('Clientes encontrados:', clientes.length);
        res.json(clientes);

    } catch (error) {
        console.error('Error al obtener clientes por sede:', error);
        res.status(500).json({ error: 'Error al obtener clientes' });
    }
};

exports.apiEliminarCliente = async (req, res) => {
    console.log('API Eliminar Cliente llamado');
    const { idCliente } = req.params;
    console.log('ID Cliente:', idCliente);
    try {
        const pool = await db.connect();
        const transaction = new sql.Transaction(pool);

        await transaction.begin();

        // Eliminar el cliente
        await transaction.request()
            .input('IdCliente', sql.Int, idCliente)
            .query('DELETE FROM Clientes WHERE IdCliente = @IdCliente');

        await transaction.commit();
        res.status(200).json({ message: 'Cliente eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar cliente:', error);
        res.status(500).json({ error: 'Error al eliminar el cliente' });
    }
}

exports.formCrearStaff = async (req, res) => {
    console.log('Form Crear Empleado');
    const filePath = path.join(__dirname, '../views/Front/dist/html/demo10/responsable-sede/crearEmpleadosRS.html');
    res.sendFile(filePath);
}

exports.crearStaffPost = async (req, res) => {
    console.log('Post Llamado');
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
        res.redirect('/rs/dashboard');
    } catch (error) {
        console.error('Error al crear empleado:', error);
        res.status(500).send('Error al crear el empleado');
    }

}

exports.listarStaff = async (req, res) => {
    console.log('Listar Llamado');
    const filePath = path.join(__dirname, '../views/Front/dist/html/demo10/responsable-sede/listarEmpleadosRS.html');
    res.sendFile(filePath);
}

exports.listarStaffAPI = async (req, res) => {
    console.log('Listar API LLamado');
    try {
        const sede = req.user?.sede;
        console.log('Sede:', sede);
        const pool = await db.connect();
        const result = await pool.request()
            .input('sede', db.sql.VarChar, sede)
            .query('SELECT * FROM empleados WHERE sede = @sede'); // Consulta a la tabla 'usuario'
        const empleados = result.recordset;
        res.json(empleados); // Enviar los datos como JSON
    } catch (err) {
        console.error('Error al obtener los empleados:', err);
        res.status(500).send('Error al obtener los empleados');
    }
}


exports.formHAsistencia = async (req, res) => {
    console.log('Historial Asistencia llamado');
    const filePath = path.join(__dirname, '../views/Front/dist/html/demo10/responsable-sede/historialAsistenciasRS.html');
    res.sendFile(filePath);
}

exports.historialAsistencia = async (req, res) => {
    console.log('Historial Asistencia API llamado');
    const { fechaInicio, fechaFin } = req.body;
    console.log('Datos recibidos:', req.body);
    try {
        const pool = await db.connect();
        const result = await pool.request()
            .input('fechaInicio', sql.Date, fechaInicio)
            .input('fechaFin', sql.Date, fechaFin)
            .query(`
                SELECT A.IdAsistencia, A.IdCliente, 
                     CONCAT(C.Nombre, ' ', C.Apellido) AS Nombre, 
                        A.Fecha, A.HoraEntrada, A.HoraSalida    
                FROM Asistencias A
                JOIN Clientes C ON A.IdCliente = C.IdCliente
                WHERE A.Fecha BETWEEN @fechaInicio AND @fechaFin;
            `);
        console.log('Resultado de SQL:', result.recordset);
        res.json(result.recordset);
    } catch (error) {
        console.error('Error al obtener historial de asistencia:', error);
        res.status(500).send('Error al obtener el historial de asistencia');
    }
}


exports.reportesVentas = async (req, res) => {
    console.log('Reportes llamado');
    const filePath = path.join(__dirname, '../views/Front/dist/html/demo10/responsable-sede/reportesVentasRS.html');
    res.sendFile(filePath);
}



exports.apiReportesVentas = async (req, res) => {
    console.log('API Reportes Ventas llamado');
    const { fechaInicio, fechaFin } = req.body;
    console.log('Datos recibidos:', req.body);
    try {
        const pool = await db.connect();
        const result = await pool.request()
            .input('fechaInicio', sql.Date, fechaInicio)
            .input('fechaFin', sql.Date, fechaFin)
            .query(`
                SELECT * FROM Clientes
                WHERE FechaRegistro BETWEEN @fechaInicio AND @fechaFin
            `);
        console.log('Resultado de SQL:', result.recordset);
        res.json(result.recordset);
    } catch (error) {
        console.error('Error al obtener reportes de ventas:', error);
        res.status(500).send('Error al obtener los reportes de ventas');
    }
}


exports.formCrearSolicitud = async (req, res) => {
    console.log('Form Crear Solicitud llamado');
    const filePath = path.join(__dirname, '../views/Front/dist/html/demo10/responsable-sede/crearSolicitudRS.html');
    res.sendFile(filePath);
}

exports.crearSolicitud = async (req, res) => {
    try {
        const { tipo, fechaInicio, fechaFin, motivo } = req.body;
        const { id } = req.params; // idEmpleado

        const pool = await db.connect();
        await pool.request()
            .input('id', db.sql.Int, id)
            .input('tipo', db.sql.VarChar, tipo)
            .input('fechaInicio', db.sql.Date, fechaInicio)
            .input('fechaFin', db.sql.Date, fechaFin)
            .input('motivo', db.sql.VarChar, motivo)
            .input('estado', db.sql.Int, 1)
            .query(`INSERT INTO solicitudes (idAdministrativo, tipo, fechaInicio, fechaFin, motivo, estado)
                    VALUES (@id, @tipo, @fechaInicio, @fechaFin, @motivo, @estado)`);

        res.status(201).json({ message: 'Solicitud creada en estado En Espera' });
    } catch (err) {
        console.error('Error al crear la solicitud:', err);
        res.status(500).json({ error: err.message });
    }
};


const ExcelJS = require('exceljs');

// ========= INFORME DIARIO =========
exports.generarInformeDiarioExcel = async (req, res) => {
    const sede = req.user.sede;
    const fecha = new Date().toISOString().split('T')[0];

    const ventas = await db.query(
        "SELECT canal, monto FROM Ventas WHERE fecha = @fecha AND sede = @sede",
        { fecha, sede }
    );

    const asistencia = await db.query(
        "SELECT nombre, estado FROM Asistencias WHERE fecha = @fecha AND sede = @sede",
        { fecha, sede }
    );

    const incidencias = await db.query(
        "SELECT titulo, descripcion FROM Incidencias WHERE fecha = @fecha AND sede = @sede",
        { fecha, sede }
    );

    const proyectos = await db.query(
        `SELECT nombre, DATEDIFF(DAY, fechaInicio, ISNULL(fechaFinReal, GETDATE())) AS duracion 
     FROM Proyectos WHERE sede = @sede`,
        { sede }
    );

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(`Informe Diario ${fecha}`);

    sheet.addRow([`Informe Diario - ${sede} - ${fecha}`]).font = { bold: true };
    sheet.addRow([]);

    sheet.addRow(['Ventas']);
    ventas.forEach(v => sheet.addRow([v.canal, v.monto]));
    sheet.addRow([]);

    sheet.addRow(['Asistencia']);
    asistencia.forEach(a => sheet.addRow([a.nombre, a.estado]));
    sheet.addRow([]);

    sheet.addRow(['Incidencias']);
    incidencias.forEach(i => sheet.addRow([i.titulo, i.descripcion]));
    sheet.addRow([]);

    sheet.addRow(['Proyectos - Duración (días)']);
    proyectos.forEach(p => sheet.addRow([p.nombre, p.duracion]));

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=informe_diario_${sede}_${fecha}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
};

// ========= INFORME SEMANAL =========
exports.generarInformeSemanalExcel = async (req, res) => {
    const sede = req.user.sede;
    const hoy = new Date();
    const fechaFin = hoy.toISOString().split('T')[0];
    const fechaInicio = new Date(hoy);
    fechaInicio.setDate(hoy.getDate() - 6);
    const fechaInicioStr = fechaInicio.toISOString().split('T')[0];

    const ventas = await db.query(
        `SELECT fecha, canal, monto FROM Ventas 
     WHERE fecha BETWEEN @fechaInicio AND @fechaFin AND sede = @sede 
     ORDER BY fecha`,
        { fechaInicio: fechaInicioStr, fechaFin, sede }
    );

    const asistencia = await db.query(
        `SELECT fecha, nombre, estado FROM Asistencias 
     WHERE fecha BETWEEN @fechaInicio AND @fechaFin AND sede = @sede 
     ORDER BY fecha`,
        { fechaInicio: fechaInicioStr, fechaFin, sede }
    );

    const incidencias = await db.query(
        `SELECT fecha, titulo, descripcion FROM Incidencias 
     WHERE fecha BETWEEN @fechaInicio AND @fechaFin AND sede = @sede 
     ORDER BY fecha`,
        { fechaInicio: fechaInicioStr, fechaFin, sede }
    );

    const proyectos = await db.query(
        `SELECT nombre, DATEDIFF(DAY, fechaInicio, ISNULL(fechaFinReal, GETDATE())) AS duracion 
     FROM Proyectos WHERE sede = @sede`,
        { sede }
    );

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(`Informe Semanal ${fechaInicioStr} a ${fechaFin}`);

    sheet.addRow([`Informe Semanal - ${sede} - ${fechaInicioStr} a ${fechaFin}`]).font = { bold: true };
    sheet.addRow([]);

    sheet.addRow(['Ventas']);
    ventas.forEach(v => sheet.addRow([v.fecha.toISOString().split('T')[0], v.canal, v.monto]));
    sheet.addRow([]);

    sheet.addRow(['Asistencia']);
    asistencia.forEach(a => sheet.addRow([a.fecha.toISOString().split('T')[0], a.nombre, a.estado]));
    sheet.addRow([]);

    sheet.addRow(['Incidencias']);
    incidencias.forEach(i => sheet.addRow([i.fecha.toISOString().split('T')[0], i.titulo, i.descripcion]));
    sheet.addRow([]);

    sheet.addRow(['Proyectos - Duración (días)']);
    proyectos.forEach(p => sheet.addRow([p.nombre, p.duracion]));

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=informe_semanal_${sede}_${fechaInicioStr}_a_${fechaFin}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
};

// ============ PROYECTOS ============

exports.formCrearProyecto = (req, res) => {
    const filePath = path.join(__dirname, '../views/Front/dist/html/demo10/responsable-sede/crearProyectoRS.html');
    res.sendFile(filePath);
};

exports.listarProyectos = async (req, res) => {
    const filePath = path.join(__dirname, '../views/Front/dist/html/demo10/responsable-sede/verProyectoRS.html');
    res.sendFile(filePath);
};

exports.apiProyectos = async (req, res) => {
    console.log('API Proyectos llamado');
    try {
        const sede = req.user?.sede;
        console.log('Sede:', sede);

        const pool = await db.connect();
        const result = await pool.request()
            .input('sede', db.sql.VarChar, sede)
            .query('SELECT * FROM Proyectos WHERE sede = @sede');

        res.json(result.recordset);
    } catch (err) {
        console.error('Error al obtener los proyectos:', err);
        res.status(500).json({ error: 'Error al obtener los proyectos' });
    }
};

exports.crearProyecto = async (req, res) => {
    const { nombre, sede, fechaInicio, fechaEsperadaFin, responsable, estado } = req.body;

    await db.query(`
    INSERT INTO Proyectos (nombre, sede, fechaInicio, fechaEsperadaFin, fechaFinReal, responsable, estado)
    VALUES (@nombre, @sede, @fechaInicio, @fechaEsperadaFin, NULL, @responsable, @estado)
  `, { nombre, sede, fechaInicio, fechaEsperadaFin, responsable, estado });

    res.redirect('/responsable/proyectos');
};


exports.finalizarProyecto = async (req, res) => {
    const { idProyecto } = req.params;
    const fechaFinReal = new Date().toISOString().split('T')[0];

    await db.query(`
    UPDATE Proyectos SET fechaFinReal = @fechaFinReal WHERE idProyecto = @idProyecto
  `, { fechaFinReal, idProyecto });

    res.redirect('/responsable/proyectos');
};

// ============ INCIDENCIAS ============
// Mostrar el HTML de la vista
exports.verIncidencias = async (req, res) => {
    const filePath = path.join(__dirname, '../views/Front/dist/html/demo10/responsable-sede/incidenciasRS.html');
    res.sendFile(filePath);
};

// API para obtener las incidencias en JSON (por ejemplo, para usarlas con fetch en el HTML)
exports.apiListarIncidencias = async (req, res) => {
    try {
        const pool = await db.connect();
        const result = await pool.request()
            .input('sede', sql.VarChar, req.user.sede)
            .query("SELECT * FROM Incidencias WHERE sede = @sede ORDER BY fecha DESC");
        res.json(result.recordset);
    } catch (err) {
        console.error('Error al listar incidencias:', err);
        res.status(500).send('Error al obtener las incidencias');
    }
};

// Guardar una nueva incidencia desde el formulario HTML
exports.registrarIncidencia = async (req, res) => {
    const { titulo, descripcion, fecha } = req.body;
    try {
        const pool = await db.connect();
        await pool.request()
            .input('sede', sql.VarChar, req.user.sede)
            .input('titulo', sql.VarChar, titulo)
            .input('descripcion', sql.Text, descripcion)
            .input('fecha', sql.Date, fecha)
            .input('estado', sql.VarChar, 'Pendiente')
            .query(`
                INSERT INTO Incidencias (sede, titulo, descripcion, fecha, estado)
                VALUES (@sede, @titulo, @descripcion, @fecha, @estado)
            `);
        res.redirect('/rs/incidencias');
    } catch (err) {
        console.error('Error al registrar incidencia:', err);
        res.status(500).send('Error al registrar incidencia');
    }
};

exports.vistaListarCapacitaciones = (req, res) => {
    const filePath = path.join(__dirname, '../views/Front/dist/html/demo10/responsable-sede/capacitacionesRS.html');
    res.sendFile(filePath);
};

exports.listarCapacitaciones = async (req, res) => {
    try {
        const pool = await db.connect();
        const result = await pool.request()
            .input('sede', sql.VarChar, req.user.sede)
            .query('SELECT * FROM Capacitaciones WHERE idResponsable = @id');
        res.json(result.recordset);
    } catch (err) {
        console.error('Error al listar capacitaciones:', err);
        res.status(500).send('Error al obtener las capacitaciones');
    }
}
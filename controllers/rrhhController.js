const path = require('path');
const db = require('../models/db');
const sql = require('mssql');
const { json } = require('stream/consumers');
const express = require('express');
const jwt = require('jsonwebtoken');
const PDFDocument = require('pdfkit');
const { Document, Packer, Paragraph, TextRun } = require('docx');
const ExcelJS = require('exceljs');
const fs = require('fs');
const bcrypt = require('bcrypt');

// Dashboard
exports.dashboard = (req, res) => {
    const filePath = path.join(__dirname, '../views/Front/dist/html/demo10/rrhh/dashboardRRHH.html');
    res.sendFile(filePath);
}

exports.dashboardData = async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
        return res.status(401).json({ error: 'No autorizado' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;

        const pool = await db.connect();
        const result = await pool.request()
            .input('id', sql.Int, req.user.id)
            .query('SELECT * FROM Administrativos WHERE id = @id');

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Administrativo no encontrado' });
        }

        const clientes = await pool.request().query(`
            SELECT COUNT(*) as total
            FROM Clientes
            WHERE VencimientoPlan IS NOT NULL AND VencimientoPlan >= CAST(GETDATE() AS DATE)
        `);
        const administrativos = await pool.request().query('SELECT COUNT(*) as total FROM administrativos');
        const documentosHoy = await pool.request().query(`
            SELECT COUNT(*) as total
            FROM documentos
            WHERE fecha_subida >= CAST(GETDATE() AS DATE)
        `);
        const solicitudesPendientes = await pool.request().query(`
            SELECT COUNT(*) as total
            FROM solicitudes
            WHERE estado = 1 -- 1 = En espera
        `);
        const eventosHoy = await pool.request().query(`
            SELECT COUNT(*) as total
            FROM AgendaRRHH
            WHERE fecha >= CAST(GETDATE() AS DATE) AND notificado = 0
        `);
    
        res.json({
            clientes: clientes.recordset[0].total,
            administrativos: administrativos.recordset[0].total, 
            documentosHoy: documentosHoy.recordset[0].total,
            solicitudesPendientes: solicitudesPendientes.recordset[0].total,
            eventosHoy: eventosHoy.recordset[0].total,
        });

    } catch (err) {
        console.error('Error en dashboardData:', err);
        res.status(500).json({ error: err.message });
    }
};


// GESTION DE USUARIOS (EMPLEADOS)

// Obtener todos los empleados


exports.listarAdministrativosAPI = async (req, res) => {
    console.log('Listar API LLamado');
    try {
        const pool = await db.connect();
        const result = await pool.request()
            .query('SELECT * FROM Administrativos'); // Consulta a la tabla 'usuario'
        const empleados = result.recordset;
        res.json(empleados); // Enviar los datos como JSON
    } catch (err) {
        console.error('Error al obtener los empleados:', err);
        res.status(500).send('Error al obtener los empleados');
    }
}



exports.crearEmpleadoPost = async (req, res) => {
  const {
    rol_id, sede, estado_vd, nombre_completo, rut, email_personal, clave,
    direccion, fono_contacto, contacto_emergencia, relacion, fono_emergencia,
    enfermedades, Alergias
  } = req.body;

  try {
    // 1) Hashear contraseña
    const hashedClave = await bcrypt.hash(clave, 10);

    // 2) Insertar
    const pool = await db.connect();
    await pool.request()
      .input('rol_id',            sql.Int,      rol_id)
      .input('sede',              sql.VarChar,  sede)
      .input('estado_vd',         sql.Char,     estado_vd)
      .input('nombre_completo',   sql.VarChar,  nombre_completo)
      .input('rut',               sql.VarChar,  rut)
      .input('email_personal',    sql.VarChar,  email_personal)
      .input('clave',             sql.VarChar,  hashedClave)
      .input('direccion',         sql.Text,     direccion)
      .input('fono_contacto',     sql.VarChar,  fono_contacto)
      .input('contacto_emergencia', sql.VarChar, contacto_emergencia)
      .input('relacion',          sql.VarChar,  relacion)
      .input('fono_emergencia',   sql.VarChar,  fono_emergencia)
      .input('enfermedades',      sql.VarChar,  enfermedades)
      .input('Alergias',          sql.VarChar,  Alergias)
      .query(`
        INSERT INTO Administrativos (
          rol_id, sede, estado_vd, nombre_completo, rut, email_personal, clave,
          direccion, fono_contacto, contacto_emergencia, relacion, fono_emergencia,
          enfermedades, Alergias
        ) VALUES (
          @rol_id, @sede, @estado_vd, @nombre_completo, @rut, @email_personal, @clave,
          @direccion, @fono_contacto, @contacto_emergencia, @relacion, @fono_emergencia,
          @enfermedades, @Alergias
        );
      `);

    return res.status(201).json({ message: 'Usuario creado exitosamente' });

  } catch (error) {
    // Claves duplicadas (rut o email) → error.number 2627 / 2601
    if (error.number === 2627 || error.number === 2601) {
      return res.status(409).json({ error: 'RUT o correo ya están registrados' });
    }
    console.error('Error al crear administrativo:', error);
    res.status(500).json({ error: 'Error interno al crear el administrativo' });
  }
};


// Eliminar un empleado
exports.eliminarEmpleado = async (req, res) => {
    try {
        const pool = await db.connect();
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('DELETE FROM Administrativos WHERE id = @id');
        res.json({ message: 'Empleado eliminado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Asistencia
exports.obtenerAsistencia = async (req, res) => {
    try {
        const pool = await db.connect();
        const result = await pool.request()
            .input('IdCliente', db.sql.Int, req.params.id)
            .query(`
                SELECT IdAsistencia, IdCliente, Fecha, HoraEntrada, HoraSalida
                FROM Asistencias
                WHERE IdCliente = @IdCliente
                ORDER BY Fecha DESC
            `);
        res.json({ asistencia: result.recordset });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};


// Solicitudes y aprobación de licencias y vacaciones
// Obtener solicitudes de un administrativo
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





// Crear solicitud nueva para un administrativo
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



// Actualizar estado de una solicitud
exports.actualizarEstado = async (req, res) => {
    try {
        const { estado, solicitudId } = req.body;
        const idAdministrativo = req.user?.id;

        console.log('Actualizar estado llamado con body:', req.body);
        console.log('ID Administrativo del token:', idAdministrativo);

        if (!idAdministrativo) {
            return res.status(401).json({ error: 'No autorizado: no se detectó idAdministrativo' });
        }

        const pool = await db.connect();
        const result = await pool.request()
            .input('estado', db.sql.Int, estado)
            .input('solicitudId', db.sql.Int, solicitudId)
            .input('idAdministrativo', db.sql.Int, idAdministrativo)
            .query(`
                UPDATE solicitudes 
                SET estado = @estado 
                WHERE id = @solicitudId AND idAdministrativo = @idAdministrativo
            `);

        console.log('Filas afectadas:', result.rowsAffected);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Solicitud no encontrada o no corresponde al administrativo' });
        }

        res.json({ message: 'Estado de la solicitud actualizado' });
    } catch (err) {
        console.error('Error al actualizar estado de solicitud:', err);
        res.status(500).json({ error: err.message });
    }
};





// Subida y consulta de documentos

exports.subirDocumento = async (req, res) => {
    try {
        const { administrativo_id, razon, tipo } = req.body;
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
                .input('ruta', db.sql.VarChar, ruta)
                .input('tipo', db.sql.VarChar, tipo)
                .input('razon', db.sql.VarChar, razon)
                .input('subido_por_rrhh', db.sql.Bit, 1)
                .query(`
                    INSERT INTO documentos (administrativo_id, nombre, ruta, tipo, razon, subido_por_rrhh)
                    VALUES (@administrativo_id, @nombre, @ruta, @tipo, @razon, @subido_por_rrhh)
                `);
        }

        // Retorna un JSON en vez de redirigir
        res.status(201).json({ message: 'Documentos subidos correctamente.' });

    } catch (err) {
        console.error('Error al subir documentos:', err);
        res.status(500).json({ error: 'Error al subir los documentos.' });
    }
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




exports.marcarVisto = async (req, res) => {
    try {
        await db.query('UPDATE documentos SET visto = 1 WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.marcarComoDescargado = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await db.connect();
        await pool.request()
            .input('id', sql.Int, id)
            .query('UPDATE documentos SET descargado = 1 WHERE id = @id');
        res.json({ message: 'Documento marcado como descargado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.obtenerDocumentosSubidosPorRRHH = async (req, res) => {
    try {
        const pool = await db.connect();
        const resultado = await pool.request().query(`
            SELECT 
                d.id,
                d.nombre AS nombre,                 -- nombre del documento
                d.tipo,
                d.ruta,
                d.razon,
                d.fecha_subida,
                d.visto,
                d.descargado,
                a.nombre_completo,
                a.rut,
                r.nombre AS rol
            FROM documentos d
            JOIN Administrativos a ON d.administrativo_id = a.id
            JOIN Rol r ON a.rol_id = r.id
            WHERE d.subido_por_rrhh = 1
        `);

        res.json({ documentos: resultado.recordset });
    } catch (err) {
        console.error('Error al obtener documentos subidos por RRHH:', err);
        res.status(500).json({ error: 'Error al obtener documentos' });
    }
};



// Gestion de Clientes

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
        res.redirect('/rrhh/vistaListarClientes');

    } catch (error) {
        console.error('Error al crear cliente:', error);
        res.status(500).send('Error al crear el cliente');
    }
};
// Listar clientes por sucursal

exports.listarPorSede = async (req, res) => {
    try {
        const pool = await db.connect();
        const result = await pool.request()
            .input('sede', sql.VarChar, req.params.sede)
            .query('SELECT * FROM Clientes WHERE Sede = @sede ORDER BY Nombre');
        res.json(result.recordset);
    } catch (err) {
        console.error('Error al obtener los clientes:', err);
        res.status(500).send('Error al obtener los clientes');
    }
};

// Notas internas de cliente
exports.obtenerNotasCliente = async (req, res) => {
    try {
        const notas = await db.query('SELECT * FROM notas WHERE cliente_id=?', [req.params.clienteId]);
        res.json({ notas });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.agregarNotaCliente = async (req, res) => {
    try {
        const { nota } = req.body;
        await db.query(
            'INSERT INTO notas (cliente_id, nota) VALUES (?, ?)',
            [req.params.clienteId, nota]
        );
        res.json({ message: 'Nota agregada' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Estado de membresía
exports.estadoMembresia = async (req, res) => {
    try {
        const membresias = await db.query('SELECT PlanC, VencimientoPlan FROM Clientes WHERE cliente_id=? ORDER BY id DESC LIMIT 1', [req.params.IdCliente]);
        if (membresias.length > 0) {
            res.json({ PlanC: membresias[0].PlanC, VencimientoPlan: membresias[0].VencimientoPlan });
        } else {
            res.json({ PlanC: 'Sin membresía', VencimientoPlan: null });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Gestion de Incidencias

exports.verIncidencias = async (req, res) => {
    try {
        const pool = await db.connect();
        const result = await pool.request()
            .query('SELECT * FROM Incidencias ORDER BY fecha DESC');
        res.json(result.recordset);
    } catch (err) {
        console.error('Error al obtener incidencias:', err);
        res.status(500).json({ error: 'Error al obtener incidencias' });
    }
};

exports.actualizarEstadoIncidencia = async (req, res) => {
    const { idIncidencia } = req.params;
    const { nuevoEstado } = req.body;

    try {
        const pool = await db.connect();
        await pool.request()
            .input('idIncidencia', sql.Int, idIncidencia)
            .input('estado', sql.VarChar, nuevoEstado)
            .query(`
                UPDATE Incidencias
                SET estado = @estado
                WHERE idIncidencia = @idIncidencia
            `);
        res.json({ message: 'Estado actualizado correctamente' });
    } catch (err) {
        console.error('Error al actualizar estado:', err);
        res.status(500).json({ error: 'Error al actualizar estado' });
    }
};

exports.contarSolicitudes = async (req, res) => {
    try {
        const pool = await db.connect();
        const result = await pool.request().query('SELECT COUNT(*) AS total FROM Solicitudes');
        res.json({ total: result.recordset[0].total });
    } catch (err) {
        console.error('Error al contar solicitudes:', err);
        res.status(500).json({ error: 'Error al contar solicitudes' });
    }
};

//  GET PARA LAS VISTAS HTML
exports.vistaListarEmpleados = (req, res) => {
    res.sendFile(path.join(__dirname, '../views/Front/dist/html/demo10/rrhh/listarEmpleadosRRHH.html'));
};

// Crear Empleado
exports.formCrearEmpleado = (req, res) => {
    res.sendFile(path.join(__dirname, '../views/Front/dist/html/demo10/rrhh/agregarEmpleadoRRHH.html'));
};

// Editar Empleado
exports.formEditarEmpleado = (req, res) => {
    res.sendFile(path.join(__dirname, '../views/Front/dist/html/demo10/rrhh/editarEmpleadoRRHH.html'));
};

// Listar Clientes
exports.vistaListarClientes = (req, res) => {
    res.sendFile(path.join(__dirname, '../views/Front/dist/html/demo10/rrhh/listarClientesRRHH.html'));
};

// Crear Cliente
exports.vistaformCrearCliente = (req, res) => {
    res.sendFile(path.join(__dirname, '../views/Front/dist/html/demo10/rrhh/agregarClienteRRHH.html'));
};

// Ver Documentos de Empleado
exports.vistaDocumentosEmpleado = (req, res) => {
    res.sendFile(path.join(__dirname, '../views/Front/dist/html/demo10/rrhh/documentosTrabajadoresRRHH.html'));
};

exports.vistaCrearDocumento = (req, res) => {
    res.sendFile(path.join(__dirname, '../views/Front/dist/html/demo10/rrhh/agregarDocumentoRRHH.html'));
};

exports.vistaDocumentosSubidosRRHH = (req, res) => {
    res.sendFile(path.join(__dirname, '../views/Front/dist/html/demo10/rrhh/listarDocumentosRRHH.html'));
};

// Ver Asistencias
exports.vistaAsistencia = (req, res) => {
    res.sendFile(path.join(__dirname, '../views/Front/dist/html/demo10/rrhh/asistenciasRRHH.html'));
};

// Ver Solicitudes
exports.vistaSolicitudes = (req, res) => {
    res.sendFile(path.join(__dirname, '../views/Front/dist/html/demo10/rrhh/solicitudesRRHH.html'));
};
exports.vistaCrearSolicitud = (req, res) => {
    res.sendFile(path.join(__dirname, '../views/Front/dist/html/demo10/rrhh/crearSolicitudRRHH.html'));
}

// Ver Membresías
exports.vistaMembresias = (req, res) => {
    res.sendFile(path.join(__dirname, '../views/Front/dist/html/demo10/rrhh/membresiasRRHH.html'));
};

// Ver Incidencias
exports.vistaIncidencias = (req, res) => {
    res.sendFile(path.join(__dirname, '../views/Front/dist/html/demo10/rrhh/incidenciasRRHH.html'));
};

// Ver Reportes (futura función)
exports.vistaReportes = (req, res) => {
    res.sendFile(path.join(__dirname, '../views/Front/dist/html/demo10/rrhh/reportesRRHH.html'));
};

// Ver Calendario RRHH (futura función)
exports.vistaCalendario = (req, res) => {
    res.sendFile(path.join(__dirname, '../views/Front/dist/html/demo10/rrhh/calendarioRRHH.html'));
};

exports.crearEventoAgenda = async (req, res) => {
    try {
        const { titulo, descripcion, fecha } = req.body;
        const idAdmin = req.user?.id;

        const pool = await db.connect();
        await pool.request()
            .input('titulo', db.sql.VarChar, titulo)
            .input('descripcion', db.sql.Text, descripcion)
            .input('fecha', db.sql.DateTime, fecha)
            .input('creado_por', db.sql.Int, idAdmin)
            .query(`
                INSERT INTO AgendaRRHH (titulo, descripcion, fecha, creado_por)
                VALUES (@titulo, @descripcion, @fecha, @creado_por)
            `);

        res.status(201).json({ message: 'Evento creado en la agenda' });
    } catch (err) {
        res.status(500).json({ error: 'Error al crear el evento' });
    }
};

exports.obtenerNotificacionesAgenda = async (req, res) => {
    try {
        const pool = await db.connect();
        const ahora = new Date();

        const resultado = await pool.request()
            .input('hoy', db.sql.DateTime, ahora)
            .query(`
                SELECT id, titulo, descripcion, fecha
                FROM AgendaRRHH
                WHERE fecha >= @hoy AND notificado = 0
                ORDER BY fecha ASC
            `);

        res.json({ eventos: resultado.recordset });
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener notificaciones' });
    }
};

exports.marcarEventoNotificado = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await db.connect();
        await pool.request()
            .input('id', db.sql.Int, id)
            .query(`UPDATE AgendaRRHH SET notificado = 1 WHERE id = @id`);
        res.json({ message: 'Evento marcado como notificado' });
    } catch (err) {
        res.status(500).json({ error: 'Error al marcar evento' });
    }
};

exports.exportarReporte = async (req, res) => {
    const { tipo, formato } = req.params;

    try {
        const pool = await db.connect();
        let datos;

        if (tipo === 'solicitudes') {
            const result = await pool.request().query(`
        SELECT s.id, s.tipo, s.fechaInicio, s.fechaFin, s.motivo, s.estado, a.nombre_completo
        FROM solicitudes s
        JOIN Administrativos a ON s.idAdministrativo = a.id
      `);
            datos = result.recordset;
        } else if (tipo === 'documentos') {
            const result = await pool.request().query(`
        SELECT d.nombre, d.tipo, d.razon, a.nombre_completo, d.fecha_subida
        FROM documentos d
        JOIN Administrativos a ON d.administrativo_id = a.id
      `);
            datos = result.recordset;
        } else if (tipo === 'incidencias') {
            const result = await pool.request().query(`
        SELECT i.idIncidencia, i.fecha, i.titulo,  i.descripcion, i.estado, a.nombre_completo
        FROM Incidencias i
        JOIN Administrativos a ON a.id = i.Administrativo_id
      `);
            datos = result.recordset;
        } else {
            return res.status(400).json({ error: 'Tipo de reporte no válido' });
        }

        // --- PDF ---
        if (formato === 'pdf') {
            const doc = new PDFDocument();
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=reporte_${tipo}.pdf`);
            doc.pipe(res);

            doc.fontSize(16).text(`Reporte de ${tipo}`, { underline: true });
            doc.moveDown();

            datos.forEach((item, idx) => {
                doc.fontSize(12).text(`${idx + 1}. ${JSON.stringify(item)}`);
                doc.moveDown();
            });

            doc.end();
        }

        // --- DOCX ---
        else if (formato === 'docx') {
            const doc = new Document({
                sections: [{
                    children: [
                        new Paragraph({ children: [new TextRun(`Reporte de ${tipo}`)] }),
                        ...datos.map(item => new Paragraph(JSON.stringify(item)))
                    ]
                }]
            });

            const b64 = await Packer.toBuffer(doc);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            res.setHeader('Content-Disposition', `attachment; filename=reporte_${tipo}.docx`);
            res.end(b64);
        }

        // --- XLSX ---
        else if (formato === 'xlsx') {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Reporte');

            worksheet.columns = Object.keys(datos[0] || {}).map(key => ({ header: key, key }));
            datos.forEach(row => worksheet.addRow(row));

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=reporte_${tipo}.xlsx`);

            await workbook.xlsx.write(res);
            res.end();
        }

        else {
            return res.status(400).json({ error: 'Formato no válido' });
        }
    } catch (err) {
        console.error('Error al exportar reporte:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};
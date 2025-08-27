const express = require('express');
const router = express.Router();
const path = require('path');
const db = require('../models/db');
const sql = require('mssql');
const { json } = require('stream/consumers');
const jwt = require('jsonwebtoken');

// Panel operativo por sede

// Dashboard
exports.panel = async (req, res) => {
    console.log('Accediendo al panel');
    const filePath = path.join(__dirname, '../views/Front/dist/html/demo10/JefeOperaciones/dashboardJO.html');
    res.sendFile(filePath);
}

exports.dashboardData = async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
        return res.status(401).json({ error: 'No autorizado' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const nombre_completo = decoded.nombre_completo;

        const pool = await db.connect();

        const result = await pool.request().query(`
            SELECT 
                (SELECT COUNT(*) FROM Clientes) AS totalClientes,
                (SELECT COUNT(*) FROM Administrativos) AS totalEmpleados,
                (SELECT COUNT(*) FROM Administrativos WHERE rol_id = 6) AS totalResponsables
                (SELECT COUNT(*) FROM Capacitaciones) AS totalCapacitaciones
        `);

        const { totalClientes, totalEmpleados, totalResponsables, totalCapacitaciones } = result.recordset[0];

        res.json({
            nombre_completo,
            totalClientes,
            totalEmpleados,
            totalResponsables,
            totalCapacitaciones
        });

    } catch (error) {
        console.error('Error en dashboard Jefe Operaciones:', error);
        res.status(500).json({ error: 'Error al obtener el panel operativo.' });
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

// Vista Documentos
exports.vistaDocumentos = async (req, res) => {
    console.log('Accediendo a la vista de documentos');
    const filePath = path.join(__dirname, '../views/Front/dist/html/demo10/JefeOperaciones/documentos.html');
    res.sendFile(filePath);
};
// Documentos
exports.obtenerDocumentosPorSede = async (req, res) => {
    try {
        const token = req.cookies.token;
        if (!token) return res.status(401).json({ error: 'No autorizado' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const sede = decoded.sede;

        const pool = await db.connect();

        const result = await pool.request()
            .input('sede', sql.VarChar, sede)
            .query(`
                SELECT d.id, d.administrativo_id, d.nombre, d.ruta, d.tipo, d.fecha_subida, e.nombre_completo
                FROM documentos d
                JOIN Administrativos e ON d.administrativo_id = e.id
                WHERE e.sede = @sede
            `);

        res.json(result.recordset);

    } catch (error) {
        console.error('Error al obtener documentos:', error);
        res.status(500).json({ error: 'Error al obtener los documentos.' });
    }
};

exports.vistaSubirDocumento = async (req, res) => {
    console.log('Accediendo a la vista de subir documento');
    const filePath = path.join(__dirname, '../views/Front/dist/html/demo10/JefeOperaciones/subirDocumento.html');
    res.sendFile(filePath);
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
                .input('ruta', db.sql.VarChar, ruta)
                .input('tipo', db.sql.VarChar, tipo)
                .input('razon', db.sql.VarChar, razon)
                .input('subido_por_rrhh', db.sql.Bit, 0) // 0 = subido por administrativo/JO
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


/**
 * Cumplimiento de metas por sede (usando columna varchar 'sede' en empleados y 'Sede' en clientes)
 */
exports.vistaCumplimientoMetas = async (req, res) => {
    console.log('Accediendo a la vista de cumplimiento de metas');
    const filePath = path.join(__dirname, '../views/Front/dist/html/demo10/JefeOperaciones/cumplimientoMetas.html');
    res.sendFile(filePath);
};

exports.cumplimientoMetasPorSede = async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'No autorizado' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const sede = decoded.sede;

        const pool = await db.connect();

        // Calcular total administrativos activos de la sede
        const totalAdministrativosResult = await pool.request()
            .input('sede', sql.VarChar, sede)
            .query(`SELECT COUNT(*) AS total FROM Administrativos WHERE sede = @sede`);
        const totalAdministrativos = totalAdministrativosResult.recordset[0].total;

        // Calcular total de asistencias (clientes) de la sede en el mes actual
        const totalAsistenciasResult = await pool.request()
            .input('sede', sql.VarChar, sede)
            .query(`
                SELECT COUNT(*) AS totalAsistencias
                FROM Asistencias a
                INNER JOIN Clientes c ON a.IdCliente = c.IdCliente
                WHERE c.Sede = @sede
                AND MONTH(a.Fecha) = MONTH(GETDATE())
                AND YEAR(a.Fecha) = YEAR(GETDATE())
            `);
        const totalAsistencias = totalAsistenciasResult.recordset[0].totalAsistencias;

        // Calcular nuevos clientes registrados este mes en esa sede
        const totalNuevosClientesResult = await pool.request()
            .input('sede', sql.VarChar, sede)
            .query(`
                SELECT COUNT(*) AS totalNuevosClientes
                FROM Clientes
                WHERE Sede = @sede
                AND MONTH(FechaRegistro) = MONTH(GETDATE())
                AND YEAR(FechaRegistro) = YEAR(GETDATE())
            `);
        const totalNuevosClientes = totalNuevosClientesResult.recordset[0].totalNuevosClientes;

        // Meta de asistencia = 80% del total de administrativos
        const metaAsistencia = Math.ceil(totalAdministrativos * 0.8);

        res.json({
            asistencia: {
                meta: metaAsistencia,
                actual: totalAsistencias
            },
            nuevosClientes: {
                meta: 50,
                actual: totalNuevosClientes
            }
        });

    } catch (error) {
        console.error('Error en cumplimientoMetasPorSede:', error);
        res.status(500).json({ error: 'Error al obtener el cumplimiento de metas.' });
    }
};

/**
 * Control de desempeño general de equipos comerciales y administrativos
 * (usando columna varchar 'sede' en empleados)
 */
exports.vistaDesempenoEquipos = async (req, res) => {
    console.log('Accediendo a la vista de desempeño de equipos');
    const filePath = path.join(__dirname, '../views/Front/dist/html/demo10/JefeOperaciones/desempenoEquipos.html');
    res.sendFile(filePath);
};

exports.desempenoEquiposPorSede = async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'No autorizado' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const sede = decoded.sede;

        const pool = await db.connect();

        // Traigo administrativos de la sede que no sean RRHH ni otros (si quieres filtrar por rol, agrega condición)
        const administrativos = await pool.request()
            .input('sede', sql.VarChar, sede)
            .query(`
                SELECT id, nombre_completo 
                FROM Administrativos 
                WHERE sede = @sede and rol_id NOT IN(1,2,4)
            `);

        const resultados = [];

        for (const admin of administrativos.recordset) {
            // Cuento solicitudes de cada administrativo
            const solicitudes = await pool.request()
                .input('idAdministrativo', sql.Int, admin.id)
                .query(`
                    SELECT COUNT(*) AS totalSolicitudes 
                    FROM solicitudes 
                    WHERE idAdministrativo = @idAdministrativo
                `);

            // Si tienes alguna forma de contar asistencias para administrativos, aquí va. Por ahora 0
            const totalAsistencias = 0;

            resultados.push({
                id: admin.id,
                nombre: admin.nombre_completo,
                asistencias: totalAsistencias,
                solicitudes: solicitudes.recordset[0].totalSolicitudes
            });
        }

        res.json(resultados);

    } catch (error) {
        console.error('Error al obtener el desempeño de equipos:', error);
        res.status(500).json({ error: 'Error al obtener el desempeño de equipos.' });
    }
};


/**
 * Visualización de reportes operativos (asistencia, nuevos clientes, solicitudes)
 * (usando columna varchar 'sede' en empleados y 'Sede' en clientes)
 */

exports.vistaReportesOperativos = async (req, res) => {
    console.log('Accediendo a la vista de reportes operativos');
    const filePath = path.join(__dirname, '../views/Front/dist/html/demo10/JefeOperaciones/reportesOperativos.html');
    res.sendFile(filePath);
};

const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const { Document, Packer, Paragraph, TextRun } = require('docx');

exports.reportesOperativos = async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'No autorizado' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const sede = decoded.sede;

        const pool = await db.connect();

        // Obtener métricas
        const asistenciasResult = await pool.request()
            .input('sede', sql.VarChar, sede)
            .query(`
                SELECT COUNT(*) AS totalAsistencias
                FROM Asistencias a
                INNER JOIN Clientes c ON a.IdCliente = c.IdCliente
                WHERE c.Sede = @sede
                AND MONTH(a.Fecha) = MONTH(GETDATE()) AND YEAR(a.Fecha) = YEAR(GETDATE())
            `);

        const nuevosClientesResult = await pool.request()
            .input('sede', sql.VarChar, sede)
            .query(`
                SELECT COUNT(*) AS totalNuevosClientes
                FROM Clientes
                WHERE Sede = @sede
                AND MONTH(FechaRegistro) = MONTH(GETDATE()) AND YEAR(FechaRegistro) = YEAR(GETDATE())
            `);

        const solicitudesPendientesResult = await pool.request()
            .input('sede', sql.VarChar, sede)
            .query(`
                SELECT COUNT(*) AS totalSolicitudesPendientes
                FROM solicitudes s
                INNER JOIN Administrativos a ON s.idAdministrativo = a.id
                WHERE a.sede = @sede AND s.estado = 0
            `);

        const documentosAgregadosResult = await pool.request()
            .input('sede', sql.VarChar, sede)
            .query(`
                SELECT COUNT(*) AS totalDocumentos
                FROM documentos d
                INNER JOIN Administrativos a ON d.administrativo_id = a.id
                WHERE a.sede = @sede
                AND MONTH(d.fecha_subida) = MONTH(GETDATE()) AND YEAR(d.fecha_subida) = YEAR(GETDATE())
            `);

        const incidenciasPendientesResult = await pool.request()
            .input('sede', sql.VarChar, sede)
            .query(`
                SELECT COUNT(*) AS totalIncidenciasPendientes
                FROM Incidencias
                WHERE sede = @sede AND estado = 'Pendiente'
            `);

        // 🔄 CORREGIDO: capacitaciones pendientes por sede desde CapacitacionesAsistentes
        const capacitacionesPendientesResult = await pool.request()
            .input('sede', sql.VarChar, sede)
            .query(`
                SELECT COUNT(*) AS totalCapacitacionesPendientes
                FROM CapacitacionesAsistentes ca
                INNER JOIN Administrativos a ON ca.responsable_id = a.id
                WHERE a.sede = @sede AND ca.asistio = 0
            `);

        // Construir objeto con resultados
        const reporteData = {
            asistencias: asistenciasResult.recordset[0].totalAsistencias,
            nuevosClientes: nuevosClientesResult.recordset[0].totalNuevosClientes,
            solicitudesPendientes: solicitudesPendientesResult.recordset[0].totalSolicitudesPendientes,
            documentosAgregados: documentosAgregadosResult.recordset[0].totalDocumentos,
            incidenciasPendientes: incidenciasPendientesResult.recordset[0].totalIncidenciasPendientes,
            capacitacionesPendientes: capacitacionesPendientesResult.recordset[0].totalCapacitacionesPendientes
        };

        const formato = (req.query.formato || 'json').toLowerCase();

        // ↓↓↓ EXPORTAR EN PDF, EXCEL O WORD
        if (formato === 'pdf') {
            const doc = new PDFDocument();
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename="reporte_operativo.pdf"');
            doc.pipe(res);

            doc.fontSize(18).text('Reporte Operativo - Sede: ' + sede, { underline: true });
            doc.moveDown();

            for (const [key, value] of Object.entries(reporteData)) {
                doc.fontSize(14).text(`${key.replace(/([A-Z])/g, ' $1').toUpperCase()}: ${value}`);
            }

            doc.end();

        } else if (formato === 'excel') {
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Reporte Operativo');

            sheet.columns = [
                { header: 'Indicador', key: 'indicador', width: 30 },
                { header: 'Valor', key: 'valor', width: 15 },
            ];

            for (const [key, value] of Object.entries(reporteData)) {
                sheet.addRow({
                    indicador: key.replace(/([A-Z])/g, ' $1').toUpperCase(),
                    valor: value
                });
            }

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename="reporte_operativo.xlsx"');
            await workbook.xlsx.write(res);
            res.end();

        } else if (formato === 'word' || formato === 'docx') {
            const doc = new Document({
                sections: [{
                    children: [
                        new Paragraph({
                            text: `Reporte Operativo - Sede: ${sede}`,
                            heading: "Heading1"
                        }),
                        ...Object.entries(reporteData).map(([key, value]) =>
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: `${key.replace(/([A-Z])/g, ' $1').toUpperCase()}: `,
                                        bold: true
                                    }),
                                    new TextRun(String(value))
                                ]
                            })
                        )
                    ]
                }]
            });

            const buffer = await Packer.toBuffer(doc);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            res.setHeader('Content-Disposition', 'attachment; filename="reporte_operativo.docx"');
            res.send(buffer);

        } else {
            res.json(reporteData);
        }

    } catch (error) {
        console.error('Error al obtener los reportes operativos:', error);
        res.status(500).json({ error: 'Error al obtener los reportes operativos.' });
    }
};



/**
 * Gestión de incidencias operativas y seguimiento de soluciones
 * (usando columna varchar 'sede' en empleados)
 */

exports.vistaIncidencias = async (req, res) => {
    console.log('Accediendo a la vista de incidencias');
    const filePath = path.join(__dirname, '../views/Front/dist/html/demo10/JefeOperaciones/incidencias.html');
    res.sendFile(filePath);
}
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

exports.actualizarEstadoIncidencia = async (req, res) => {
    try {
        const { idIncidencia, estado } = req.body;

        const pool = await db.connect();
        await pool.request()
            .input('idIncidencia', sql.Int, idIncidencia)
            .input('estado', sql.Int, estado)
            .query(`
                UPDATE Incidencias 
                SET estado = @estado 
                WHERE id = @idIncidencia AND tipo = 'Incidencia'
            `);

        res.json({ exito: true });
    } catch (error) {
        console.error('Error al actualizar la incidencia:', error);
        res.status(500).json({ error: 'Error al actualizar la incidencia.' });
    }
};

/**
 * Aprobación de planes de mejora o acciones correctivas por sede
 * (usando columna varchar 'sede' en empleados)
 */
exports.vistaCrearPlanes = async (req, res) => {
    console.log('Accediendo a la vista de crear planes de mejora');
    const filePath = path.join(__dirname, '../views/Front/dist/html/demo10/JefeOperaciones/crearPlanes.html');
    res.sendFile(filePath);
};

exports.crearPlanMejora = async (req, res) => {
    try {
        const { nombre, fechaInicio, fechaEsperadaFin } = req.body;
        const token = req.cookies.token;
        if (!token) return res.status(401).json({ error: 'No autorizado' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const sede = decoded.sede;
        const idResponsable = decoded.id;

        const pool = await db.connect();
        await pool.request()
            .input('nombre', sql.NVarChar, nombre)
            .input('fechaInicio', sql.Date, fechaInicio)
            .input('fechaEsperadaFin', sql.Date, fechaEsperadaFin)
            .input('idResponsable', sql.Int, idResponsable)
            .input('sede', sql.VarChar, sede)
            .input('estado', sql.VarChar, 'amarillo')
            .query(`
                INSERT INTO Proyectos (nombre, fechaInicio, fechaEsperadaFin, idResponsable, sede, estado)
                VALUES (@nombre, @fechaInicio, @fechaEsperadaFin, @idResponsable, @sede, @estado)
            `);

        res.json({ exito: true });
    } catch (error) {
        console.error('Error al crear el plan de mejora (proyecto):', error);
        res.status(500).json({ error: 'Error al crear el plan de mejora.' });
    }
};



exports.vistaPlanesMejora = async (req, res) => {
    console.log('Accediendo a la vista de planes de mejora');
    const filePath = path.join(__dirname, '../views/Front/dist/html/demo10/JefeOperaciones/planesMejoras.html');
    res.sendFile(filePath);
};

exports.planesMejoraPorSede = async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'No autorizado' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const sede = decoded.sede;

        const pool = await db.connect();
        const result = await pool.request()
            .input('sede', sql.VarChar, sede)
            .query(`
                SELECT p.idProyecto, p.nombre, p.fechaInicio, p.fechaEsperadaFin, p.fechaFinReal, 
                       p.estado, a.nombre_completo AS responsable
                FROM Proyectos p
                INNER JOIN Administrativos a ON p.idResponsable = a.id
                WHERE p.sede = @sede
                ORDER BY p.fechaInicio DESC
            `);

        res.json(result.recordset);
    } catch (error) {
        console.error('Error al obtener proyectos:', error);
        res.status(500).json({ error: 'Error al obtener los planes de mejora.' });
    }
};

exports.aprobarPlanMejora = async (req, res) => {
    try {
        const { idProyecto, fechaFinReal, estado } = req.body;

        const pool = await db.connect();
        await pool.request()
            .input('idProyecto', sql.Int, idProyecto)
            .input('fechaFinReal', sql.Date, fechaFinReal)
            .input('estado', sql.VarChar, estado)
            .query(`
                UPDATE Proyectos 
                SET fechaFinReal = @fechaFinReal, estado = @estado
                WHERE idProyecto = @idProyecto
            `);

        res.json({ exito: true });
    } catch (error) {
        console.error('Error al aprobar proyecto:', error);
        res.status(500).json({ error: 'Error al aprobar el plan de mejora.' });
    }
};


// Vista HTML
exports.vistaCapacitaciones = (req, res) => {
    const filePath = path.join(__dirname, '../views/Front/dist/html/demo10/JefeOperaciones/capacitaciones.html');
    res.sendFile(filePath);
};

// Listar capacitaciones
exports.listarCapacitaciones = async (req, res) => {
    try {
        const pool = await db.connect();
        const result = await pool.request().query(`
            SELECT * FROM Capacitaciones
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: 'Error al listar capacitaciones' });
    }
};

exports.vistaCrearCapacitacion = (req, res) => {
    const filePath = path.join(__dirname, '../views/Front/dist/html/demo10/JefeOperaciones/crearCapacitacion.html');
    res.sendFile(filePath);
};

// Crear
exports.crearCapacitacion = async (req, res) => {
    try {
        const { titulo, descripcion, fecha, responsables } = req.body; // responsables es un array de IDs
        const token = req.cookies.token;
        if (!token) return res.status(401).json({ error: 'No autorizado' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const creado_por = decoded.id;

        const pool = await db.connect();

        const insertCap = await pool.request()
            .input('titulo', sql.NVarChar, titulo)
            .input('descripcion', sql.Text, descripcion)
            .input('fecha', sql.DateTime, fecha)
            .input('creado_por', sql.Int, creado_por)
            .query(`
                INSERT INTO Capacitaciones (titulo, descripcion, fecha, creado_por)
                OUTPUT INSERTED.id
                VALUES (@titulo, @descripcion, @fecha, @creado_por)
            `);

        const idCapacitacion = insertCap.recordset[0].id;

        for (const idResponsable of responsables) {
            await pool.request()
                .input('capacitacion_id', sql.Int, idCapacitacion)
                .input('responsable_id', sql.Int, idResponsable)
                .query(`
                    INSERT INTO CapacitacionesAsistentes (capacitacion_id, responsable_id)
                    VALUES (@capacitacion_id, @responsable_id)
                `);
        }

        res.status(201).json({ message: 'Capacitación creada correctamente' });
    } catch (err) {
        console.error('Error al crear capacitación:', err);
        res.status(500).json({ error: 'Error al crear capacitación' });
    }
};


// Editar
exports.actualizarEstadoCapacitacion = async (req, res) => {
    try {
        const { id, estado } = req.body;

        const pool = await db.connect();
        await pool.request()
            .input('id', sql.Int, id)
            .input('estado', sql.VarChar, estado)
            .query(`
                UPDATE Capacitaciones
                SET estado = @estado
                WHERE id = @id
            `);

        res.json({ message: 'Estado de la capacitación actualizado' });
    } catch (err) {
        console.error('Error al actualizar estado de capacitación:', err);
        res.status(500).json({ error: 'Error al actualizar el estado' });
    }
};


exports.vistaListarAsistenciaCapacitacion = (req, res) => {
    const filePath = path.join(__dirname, '../views/Front/dist/html/demo10/JefeOperaciones/AsistenciaCapacitacion.html');
    res.sendFile(filePath);
};

exports.listaAsistenciaCapacitacion = async (req, res) => {
    try {
        const pool = await db.connect();
        const result = await pool.request().query(`
            SELECT 
                c.id AS idCapacitacion,
                c.titulo,
                c.descripcion,
                c.fecha,
                c.estado,
                a.id AS idResponsable,
                a.nombre_completo,
                ca.asistio
            FROM Capacitaciones c
            LEFT JOIN CapacitacionesAsistentes ca ON c.id = ca.capacitacion_id
            LEFT JOIN Administrativos a ON ca.responsable_id = a.id
            WHERE CAST(c.fecha AS DATE) = CAST(GETDATE() AS DATE)
        `);

        res.json(result.recordset);
    } catch (err) {
        console.error('Error al obtener lista de asistencia:', err);
        res.status(500).json({ error: 'Error al obtener lista de asistencia' });
    }
};


// Marcar asistencia
exports.marcarAsistencia = async (req, res) => {
    try {
        const { idCapacitacion, responsable_id, asistio } = req.body;

        const pool = await db.connect();
        await pool.request()
            .input('idCapacitacion', sql.Int, idCapacitacion)
            .input('responsable_id', sql.Int, responsable_id)
            .input('asistio', sql.Bit, asistio)
            .query(`
                UPDATE CapacitacionesAsistentes
                SET asistio = @asistio
                WHERE capacitacion_id = @idCapacitacion AND responsable_id = @responsable_id
            `);

        res.json({ message: 'Asistencia actualizada' });
    } catch (err) {
        console.error('Error al marcar asistencia:', err);
        res.status(500).json({ error: 'Error al actualizar asistencia' });
    }
};



// Eliminar
exports.eliminarCapacitacion = async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await db.connect();
        await pool.request()
            .input('id', sql.Int, id)
            .query(`DELETE FROM Capacitaciones WHERE id = @id`);
        res.json({ message: 'Capacitación eliminada' });
    } catch (err) {
        res.status(500).json({ error: 'Error al eliminar capacitación' });
    }
};

exports.apiResponsables = async (req, res) => {
    try {
        const pool = await db.connect();
        const result = await pool.request().query(`
            SELECT * 
            FROM Administrativos 
            WHERE rol_id = 6
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error('Error al obtener responsables:', err);
        res.status(500).json({ error: 'Error al obtener responsables' });
    }
}
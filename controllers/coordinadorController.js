const express = require('express');
const router = express.Router();
const path = require('path');
const db = require('../models/db');
const sql = require('mssql');

exports.getDashboard = (req, res) => {
    const filePath = path.join(__dirname, '../views/Front/dist/html/demo10/Comercial/Dashboard.html');
    res.sendFile(filePath);
};

exports.kpiPanel = async (req, res) => {
    try {
        const pool = await db.connect();

        // Total clientes
        const totalClientes = (await pool.request().query('SELECT COUNT(*) AS total FROM Clientes')).recordset[0].total;

        // Nuevos clientes este mes
        const nuevosEsteMes = (await pool.request().query(`
            SELECT COUNT(*) AS total FROM Clientes
            WHERE MONTH(FechaRegistro) = MONTH(GETDATE()) AND YEAR(FechaRegistro) = YEAR(GETDATE())
        `)).recordset[0].total;

        // Tasa de conversión (clientes con Conversion no nulo / total clientes)
        const conversiones = (await pool.request().query(`
            SELECT COUNT(*) AS total FROM Clientes WHERE Conversion IS NOT NULL
        `)).recordset[0].total;
        const tasaConversion = totalClientes ? (conversiones / totalClientes * 100).toFixed(2) : 0;

        // Valor promedio plan
        const valorPromedio = (await pool.request().query(`
            SELECT AVG(ValorPlan * 1.0) AS promedio FROM Clientes
        `)).recordset[0].promedio || 0;

        res.json({
            totalClientes,
            nuevosEsteMes,
            tasaConversion,
            valorPromedio: Number(valorPromedio).toFixed(2)
        });
    } catch (err) {
        console.error('Error en KPIs:', err);
        res.status(500).send('Error obteniendo KPIs');
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

exports.formcrearCliente = (req, res) => {
    const filePath = path.join(__dirname, '../views/Front/dist/html/demo10/Comercial/Crear-Cliente.html');
    res.sendFile(filePath);
};

exports.crearClientePost = async (req, res) => {
    const {
        Nombre, SegundoNombre, Apellido, SegundoApellido, PlanC,
        FechaRegistro, Conversion, VencimientoPlan, Sede,
        PlanFirmado, RUT, FechaNacimiento, DiasActivos,
        CorreoElectronico, Genero, Edad, TelefonoMovil,
        UltimaPresencia, ValorPlan, IdVendedor
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
            .input('IdVendedor', sql.Int, IdVendedor) // nuevo campo vendedor
            .query(`
                INSERT INTO Clientes (
                    Nombre, SegundoNombre, Apellido, SegundoApellido, PlanC, FechaRegistro, Conversion,
                    VencimientoPlan, Sede, PlanFirmado, RUT, FechaNacimiento, DiasActivos,
                    CorreoElectronico, Genero, Edad, TelefonoMovil, UltimaPresencia, ValorPlan, IdVendedor
                )
                VALUES (
                    @Nombre, @SegundoNombre, @Apellido, @SegundoApellido, @PlanC, @FechaRegistro, @Conversion,
                    @VencimientoPlan, @Sede, @PlanFirmado, @RUT, @FechaNacimiento, @DiasActivos,
                    @CorreoElectronico, @Genero, @Edad, @TelefonoMovil, @UltimaPresencia, @ValorPlan, @IdVendedor
                )
            `);

        await transaction.commit();
        res.redirect('/coordinador/dashboard');

    } catch (error) {
        console.error('Error al crear cliente:', error);
        res.status(500).send('Error al crear el cliente');
    }
};

/**
 * Comparación de resultados vs. metas
 * Recibe metas por query (?metaClientes=100&metaConversion=80)
 */
exports.vistaCompararVsMetas = (req, res) => {
    const filePath = path.join(__dirname, '../views/Front/dist/html/demo10/Comercial/CompararVsMetas.html');
    res.sendFile(filePath);
};

exports.compararVsMetas = async (req, res) => {
    try {
        const metaClientes = parseInt(req.query.metaClientes) || 0;
        const metaConversion = parseFloat(req.query.metaConversion) || 0;

        const pool = await db.connect();
        const totalClientes = (await pool.request().query('SELECT COUNT(*) AS total FROM Clientes')).recordset[0].total;
        const conversiones = (await pool.request().query('SELECT COUNT(*) AS total FROM Clientes WHERE Conversion IS NOT NULL')).recordset[0].total;
        const tasaConversion = totalClientes ? (conversiones / totalClientes * 100).toFixed(2) : 0;

        res.json({
            clientes: { actual: totalClientes, meta: metaClientes, cumplido: totalClientes >= metaClientes },
            conversion: { actual: tasaConversion, meta: metaConversion, cumplido: tasaConversion >= metaConversion }
        });
    } catch (err) {
        console.error('Error en comparación vs metas:', err);
        res.status(500).send('Error en comparación vs metas');
    }
};

/**
 * Reporte de bajo rendimiento
 * Lista vendedores con menos de X clientes nuevos este mes (X por query, default 3)
 */
exports.vistaBajoRendimiento = (req, res) => {
    const filePath = path.join(__dirname, '../views/Front/dist/html/demo10/Comercial/BajoRendimiento.html');
    res.sendFile(filePath);
};

exports.reporteBajoRendimiento = async (req, res) => {
    try {
        const minClientes = parseInt(req.query.minClientes) || 3;
        const pool = await db.connect();

        // Consideramos solo los administrativos con rol 7 (Ventas)
        const result = await pool.request()
            .input('minClientes', sql.Int, minClientes)
            .query(`
                SELECT 
                    a.id,
                    a.nombre_completo,
                    a.sede,
                    COUNT(c.IdCliente) AS nuevosClientes
                FROM Administrativos a
                LEFT JOIN Clientes c 
                    ON a.id = c.IdVendedor
                    AND MONTH(c.FechaRegistro) = MONTH(GETDATE())
                    AND YEAR(c.FechaRegistro) = YEAR(GETDATE())
                WHERE a.rol_id = 7
                GROUP BY a.id, a.nombre_completo, a.sede
                HAVING COUNT(c.IdCliente) < @minClientes
            `);

        res.json(result.recordset);
    } catch (err) {
        console.error('Error en reporte bajo rendimiento:', err);
        res.status(500).send('Error en reporte bajo rendimiento');
    }
};

/**
 * Detección de focos débiles
 * Devuelve sedes con menor cantidad de nuevos clientes este mes
 */
exports.vistaFocosDebiles = (req, res) => {
    const filePath = path.join(__dirname, '../views/Front/dist/html/demo10/Comercial/FocosDebiles.html');
    res.sendFile(filePath);
};

exports.focosDebiles = async (req, res) => {
    try {
        const pool = await db.connect();
        const result = await pool.request().query(`
            SELECT Sede, COUNT(*) AS nuevosClientes
            FROM Clientes
            WHERE MONTH(FechaRegistro) = MONTH(GETDATE()) AND YEAR(FechaRegistro) = YEAR(GETDATE())
            GROUP BY Sede
            ORDER BY nuevosClientes ASC
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error('Error en focos débiles:', err);
        res.status(500).send('Error en focos débiles');
    }
};

/**
 * Diagnóstico de causa del problema
 * Analiza si el problema es baja asistencia, pocas solicitudes, etc.
 */
exports.vistaDiagnosticoProblema = (req, res) => {
    const filePath = path.join(__dirname, '../views/Front/dist/html/demo10/Comercial/DiagnosticoProblema.html');
    res.sendFile(filePath);
};

exports.diagnosticoProblema = async (req, res) => {
    try {
        const pool = await db.connect();

        // Baja asistencia
        const asistencia = await pool.request().query(`
            SELECT a.id, a.nombre_completo, COUNT(asist.idAsis) AS asistenciasMes
            FROM Administrativos a
            LEFT JOIN asistencia asist ON a.id = asist.idEmpleado
                AND MONTH(asist.fecha) = MONTH(GETDATE()) AND YEAR(asist.fecha) = YEAR(GETDATE())
            GROUP BY a.id, a.nombre_completo
            ORDER BY asistenciasMes ASC
        `);

        // Pocas solicitudes gestionadas
        const solicitudes = await pool.request().query(`
            SELECT a.id, a.nombre_completo, COUNT(s.id) AS solicitudesMes
            FROM Administrativos a
            LEFT JOIN solicitudes s ON a.id = s.idEmpleado
                AND MONTH(s.fechaInicio) = MONTH(GETDATE()) AND YEAR(s.fechaInicio) = YEAR(GETDATE())
            GROUP BY a.id, a.nombre_completo
            ORDER BY solicitudesMes ASC
        `);

        res.json({
            bajaAsistencia: asistencia.recordset,
            pocasSolicitudes: solicitudes.recordset
        });
    } catch (err) {
        console.error('Error en diagnóstico:', err);
        res.status(500).send('Error en diagnóstico');
    }
};

/**
 * Rendimiento individual de vendedores
 * Muestra clientes nuevos, asistencias y solicitudes por vendedor este mes
 */
exports.vistaRendimientoVendedores = (req, res) => {
    const filePath = path.join(__dirname, '../views/Front/dist/html/demo10/Comercial/RendimientoVendedores.html');
    res.sendFile(filePath);
};

exports.rendimientoVendedores = async (req, res) => {
    try {
        const pool = await db.connect();

        const result = await pool.request().query(`
            SELECT 
                a.id, 
                a.nombre_completo,
                (SELECT COUNT(*) FROM Clientes c WHERE c.IdVendedor = a.id AND MONTH(c.FechaRegistro) = MONTH(GETDATE()) AND YEAR(c.FechaRegistro) = YEAR(GETDATE())) AS nuevosClientes,
                (SELECT COUNT(*) FROM asistencia asis WHERE asis.idEmpleado = a.id AND MONTH(asis.fecha) = MONTH(GETDATE()) AND YEAR(asis.fecha) = YEAR(GETDATE())) AS asistencias,
                (SELECT COUNT(*) FROM solicitudes s WHERE s.idEmpleado = a.id AND MONTH(s.fechaInicio) = MONTH(GETDATE()) AND YEAR(s.fechaInicio) = YEAR(GETDATE())) AS solicitudes
            FROM Administrativos a
            WHERE a.rol_id = 7
        `);

        res.json(result.recordset);
    } catch (err) {
        console.error('Error en rendimiento vendedores:', err);
        res.status(500).send('Error en rendimiento vendedores');
    }
};

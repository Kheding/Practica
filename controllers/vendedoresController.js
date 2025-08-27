const sql = require('mssql');
const path = require('path');
const db = require('../models/db');
const jwt = require('jsonwebtoken');
const moment = require('moment');

exports.dashboardVendedor = async (req, res) => {
    const filePath = path.join(__dirname, '../views/Front/dist/html/demo10/vendedor/dashboard.html');
    res.sendFile(filePath);
};

exports.dashboardVendedorData = async (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'No autorizado' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;

        const id = req.user.id; // id del Administrativo (vendedor)
        const hoy = moment().format('YYYY-MM-DD');
        const mesInicio = moment().startOf('month').format('YYYY-MM-DD');
        const mesFin = moment().endOf('month').format('YYYY-MM-DD');

        const pool = await db.connect();

        // Obtener datos de clientes registrados hoy
        const suscripcionesHoy = await pool.request()
            .input('idVendedor', sql.Int, id)
            .input('hoy', sql.Date, hoy)
            .query(`
                SELECT COUNT(*) AS total
                FROM clientes
                WHERE IdVendedor = @idVendedor AND CONVERT(date, FechaRegistro) = @hoy
            `);

        // Obtener datos de clientes registrados en el mes
        const suscripcionesMes = await pool.request()
            .input('idVendedor', sql.Int, id)
            .input('mesInicio', sql.Date, mesInicio)
            .input('mesFin', sql.Date, mesFin)
            .query(`
                SELECT COUNT(*) AS total
                FROM clientes
                WHERE IdVendedor = @idVendedor AND FechaRegistro BETWEEN @mesInicio AND @mesFin
            `);

        // Obtener nombre completo del vendedor desde tabla Administrativos (ajusta el nombre de la tabla y columnas si es distinto)
        const vendedor = await pool.request()
            .input('idVendedor', sql.Int, id)
            .query(`
                SELECT nombre_completo
                FROM Administrativos
                WHERE id = @idVendedor
            `);

        res.json({
            suscripcionesHoy: suscripcionesHoy.recordset[0].total,
            suscripcionesMes: suscripcionesMes.recordset[0].total,
            nombreVendedor: vendedor.recordset.length > 0 ? vendedor.recordset[0].nombre_completo : 'Usuario'
        });
    } catch (error) {
        console.error('Error en dashboardVendedorData:', error);
        res.status(500).json({ error: error.message });
    }
};


// Vista del formulario
exports.crearVentaProductoGet = async (req, res) => {
  const filePath = path.join(__dirname, '../views/Front/dist/html/demo10/vendedor/crearVentaProducto.html');
  res.sendFile(filePath);
};

// Datos para cargar en el formulario (clientes)
exports.crearVentaProductoData = async (req, res) => {
  try {
    const pool = await db.connect();
    const clientes = await pool.request().query('SELECT IdCliente, Nombre, Apellido FROM Clientes');
    res.json({ clientes: clientes.recordset });
  } catch (error) {
    console.error('Error en crearVentaProductoData:', error);
    res.status(500).json({ error: 'Error al obtener datos para venta' });
  }
};

// Registro de venta
exports.crearVentaProductoPost = async (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).send('No autorizado');

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    const { cliente_id, monto, descripcion, metodo_pago, sede } = req.body;
    const idVendedor = req.user.id;

    if (!cliente_id || !monto || !descripcion || !metodo_pago || !sede) {
      return res.status(400).send('Datos incompletos');
    }

    const pool = await db.connect();
    await pool.request()
      .input('IdCliente', sql.Int, cliente_id)
      .input('FechaVenta', sql.Date, new Date())
      .input('Monto', sql.Int, monto)
      .input('Descripcion', sql.NVarChar(255), descripcion)
      .input('MetodoPago', sql.NVarChar(100), metodo_pago)
      .input('Sede', sql.NVarChar(100), sede)
      .query(`
        INSERT INTO Ventas (IdCliente, FechaVenta, Monto, Descripcion, MetodoPago, Sede)
        VALUES (@IdCliente, @FechaVenta, @Monto, @Descripcion, @MetodoPago, @Sede)
      `);

    res.redirect('/vendedor/historial-ventas');
  } catch (error) {
    console.error('Error en crearVentaProductoPost:', error);
    res.status(500).send('Error al registrar venta');
  }
};

exports.historialVentas = async (req, res) => {
  const filePath = path.join(__dirname, '../views/Front/dist/html/demo10/vendedor/historialVentas.html');
  res.sendFile(filePath);
};

exports.historialVentasData = async (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'No autorizado' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const idVendedor = decoded.id;

    const pool = await db.connect();
    const result = await pool.request()
      .input('idVendedor', sql.Int, idVendedor)
      .query(`
        SELECT 
          v.IdVenta AS id,
          c.Nombre + ' ' + c.Apellido AS cliente,
          v.FechaVenta AS fecha,
          v.Monto,
          v.Descripcion,
          v.MetodoPago,
          v.Sede
        FROM Ventas v
        INNER JOIN Clientes c ON v.IdCliente = c.IdCliente
        WHERE c.IdVendedor = @idVendedor
        ORDER BY v.FechaVenta DESC
      `);

    res.json(result.recordset);
  } catch (error) {
    console.error('Error en historialVentasData:', error);
    res.status(500).json({ error: 'Error al cargar historial de ventas' });
  }
};

exports.crearClienteGet = async (req, res) => {
  const filePath = path.join(__dirname, '../views/Front/dist/html/demo10/vendedor/crearCliente.html');
  res.sendFile(filePath);
};

exports.crearClienteData = async (req, res) => {
  try {
    // Si no tienes tablas sedes ni planes, aquí podrías enviar datos fijos o vacíos
    res.json({
      sedes: [],   // o un arreglo con las sedes que tengas definidas manualmente
      planes: []   // igual para planes
    });
  } catch (error) {
    console.error('Error en crearClienteData:', error);
    res.status(500).json({ error: 'Error al obtener datos para cliente' });
  }
};

exports.crearClientePost = async (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).send('No autorizado');

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    const idVendedor = decoded.id;  // <--- Aquí obtienes el id vendedor del token

    const {
      nombre,
      segundoNombre,
      apellido,
      segundoApellido,
      planC,
      fechaRegistro,
      conversion,
      vencimientoPlan,
      sede,
      planFirmado,
      rut,
      fechaNacimiento,
      diasActivos,
      correoElectronico,
      genero,
      edad,
      telefonoMovil,
      ultimaPresencia,
      valorPlan
    } = req.body;

    if (!nombre || !apellido || !correoElectronico || !sede || !planC) {
      return res.status(400).send('Datos incompletos');
    }

    const pool = await db.connect();
    await pool.request()
      .input('Nombre', sql.NVarChar(100), nombre)
      .input('SegundoNombre', sql.NVarChar(100), segundoNombre || null)
      .input('Apellido', sql.NVarChar(50), apellido)
      .input('SegundoApellido', sql.NVarChar(50), segundoApellido || null)
      .input('PlanC', sql.NVarChar(100), planC)
      .input('FechaRegistro', sql.DateTime, fechaRegistro ? new Date(fechaRegistro) : new Date())
      .input('Conversion', sql.DateTime, conversion ? new Date(conversion) : null)
      .input('VencimientoPlan', sql.Date, vencimientoPlan ? new Date(vencimientoPlan) : null)
      .input('Sede', sql.NVarChar(50), sede)
      .input('PlanFirmado', sql.NVarChar(10), planFirmado || null)
      .input('RUT', sql.NVarChar(20), rut || null)
      .input('FechaNacimiento', sql.Date, fechaNacimiento ? new Date(fechaNacimiento) : null)
      .input('DiasActivos', sql.Int, diasActivos || 0)
      .input('CorreoElectronico', sql.NVarChar(100), correoElectronico)
      .input('Genero', sql.NVarChar(20), genero || null)
      .input('Edad', sql.Int, edad || null)
      .input('TelefonoMovil', sql.NVarChar(20), telefonoMovil || null)
      .input('UltimaPresencia', sql.DateTime, ultimaPresencia ? new Date(ultimaPresencia) : null)
      .input('ValorPlan', sql.Int, valorPlan || null)
      .input('IdVendedor', sql.Int, idVendedor)  // <-- Aquí pasas el id vendedor real
      .query(`
        INSERT INTO Clientes (
          Nombre, SegundoNombre, Apellido, SegundoApellido, PlanC, FechaRegistro, Conversion, VencimientoPlan,
          Sede, PlanFirmado, RUT, FechaNacimiento, DiasActivos, CorreoElectronico, Genero, Edad, TelefonoMovil,
          UltimaPresencia, ValorPlan, IdVendedor
        ) VALUES (
          @Nombre, @SegundoNombre, @Apellido, @SegundoApellido, @PlanC, @FechaRegistro, @Conversion, @VencimientoPlan,
          @Sede, @PlanFirmado, @RUT, @FechaNacimiento, @DiasActivos, @CorreoElectronico, @Genero, @Edad, @TelefonoMovil,
          @UltimaPresencia, @ValorPlan, @IdVendedor
        )
      `);

    res.redirect('/vendedor/dashboard');

  } catch (error) {
    console.error('Error en crearClientePost:', error);
    res.status(500).send('Error al crear cliente');
  }
};

exports.historialClientes = async (req, res) => {
  const filePath = path.join(__dirname, '../views/Front/dist/html/demo10/vendedor/historialClientes.html');
  res.sendFile(filePath);
};

exports.historialClientesData = async (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'No autorizado' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const idVendedor = decoded.id;

    const pool = await db.connect();

    const result = await pool.request()
      .input('idVendedor', sql.Int, idVendedor)
      .query(`
        SELECT 
          C.IdCliente,
          C.Nombre,
          C.SegundoNombre,
          C.Apellido,
          C.SegundoApellido,
          C.CorreoElectronico,
          C.TelefonoMovil,
          C.FechaRegistro,
          A.nombre_completo AS NombreVendedor
        FROM Clientes C
        INNER JOIN Administrativos A ON C.IdVendedor = A.id
        WHERE C.IdVendedor = @idVendedor
        ORDER BY C.FechaRegistro DESC
      `);

    res.json(result.recordset);
  } catch (error) {
    console.error('Error en historialClientesData:', error);
    res.status(500).json({ error: 'Error al cargar historial de clientes' });
  }
};

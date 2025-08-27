const db = require('../models/db');
const { obtenerClientesPorSede } = require('../services/evoServices');
const tokensPorSede = require('../services/evotokens');


exports.sincronizarClientesDesdeEvo = async (req, res) => {
  try {
    const pool = await db.connect();
    let totalInsertados = 0;
    let totalActualizados = 0;

    for (const [sede, token] of Object.entries(tokensPorSede)) {
      console.log(`\n🔄 Sincronizando clientes para sede: ${sede}`);
      const clientes = await obtenerClientesPorSede(sede, token);

      let insertados = 0;
      let actualizados = 0;

      for (const c of clientes) {
        // Seguridad: validar membresía activa aunque ya se filtró en la consulta
        if (c.membershipStatus?.toLowerCase() !== 'active') continue;

        const idEvo = c.idMember;
        const nombre = c.firstName?.trim() || null;
        const apellido = c.lastName?.trim() || null;

        const correo = c.contacts?.find(ct => [3, 4, 5].includes(ct.idContactType))?.description?.trim() || null;
        const movil = c.contacts?.find(ct => [1, 2].includes(ct.idContactType))?.description?.trim() || null;

        const nacimiento = c.birthDate ? new Date(c.birthDate) : null;
        const edad = nacimiento ? new Date().getFullYear() - nacimiento.getFullYear() : null;
        const rut = c.document || null;
        const genero = c.gender || null;
        const fechaRegistro = c.registerDate ? new Date(c.registerDate) : null;
        const ultimaPresencia = c.lastAccessDate ? new Date(c.lastAccessDate) : null;
        const diasActivos = (fechaRegistro && ultimaPresencia)
          ? Math.floor((ultimaPresencia - fechaRegistro) / (1000 * 60 * 60 * 24))
          : null;

        const membresia = c.membership || {};
        const plan = membresia.name || null;
        const planFirmado = membresia.signedTerms ? 'Sí' : 'No';
        const vencimiento = membresia.endDate ? new Date(membresia.endDate) : null;
        const conversion = membresia.startDate ? new Date(membresia.startDate) : null;
        const valorPlan = membresia.originalValue || null;

        const idVendedor = null; // Si no tienes dato, null

        // Comprobar existencia en DB
        const check = await pool.request()
          .input("idEvo", db.sql.Int, idEvo)
          .query("SELECT IdCliente FROM Clientes WHERE IdEvo = @idEvo");

        const request = pool.request()
          .input("idEvo", db.sql.Int, idEvo)
          .input("nombre", db.sql.NVarChar, nombre)
          .input("segundoNombre", db.sql.NVarChar, null)
          .input("apellido", db.sql.NVarChar, apellido)
          .input("segundoApellido", db.sql.NVarChar, null)
          .input("planC", db.sql.NVarChar, plan)
          .input("fechaRegistro", db.sql.DateTime, fechaRegistro)
          .input("conversion", db.sql.DateTime, conversion)
          .input("vencimientoPlan", db.sql.DateTime, vencimiento)
          .input("sede", db.sql.NVarChar, sede)
          .input("planFirmado", db.sql.NVarChar, planFirmado)
          .input("rut", db.sql.NVarChar, rut)
          .input("fechaNacimiento", db.sql.DateTime, nacimiento)
          .input("diasActivos", db.sql.Int, diasActivos)
          .input("correoElectronico", db.sql.NVarChar, correo)
          .input("genero", db.sql.NVarChar, genero)
          .input("edad", db.sql.Int, edad)
          .input("telefonoMovil", db.sql.NVarChar, movil)
          .input("ultimaPresencia", db.sql.DateTime, ultimaPresencia)
          .input("valorPlan", db.sql.Int, valorPlan)
          .input("idVendedor", db.sql.Int, idVendedor);

        if (check.recordset.length === 0) {
          await request.query(`
            INSERT INTO Clientes (
              IdEVO, Nombre, SegundoNombre, Apellido, SegundoApellido,
              PlanC, FechaRegistro, Conversion, VencimientoPlan, Sede, PlanFirmado,
              RUT, FechaNacimiento, DiasActivos, CorreoElectronico, Genero, Edad,
              TelefonoMovil, UltimaPresencia, ValorPlan, IdVendedor
            ) VALUES (
              @idEvo, @nombre, @segundoNombre, @apellido, @segundoApellido,
              @planC, @fechaRegistro, @conversion, @vencimientoPlan, @sede, @planFirmado,
              @rut, @fechaNacimiento, @diasActivos, @correoElectronico, @genero, @edad,
              @telefonoMovil, @ultimaPresencia, @valorPlan, @idVendedor
            )
          `);
          insertados++;
        } else {
          await request.query(`
            UPDATE Clientes SET
              Nombre = @nombre,
              SegundoNombre = @segundoNombre,
              Apellido = @apellido,
              SegundoApellido = @segundoApellido,
              PlanC = @planC,
              FechaRegistro = @fechaRegistro,
              Conversion = @conversion,
              VencimientoPlan = @vencimientoPlan,
              Sede = @sede,
              PlanFirmado = @planFirmado,
              RUT = @rut,
              FechaNacimiento = @fechaNacimiento,
              DiasActivos = @diasActivos,
              CorreoElectronico = @correoElectronico,
              Genero = @genero,
              Edad = @edad,
              TelefonoMovil = @telefonoMovil,
              UltimaPresencia = @ultimaPresencia,
              ValorPlan = @valorPlan,
              IdVendedor = @idVendedor
            WHERE IdEvo = @idEvo
          `);
          actualizados++;
        }
      }

      totalInsertados += insertados;
      totalActualizados += actualizados;

      console.log(`✅ Finalizada sincronización para sede: ${sede}. Insertados: ${insertados}, Actualizados: ${actualizados}`);
    }

    res.send(`✅ Sincronización completa de todas las sedes. Total Insertados: ${totalInsertados}, Actualizados: ${totalActualizados}`);
  } catch (error) {
    console.error("❌ Error en la sincronización general:", error);
    res.status(500).send("❌ Error en la sincronización general.");
  }
};



exports.sincronizarAsistenciasDesdeEvo = async (req, res) => {
  try {
    const pool = await db.connect();
    const asistencias = await obtenerAsistencias();

    for (const a of asistencias) {
      const idEvo = a.memberId;
      const fecha = new Date(a.date);
      const horaEntrada = a.entry ? a.entry.substring(0, 8) : null;
      const horaSalida = a.exit ? a.exit.substring(0, 8) : null;

      const result = await pool.request()
        .input('idEvo', db.sql.Int, idEvo)
        .query('SELECT IdCliente FROM Clientes WHERE IdEvo = @idEvo');

      if (result.recordset.length > 0) {
        const idCliente = result.recordset[0].IdCliente;

        const exist = await pool.request()
          .input('idCliente', db.sql.Int, idCliente)
          .input('fecha', db.sql.Date, fecha)
          .query('SELECT IdAsistencia FROM Asistencias WHERE IdCliente = @idCliente AND Fecha = @fecha');

        if (exist.recordset.length === 0) {
          await pool.request()
            .input('idCliente', db.sql.Int, idCliente)
            .input('fecha', db.sql.Date, fecha)
            .input('horaEntrada', db.sql.Time, horaEntrada)
            .input('horaSalida', db.sql.Time, horaSalida)
            .query(`
              INSERT INTO Asistencias (IdCliente, Fecha, HoraEntrada, HoraSalida)
              VALUES (@idCliente, @fecha, @horaEntrada, @horaSalida)
            `);
        }
      }
    }

    res.send('✅ Asistencias sincronizadas correctamente.');
  } catch (err) {
    console.error('❌ Error al sincronizar asistencias:', err);
    res.status(500).send('Error al sincronizar asistencias');
  }
};

exports.sincronizarVentasDesdeEvo = async (req, res) => {
  try {
    const pool = await db.connect();
    const ventas = await obtenerVentas();

    for (const v of ventas) {
      const idEvo = v.memberId;
      const fechaVenta = new Date(v.date);
      const producto = v.product?.name || null;
      const monto = v.total;
      const tipo = v.paymentMethod;

      const result = await pool.request()
        .input('idEvo', db.sql.Int, idEvo)
        .query('SELECT IdCliente FROM Clientes WHERE IdEvo = @idEvo');

      if (result.recordset.length > 0) {
        const idCliente = result.recordset[0].IdCliente;

        const exist = await pool.request()
          .input('idCliente', db.sql.Int, idCliente)
          .input('fechaVenta', db.sql.Date, fechaVenta)
          .input('producto', db.sql.NVarChar, producto)
          .query('SELECT IdVenta FROM Ventas WHERE IdCliente = @idCliente AND FechaVenta = @fechaVenta AND Producto = @producto');

        if (exist.recordset.length === 0) {
          await pool.request()
            .input('idCliente', db.sql.Int, idCliente)
            .input('fechaVenta', db.sql.Date, fechaVenta)
            .input('producto', db.sql.NVarChar, producto)
            .input('monto', db.sql.Int, monto)
            .input('tipo', db.sql.NVarChar, tipo)
            .query(`
              INSERT INTO Ventas (IdCliente, FechaVenta, Producto, Monto, Tipo)
              VALUES (@idCliente, @fechaVenta, @producto, @monto, @tipo)
            `);
        }
      }
    }

    res.send('✅ Ventas sincronizadas correctamente.');
  } catch (err) {
    console.error('❌ Error al sincronizar ventas:', err);
    res.status(500).send('Error al sincronizar ventas');
  }
};

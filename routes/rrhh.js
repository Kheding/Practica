const express = require('express');
const router = express.Router();
const rrhhController = require('../controllers/rrhhController');
const documentosController = require('../controllers/documentoController');
const upload = require('../middleware/upload');
const documentoController = require('../controllers/documentoController');
const { isAuthenticated, isRecursosHumanos } = require('../middleware/authMiddleware');

// Dashboard
router.get('/dashboard', isAuthenticated, isRecursosHumanos, rrhhController.dashboard);
router.get('/dashboardData', isAuthenticated, isRecursosHumanos, rrhhController.dashboardData);

// Gestión de Empleados
router.get('/empleados/agregar', isAuthenticated, isRecursosHumanos, rrhhController.formCrearEmpleado);
router.get('/empleados/vista', isAuthenticated, isRecursosHumanos, rrhhController.vistaListarEmpleados);
router.get('/empleados/editar/:id', isAuthenticated, isRecursosHumanos, rrhhController.formEditarEmpleado);
router.get('/administrativos', isAuthenticated, isRecursosHumanos, rrhhController.listarAdministrativosAPI);
router.post('/nuevo', isAuthenticated, isRecursosHumanos, rrhhController.crearEmpleadoPost);
router.delete('/eliminarEmpleado/:id', isAuthenticated, isRecursosHumanos, rrhhController.eliminarEmpleado);

// Gestión de Clientes
router.get('/clientes/agregar', isAuthenticated, isRecursosHumanos, rrhhController.vistaformCrearCliente);
router.get('/clientes/vista', isAuthenticated, isRecursosHumanos, rrhhController.vistaListarClientes);
router.get('/clientes/:sede', isAuthenticated, isRecursosHumanos, rrhhController.listarPorSede);
router.post('/añadirCliente', isAuthenticated, isRecursosHumanos, rrhhController.crearCliente);
router.get('/obtenerNotas', isAuthenticated, isRecursosHumanos, rrhhController.obtenerNotasCliente);
router.post('/añadirNota', isAuthenticated, isRecursosHumanos, rrhhController.agregarNotaCliente);
router.get('/membresias', isAuthenticated, isRecursosHumanos, rrhhController.estadoMembresia);

// Gestión de Documentos
router.get('/documentos/listar', isAuthenticated, isRecursosHumanos, rrhhController.obtenerDocumentos);
router.post('/documentos/subir', isAuthenticated, isRecursosHumanos, upload.array('documentos', 10), rrhhController.subirDocumento); // hasta 10 archivos
router.get('/documentos/subidos', isAuthenticated, isRecursosHumanos, rrhhController.obtenerDocumentosSubidosPorRRHH);
router.post('/documentos/marcar-descargado/:id', rrhhController.marcarComoDescargado);
router.post('/documentos/marcar-visto/:id', isAuthenticated, rrhhController.marcarVisto);
// Gestión de Asistencias
router.get('/asistencia', isAuthenticated, isRecursosHumanos, rrhhController.obtenerAsistencia);

// Gestión de Solicitudes
router.get('/solicitudes', isAuthenticated, isRecursosHumanos, rrhhController.obtenerSolicitudes);
router.post('/crearSolicitud', isAuthenticated, isRecursosHumanos, rrhhController.crearSolicitud);
router.post('/actualizarSolicitud', isAuthenticated, isRecursosHumanos, rrhhController.actualizarEstado);

// Gestión de Incidencias
router.get('/incidencias', isAuthenticated, isRecursosHumanos, rrhhController.verIncidencias);
router.post('/incidencias/:idIncidencia/estado', isAuthenticated, isRecursosHumanos, rrhhController.actualizarEstadoIncidencia);

// Rutas para vistas HTML
// Empleados


// Asistencia
router.get('/asistencia/vista', isAuthenticated, isRecursosHumanos, rrhhController.vistaAsistencia);

// Documentos
// Documentos subidos por RRHH (vistas)
router.get('/documentos/vista/listar', isAuthenticated, isRecursosHumanos, rrhhController.vistaDocumentosEmpleado);
router.get('/documentos/vista/crear', isAuthenticated, isRecursosHumanos, rrhhController.vistaCrearDocumento);
router.get('/documentos/vista/subidos', isAuthenticated, isRecursosHumanos, rrhhController.vistaDocumentosSubidosRRHH);


// Solicitudes
router.get('/solicitudes/vista', isAuthenticated, isRecursosHumanos, rrhhController.vistaSolicitudes);
router.get('/solicitudes/crear', isAuthenticated, isRecursosHumanos, rrhhController.vistaCrearSolicitud);
// Membresías
router.get('/membresias/vista', isAuthenticated, isRecursosHumanos, rrhhController.vistaMembresias);

// Incidencias
router.get('/incidencias/vista', isAuthenticated, isRecursosHumanos, rrhhController.vistaIncidencias);

// Reportes
router.get('/reportes/vista', isAuthenticated, isRecursosHumanos, rrhhController.vistaReportes);
router.get('/reportes/exportar/:tipo/:formato', isAuthenticated, isRecursosHumanos, rrhhController.exportarReporte);

// Calendario
router.get('/calendario/vista', isAuthenticated, isRecursosHumanos, rrhhController.vistaCalendario);
router.post('/agenda/crear', isAuthenticated, isRecursosHumanos, rrhhController.crearEventoAgenda);
router.get('/agenda/notificaciones', isAuthenticated, isRecursosHumanos, rrhhController.obtenerNotificacionesAgenda);
router.post('/agenda/notificado/:id', isAuthenticated, isRecursosHumanos, rrhhController.marcarEventoNotificado);


module.exports = router;


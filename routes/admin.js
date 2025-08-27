const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const db = require('../models/db');
const multer = require('multer');

const documentosController = require('../controllers/documentoController');
const upload = require('../middleware/upload');
const documentoController = require('../controllers/documentoController');

const { isAuthenticated, isAdmin, isGerenteOperaciones } = require('../middleware/authMiddleware');

// Ruta Para exportar datos a Excel
router.post('/importar-clientes', upload.single('archivoExcel'), adminController.importarClientesExcel);
router.post('/exportar-clientes', isAuthenticated, isAdmin, adminController.exportarClientesExcel);
// Rutas para el panel
router.get('/panelData', isAuthenticated, isAdmin, adminController.panel);
router.get('/panel', isAuthenticated, isAdmin, adminController.mostrarPanel);
// GEstion de Clientes - Empleados - Administativos
router.get('/crearUsuario', isAuthenticated, isAdmin, adminController.formCrear);
router.post('/crearUsuario', isAuthenticated, isAdmin, adminController.crearUsuario);
router.get('/editarPersonal', isAuthenticated, isAdmin, adminController.formEditarP);
router.get('/listarPersonal', isAuthenticated, isAdmin, adminController.listarPersonal);
router.get('/listarPersonalAPI',isAuthenticated, isAdmin, adminController.listarPersonalAPI);
router.get('/listarClientes', isAuthenticated, isAdmin, adminController.listarClientes);
router.get('/apiListarClientes', isAuthenticated, isAdmin, adminController.apiListarClientes);
router.delete('/apiEliminarPersonal/:id', isAuthenticated, isAdmin, adminController.apiEliminarPersonal);
router.get('/apiEditarPersonal/:id', isAuthenticated, isAdmin, adminController.apiEditarPersonal);
router.post('/apiEditarPersonalPost/:id', isAuthenticated, isAdmin, adminController.apiEditarPersonalPost);
router.get('/crearCliente', isAuthenticated, isAdmin, adminController.formCrearCliente);
router.post('/crearCliente', isAuthenticated, isAdmin, adminController.crearCliente);
router.get('/editarCliente', isAuthenticated, isAdmin, adminController.formEditarCliente);
router.get('/apiEditarCliente/:idCliente', isAuthenticated, isAdmin, adminController.apiEditarCliente);
router.post('/apiEditarClientePost/:idCliente', isAuthenticated, isAdmin, adminController.apiEditarClientePost); 
router.delete('/apiEliminarCliente/:IdCliente', isAuthenticated, isAdmin, adminController.apiEliminarCliente);
// Solicitudes
router.get('/crearSolicitud/vista', isAuthenticated, isAdmin, adminController.vistaCrearSolicitud);
router.post('/crearSolicitud', isAuthenticated, isAdmin, adminController.crearSolicitud);
router.get('/solicitudes/vista', isAuthenticated, isAdmin, adminController.vistaObtenerSolicitudes);
router.get('/solicitudes', isAuthenticated, isAdmin, adminController.obtenerSolicitudes);
// Documentos
router.get('/misDocumentos/vista', isAuthenticated, isAdmin, adminController.vistaDocumentos);
router.get('/documentos', isAuthenticated, isAdmin, adminController.obtenerDocumentos);
router.get('/subirDocumentos/vista', isAuthenticated, isAdmin, adminController.vistaSubirDocumento);
router.post('/subirDocumento', isAuthenticated, isAdmin, upload.array('documentos', 10), adminController.subirDocumento);
//Planes de Mejora
router.get('/crearPlanMejora/vista', isAuthenticated, isAdmin, adminController.vistaCrearPlanMejora);
router.post('/crearPlanMejora', isAuthenticated, isAdmin, adminController.crearPlanMejora);
router.get('/planesMejora/vista', isAuthenticated, isAdmin, adminController.vistaPlanesMejora);
router.get('/planesMejora', isAuthenticated, isAdmin, adminController.planesMejora);
router.get('/api/administrativos', isAuthenticated, isAdmin, adminController.apiAdministrativos);
// GESTION DE CONTEOS PARA GRAFICOS
router.get('/contarClientes', isAuthenticated, isAdmin, adminController.contarClientes);
router.get('/contarCapacitaciones', isAuthenticated, isAdmin, adminController.contarCapacitaciones);
router.get('/contarAdministrativos', isAuthenticated, isAdmin, adminController.contarAdministrativos);
router.get('/clientes-por-periodo-sede', adminController.obtenerClientesPorPeriodoYSede);
// REportes
router.get('/reportes/vista', isAuthenticated, isAdmin, adminController.vistaReportes);
router.get('/reportes', isAuthenticated, isAdmin, adminController.reportesAdministrador);
router.get('/incidencias/vista', isAuthenticated, isAdmin, adminController.vistaIncidencias);
router.get('/incidencias', isAuthenticated, isAdmin, adminController.incidencias);
router.get('/resumenMensual', isAuthenticated, isAdmin, adminController.obtenerResumenMensual);
router.get('/resumenComparativo', isAuthenticated, isAdmin, adminController.compararResumenMensual);
router.get('/generarResumen', isAuthenticated, isAdmin, adminController.generarResumenMensual);



module.exports = router;
   
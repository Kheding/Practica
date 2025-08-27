const express = require('express');
const router = express.Router();
const sedeController = require('../controllers/sedeController');
const db = require('../models/db');
const { isAuthenticated, isResponsable } = require('../middleware/authMiddleware');
const jwt = require('jsonwebtoken');

router.get('/dashboard', isAuthenticated,isResponsable, sedeController.dashboard);
// CRUD DE CLIENTES
router.get('/crear', isAuthenticated,isResponsable, sedeController.formCrearCliente);
router.post('/crearCliente', isAuthenticated,isResponsable, sedeController.formCrearClientePost);
router.get('/editarCliente/:idCliente', isAuthenticated, isResponsable, sedeController.formEditarCliente);
router.get('/apiEditarCliente/:idCliente', isAuthenticated,isResponsable, sedeController.apiEditarCliente);
router.post('/apiEditarClientePost/:idCliente', isAuthenticated,isResponsable, sedeController.apiEditarClientePost);
router.get('/listar', isAuthenticated,isResponsable, sedeController.listarClientes);
router.post('/apiListarClientes', isAuthenticated,isResponsable, sedeController.apiListarClientes);
router.delete('/apiEliminarCliente/:idCliente', isAuthenticated,isResponsable, sedeController.apiEliminarCliente);
// DATOS DE CLIENTES
router.get('/reportesVentas', isAuthenticated,isResponsable, sedeController.reportesVentas);
router.post('/apiReportesVentas', isAuthenticated,isResponsable, sedeController.apiReportesVentas);
router.get('/historialA', isAuthenticated,isResponsable, sedeController.historialAsistencia);
// CRUD DE STAFF
router.get('/listarStaff', isAuthenticated, isResponsable, sedeController.listarStaff);
router.get('/listarStaffAPI', isAuthenticated, isResponsable, sedeController.listarStaffAPI);
router.get('/crearStaff', isAuthenticated, isResponsable, sedeController.formCrearStaff);
router.post('/crearStaffPost', isAuthenticated, isResponsable, sedeController.crearStaffPost);
//DATOS DEL DASHBOARD
router.get('/api/dashboard-data', isAuthenticated, isResponsable, sedeController.dashboardData);
// Solicitud a RRHH
router.get('/crearSolicitud', isAuthenticated, isResponsable , sedeController.formCrearSolicitud);
router.post('/crearSolicitudPost', isAuthenticated, isResponsable, sedeController.crearSolicitud);
// Proyectos
router.get('/listarProyectos', isAuthenticated, isResponsable, sedeController.listarProyectos);
router.get('/apiProyectos', isAuthenticated, isResponsable, sedeController.apiProyectos)
router.get('/crearProyecto', isAuthenticated, isResponsable, sedeController.formCrearProyecto);
router.post('/crearProyecto', isAuthenticated, isResponsable, sedeController.crearProyecto);
router.post('/finalizarProyecto/:idProyecto', isAuthenticated, isResponsable, sedeController.finalizarProyecto);

// Incidencias
router.get('/incidencias', isAuthenticated, isResponsable, sedeController.verIncidencias);
router.get('/apiIncidencias', isAuthenticated, isResponsable, sedeController.apiListarIncidencias);
router.post('/incidencias', isAuthenticated, isResponsable, sedeController.registrarIncidencia);

// INFORMES
router.get('/informeDiarioExcel', isAuthenticated, isResponsable, sedeController.generarInformeDiarioExcel);
router.get('/informeSemanalExcel', isAuthenticated, isResponsable, sedeController.generarInformeSemanalExcel);





module.exports = router;
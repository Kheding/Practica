const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');
const { isAuthenticated, isStaff } = require('../middleware/authMiddleware');

// Dashboard
router.get('/dashboard', isAuthenticated, isStaff, staffController.dashboard);
router.get('/dashboardData', isAuthenticated, isStaff, staffController.dashboardData);

// Clientes
router.get('/crear', isAuthenticated, isStaff, staffController.formcrearCliente);
router.post('/crearCliente', isAuthenticated, isStaff, staffController.crearClientePost);
router.get('/editarCliente', isAuthenticated, isStaff, staffController.formEditarCliente);
router.get('/apiEditarCliente/:idCliente', isAuthenticated, isStaff, staffController.apiEditarCliente);
router.post('/apiEditarClientePost/:idCliente', isAuthenticated, isStaff, staffController.apiEditarClientePost);
router.delete('/apiEliminarCliente/:idCliente', isAuthenticated, isStaff, staffController.apiEliminarCliente);
router.get('/listarClientes', isAuthenticated, isStaff, staffController.listarClientes);
router.get('/apiListarClientes', isAuthenticated, isStaff, staffController.apiListarClientes);

// Agenda
router.get('/crearAgenda', isAuthenticated, isStaff, staffController.formCrearAgenda);
router.get('/verAgenda', isAuthenticated, isStaff, staffController.verAgenda);
router.get('/apiListarAgenda', isAuthenticated, isStaff, staffController.apiListarAgenda);
router.post('/agendarFecha', isAuthenticated, isStaff, staffController.agendarFecha);
router.get('/apiListarClientesClase/:idAgenda', isAuthenticated, isStaff, staffController.apiListarClientesClase);
router.post('/apiMarcarAsistencia', isAuthenticated, isStaff, staffController.apiMarcarAsistencia);

// Solicitudes
router.get('/crearSolicitud', isAuthenticated, isStaff, staffController.formCrearSolicitud);
router.post('/crearSolicitud', isAuthenticated, isStaff, staffController.crearSolicitud);
router.get('/verSolicitudes', isAuthenticated, isStaff, staffController.verSolicitudes);
router.get('/apiListarSolicitudes', isAuthenticated, isStaff, staffController.apiListarSolicitudes);

module.exports = router;

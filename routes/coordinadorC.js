const express = require('express');
const router = express.Router();
const coordinadorController = require('../controllers/coordinadorController');
const { isAuthenticated, isCoordinador } = require('../middleware/authMiddleware');

// Dashboard principal y KPIs
router.get('/dashboard', isAuthenticated, isCoordinador, coordinadorController.getDashboard);
router.get('/dashboardData', isAuthenticated, isCoordinador, coordinadorController.kpiPanel);

// Crear cliente
router.get('/crear', isAuthenticated, isCoordinador, coordinadorController.formcrearCliente);
router.post('/crearCliente', isAuthenticated, isCoordinador, coordinadorController.crearClientePost);

// Comparar vs metas
router.get('/comparar-vs-metas', isAuthenticated, isCoordinador, coordinadorController.vistaCompararVsMetas);
router.get('/api/comparar-vs-metas', isAuthenticated, isCoordinador, coordinadorController.compararVsMetas);

// Bajo rendimiento
router.get('/bajo-rendimiento', isAuthenticated, isCoordinador, coordinadorController.vistaBajoRendimiento);
router.get('/api/bajo-rendimiento', isAuthenticated, isCoordinador, coordinadorController.reporteBajoRendimiento);

// Focos débiles
router.get('/focos-debiles', isAuthenticated, isCoordinador, coordinadorController.vistaFocosDebiles);
router.get('/api/focos-debiles', isAuthenticated, isCoordinador, coordinadorController.focosDebiles);

// Diagnóstico problema
router.get('/diagnostico-problema', isAuthenticated, isCoordinador, coordinadorController.vistaDiagnosticoProblema);
router.get('/api/diagnostico-problema', isAuthenticated, isCoordinador, coordinadorController.diagnosticoProblema);

// Rendimiento vendedores
router.get('/rendimiento-vendedores', isAuthenticated, isCoordinador, coordinadorController.vistaRendimientoVendedores);
router.get('/api/rendimiento-vendedores', isAuthenticated, isCoordinador, coordinadorController.rendimientoVendedores);

router.get('/resumenMensual', isAuthenticated, isCoordinador, coordinadorController.obtenerResumenMensual);
router.get('/resumenComparativo', isAuthenticated, isCoordinador, coordinadorController.compararResumenMensual);

module.exports = router;

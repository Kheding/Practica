const express = require('express');
const router = express.Router();
const vendedoresController = require('../controllers/vendedoresController');
const db = require('../models/db');
const { isAuthenticated, isVendedores } = require('../middleware/authMiddleware');

// Ejemplo de rutas usando los controladores
router.get('/dashboard', isAuthenticated, isVendedores, vendedoresController.dashboardVendedor);
router.get('/dashboard/data', isAuthenticated, isVendedores, vendedoresController.dashboardVendedorData);

router.get('/crear-venta-producto/vista', isAuthenticated, isVendedores, vendedoresController.crearVentaProductoGet);
router.get('/crear-venta-producto/data', isAuthenticated, isVendedores, vendedoresController.crearVentaProductoData);
router.post('/crear-venta-producto', isAuthenticated, isVendedores, vendedoresController.crearVentaProductoPost);

router.get('/historial-ventas', isAuthenticated, isVendedores, vendedoresController.historialVentas);
router.get('/historial-ventas/data', isAuthenticated, isVendedores, vendedoresController.historialVentasData);

router.get('/crear-cliente', isAuthenticated, isVendedores, vendedoresController.crearClienteGet);
router.get('/crear-cliente/data', isAuthenticated, isVendedores, vendedoresController.crearClienteData);
router.post('/crear-cliente', isAuthenticated, isVendedores, vendedoresController.crearClientePost);

router.get('/historial-clientes', isAuthenticated, isVendedores, vendedoresController.historialClientes);
router.get('/historial-clientes/data', isAuthenticated, isVendedores, vendedoresController.historialClientesData);


module.exports = router;
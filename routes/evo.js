const express = require('express');
const router = express.Router();
const evoController = require('../controllers/evoController');
const { isAuthenticated, isAdmin } = require('../middleware/authMiddleware');

router.get('/sync-clientes', isAuthenticated, isAdmin, evoController.sincronizarClientesDesdeEvo);

module.exports = router;

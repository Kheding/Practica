const express = require('express');
const router = express.Router();
const proyectosController = require('../controllers/proyectosController');

// Definir ruta para obtener proyectos
router.get('/proyectos', proyectosController.obtenerProyectos);

module.exports = router;
const express = require('express');
const router = express.Router();
const cuentasController = require('../controllers/cuentasController');
const db = require('../models/db');

const { isAuthenticated } = require('../middleware/authMiddleware');

//Vista Perfil, data y editar datos
router.get('/perfil', isAuthenticated, cuentasController.getPerfil);
router.get('/apiPerfil', isAuthenticated, cuentasController.PerfilData)
router.post('/apiEditarDatosAdministrativo', isAuthenticated, cuentasController.apiEditarDatosAdministrativo);

router.get('/apiEmail', isAuthenticated, cuentasController.apiGetEmailPersonal);
router.get('/apiClave', isAuthenticated, cuentasController.apiGetClave);
router.post('/apiEditarEmail', isAuthenticated, cuentasController.apiPostEditarEmailPersonal);
router.post('/apiEditarClave', isAuthenticated, cuentasController.apiPostEditarClave);

module.exports = router;
const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const documentoController = require('../controllers/documentoController');

router.post('/empleados/:id/documento', upload.single('documento'), documentoController.subirDocumento);

module.exports = router;

const express = require('express');
const router = express.Router();
const idiomaController = require('../controllers/idiomaController');

router.get('/traduccion/:lang', idiomaController.getTranslation);

module.exports = router;
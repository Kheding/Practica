const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const path = require('path');


// Redirigir '/' a la página estática de login
router.get('/', authController.formLogin);

// POST login
router.post('/login', authController.login);
router.post('/logout', authController.logout);
// Logout
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error al cerrar sesión:', err);
    } else {
      res.redirect('/');
    }
  });
});

module.exports = router;
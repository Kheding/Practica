const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/authMiddleware');

router.get('/profile', isAuthenticated, (req, res) => {
  const user = req.user;
  res.json({
    id: user.id,
    nombre_completo: user.nombre_completo,
    email_personal: user.email_personal,
    rol_id: user.rol_id,
    sede: user.sede,
    avatar: '/assets/media/avatars/300-2.png' // Puedes hacer esto dinámico si lo tienes
  });
});

module.exports = router;
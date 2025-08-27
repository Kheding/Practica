const jwt = require("jsonwebtoken");
const SECRET = process.env.JWT_SECRET;

// Middleware general para verificar autenticación
// authMiddleware.js
const isAuthenticated = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) {
        if (req.headers.accept?.includes('application/json')) {
            return res.status(401).json({ error: 'Token faltante' });
        }
        return res.redirect('/login'); // solo si viene del navegador
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        if (req.headers.accept?.includes('application/json')) {
            return res.status(403).json({ error: 'Token inválido' });
        }
        return res.redirect('/login');
    }
};


// Generador de middlewares por rol
const verificarRol = (rolEsperado, nombreRol) => {
  return (req, res, next) => {
    if (req.user && req.user.rol_id === rolEsperado) {
      return next();
    }
    return res.status(403).send(`Acceso solo para ${nombreRol}`);
  };
};

// Middlewares de roles específicos
const isAdmin = verificarRol(1, "administradores");
const isGerenteOperaciones = verificarRol(2, "gerentes de operaciones");
const isJefeOperaciones = verificarRol(3, "jefes de operaciones");
const isRecursosHumanos = verificarRol(4, "recursos humanos");
const isCoordinador = verificarRol(5, "coordinadores");
const isResponsable = verificarRol(6, "responsables");
const isVendedores = verificarRol(7, "vendedores");
const isStaff = verificarRol(8, "personal de staff");

module.exports = {
  isAuthenticated,
  isAdmin,
  isGerenteOperaciones,
  isJefeOperaciones,
  isRecursosHumanos,
  isCoordinador,
  isResponsable,
  isVendedores,
  isStaff
};

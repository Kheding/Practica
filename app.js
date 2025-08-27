require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const app = express();
const db = require('./models/db');
const cookieParser = require('cookie-parser');
app.use(cookieParser());
app.use(express.json());
app.set('trust proxy', true);

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/locales', express.static(path.join(__dirname, 'locales')));

// EVO API 
const evoRoutes = require('./routes/evo');
app.use('/evo', evoRoutes);

const adminRoutes = require('./routes/admin');
const authRoutes = require('./routes/auth');
const sedeRoutes = require('./routes/rSede');
const staffRoutes = require('./routes/staff');
const coordinadorRoutes = require('./routes/coordinadorC');
const rrhhRoutes = require('./routes/rrhh');
const documentoRoutes = require('./routes/documentos');
const userRoutes = require('./routes/user');
const cuentasRoutes = require('./routes/cuentas');
const joRoutes = require('./routes/jo');
const idiomaRoutes = require('./routes/idioma');
const vendedorRoutes = require('./routes/vendedores');

app.use('/api/user', userRoutes);
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '/public')));
app.use(express.static('front/dist/html/demo10'));
app.use(express.static(path.join(__dirname, 'views', 'Front' )));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: true } // true si usas HTTPS en producción
}));


app.use('/html', express.static(path.resolve(__dirname,'views', 'Front', 'dist', 'html')));
app.use('/assets', express.static(path.join(__dirname, 'views', 'Front', 'dist', 'assets')));
app.use('/', authRoutes);
app.use('/admin', adminRoutes);
app.use('/rs', sedeRoutes);
app.use('/staff', staffRoutes);
app.use('/coordinador', coordinadorRoutes);
app.use('/rrhh', rrhhRoutes);
app.use('/api', documentoRoutes);
app.use('/cuentas', cuentasRoutes);
app.use('/jo', joRoutes)
app.use('/idioma', idiomaRoutes)
app.use('/vendedor', vendedorRoutes);
// Para modo desarrollo


module.exports = app;
const express = require('express');
const joController = require('../controllers/joController');
const { isAuthenticated, isJefeOperaciones } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/dashboard', isAuthenticated, isJefeOperaciones, joController.panel);
router.get('/dashboardData', isAuthenticated, isJefeOperaciones, joController.dashboardData);
// Documentos
router.get('/documentos/vistaListar', isAuthenticated, isJefeOperaciones, joController.vistaDocumentos);
router.get('/documentos/vistaAgregar', isAuthenticated, isJefeOperaciones, joController.vistaSubirDocumento);
router.get('/documentos/listar', isAuthenticated, isJefeOperaciones, joController.obtenerDocumentosPorSede);
router.post('/documentos/agregar', isAuthenticated, isJefeOperaciones, joController.subirDocumento);
//METAS
router.get('/metas', isAuthenticated, isJefeOperaciones, joController.vistaCumplimientoMetas);
router.get('/cumplimiento-metas', isAuthenticated, isJefeOperaciones, joController.cumplimientoMetasPorSede);
//Desempeño
router.get('/desempeno', isAuthenticated, isJefeOperaciones, joController.vistaDesempenoEquipos);
router.get('/desempeno-equipos', isAuthenticated, isJefeOperaciones, joController.desempenoEquiposPorSede);
// Reportes 
router.get('/reportes', isAuthenticated, isJefeOperaciones, joController.vistaReportesOperativos);
router.get('/reportes-operativos', isAuthenticated, isJefeOperaciones, joController.reportesOperativos);
// Incidencias
router.get('/incidencias', isAuthenticated, isJefeOperaciones, joController.vistaIncidencias);
router.get('/incidencias/listar', isAuthenticated, isJefeOperaciones, joController.incidencias);
router.post('/incidencias/actualizar', isAuthenticated, isJefeOperaciones, joController.actualizarEstadoIncidencia);
// Planes de Mejora
router.get('/planes-mejora/vistaListar', isAuthenticated, isJefeOperaciones, joController.vistaPlanesMejora);
router.get('/planes-mejora', isAuthenticated, isJefeOperaciones, joController.planesMejoraPorSede);
router.get('/planes/vistaCrear', isAuthenticated, isJefeOperaciones, joController.vistaCrearPlanes);
router.post('/planes-mejora/crear', isAuthenticated, isJefeOperaciones, joController.crearPlanMejora);
router.post('/planes-mejora/aprobar', isAuthenticated, isJefeOperaciones, joController.aprobarPlanMejora);
// Capacitaciones
router.get('/capacitaciones', isAuthenticated, isJefeOperaciones, joController.vistaCapacitaciones);
router.get('/capacitaciones/listar', isAuthenticated, isJefeOperaciones, joController.listarCapacitaciones);
router.get('/capacitaciones/vistaCrear', isAuthenticated, isJefeOperaciones, joController.vistaCrearCapacitacion);
router.post('/capacitaciones/crear', isAuthenticated, isJefeOperaciones, joController.crearCapacitacion);
router.post('/capacitaciones/actualizar', isAuthenticated, isJefeOperaciones, joController.actualizarEstadoCapacitacion);
router.get('/capacitaciones/asistencia/vistaListar', isAuthenticated, isJefeOperaciones, joController.vistaListarAsistenciaCapacitacion);
router.get('/capacitaciones/asistencia/listar', isAuthenticated, isJefeOperaciones, joController.listaAsistenciaCapacitacion);
router.post('/capacitaciones/asistencia/actualizar', isAuthenticated, isJefeOperaciones, joController.marcarAsistencia);
router.delete('/capacitaciones/eliminar/:id', isAuthenticated, isJefeOperaciones, joController.eliminarCapacitacion);
// API Responsables:
router.get('/api/responsables', isAuthenticated, isJefeOperaciones, joController.apiResponsables);
router.get('/resumenMensual', isAuthenticated, isJefeOperaciones, joController.obtenerResumenMensual);
router.get('/resumenComparativo', isAuthenticated, isJefeOperaciones, joController.compararResumenMensual);
// Agregar Proyectos Proximamente 

module.exports = router;

**Versión actual: 0.8.5**  
Sistema Intranet para gestión operativa, comercial y administrativa de gimnasios.

Actualmente se está trabajando en:

- 🧩 **Diseño de vistas frontend**, ya que el backend está completamente finalizado.
- 👤 **Nueva funcionalidad de Proyectos** en desarrollo.
- 🔐 **Mejoras de seguridad**: sistema con encriptación al 80% y autenticación sólida.
- 🔗 **Conexión avanzada con la API de EVO**.
- ➕ **Función de cuentas agregadas** para gestión de múltiples accesos.
- 🧪 **Testeo y ajustes finos en el flujo de navegación.**
- 📁 **Archivo `.env` creado** para separar configuraciones sensibles del entorno.

---

## 📌 Historia de versiones

### 📅 29 de abril - Versión 0.001
- Login de intranet funcional.
- Cookies y autenticación backend funcionando.
- Comienzo de vista Admin (backend).
- Funciona: Crear usuario (admin).
- Pendiente: Editar usuario.
- Próxima versión: Continuar con el CRUD completo.

---

## 🚀 Funcionalidades por Rol

### 👑 **ADMIN (CEO / GO)**
- Dashboard compartido.
- Gestión de:
  - Clientes.
  - Administrativos (usuarios con cuenta).
  - Empleados.
- (Pendiente) Acceso completo a todas las funciones.

---

### 📊 **JEFE DE OPERACIONES**
- Dashboard exclusivo.
- ✅ Supervisión del cumplimiento de metas por sede.
- Control de desempeño general de equipos comerciales y administrativos.
- Visualización de reportes operativos (asistencia, ventas, reclamos, etc.).
- Gestión de incidencias operativas y seguimiento de soluciones.
- Aprobación de planes de mejora o acciones correctivas por sede.

---

### 📈 **GERENTE DE OPERACIONES**
- Dashboard compartido con los Admin (mismo nivel de acceso).

---

### 🧠 **COORDINADOR COMERCIAL**
- Panel de KPIs comerciales.
- Comparación de resultados vs. metas.
- Reporte de bajo rendimiento.
- Detección de focos débiles.
- Diagnóstico de causa del problema.
- Sugerencias de acción comercial.
- Historial de decisiones tomadas.
- Rendimiento individual de vendedores.

---

### 🏢 **RESPONSABLE DE SEDE**
- Dashboard exclusivo.
- Gestión de:
  - Clientes (CRUD).
  - Staff (solo de su sede).
  - Su propia sede.
- Reportes de:
  - Ventas.
  - Asistencias.

---

### 🧾 **RECURSOS HUMANOS**
- Dashboard exclusivo.
- Gestión de:
  - Clientes (CRUD, notas, asistencia).
  - Empleados (CRUD, asistencias, solicitudes, documentos).
  - Membresías.
  - Documentación y solicitudes.

---

### 💼 **VENDEDORES**
- Dashboard exclusivo.
- Funciones:
  - Ventas de productos.
  - Ventas de membresías.
  - Creación y listado de clientes.
  - Historial de ventas.

---

### 👥 **STAFF**
- Dashboard exclusivo.
- Gestión de:
  - Clientes (CRUD).
  - Asistencias.
  - Agendamiento de fechas.
- 🔗 *Se está integrando activamente con la API de EVO para funcionalidades completas.*

---

## 🔐 Autenticación y Seguridad

- Backend completo y funcional.
- Roles bien definidos en `authMiddleware`.
- Sistema de rutas protegido según permisos de usuario.
- Encriptación de datos implementada en un 80%.
- Variables sensibles separadas en un archivo `.env`.
- Enlace con servicios externos a través de API segura.

---

## 🛠️ Próximos pasos

- Finalizar vistas de usuario.
- Avance de módulo de **Proyectos**.
- Finalizar conexión Frontend–Backend.
- Mejoras visuales usando Metronic.
- Encriptación completa.
- Optimización general del rendimiento.


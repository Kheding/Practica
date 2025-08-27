document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    if (!id) {
        alert('ID de usuario no proporcionado');
        return;
    }

    console.log(`Obteniendo datos del usuario con ID: ${id}`);

    try {
        const response = await fetch(`/admin/apiEditarPersonal/${id}`);
        console.log('Respuesta del servidor:', response.status);

        if (!response.ok) {
            throw new Error(`Error al obtener los datos. Código: ${response.status}`);
        }

        const usuario = await response.json();
        console.log('Datos recibidos del usuario:', usuario);

        // Precargar datos en el formulario
        document.getElementById('id').value = usuario.id;
        document.getElementById('nombre_completo').value = usuario.nombre_completo || '';
        document.getElementById('rut').value = usuario.rut || '';
        document.getElementById('email_personal').value = usuario.email_personal || '';
        document.getElementById('rol_id').value = usuario.rol_id || '';
        document.getElementById('sede').value = usuario.sede || '';
        document.getElementById('estado_vd').value = usuario.estado_vd || '';
        document.getElementById('direccion').value = usuario.direccion || '';
        document.getElementById('fono_contacto').value = usuario.fono_contacto || '';
        document.getElementById('contacto_emergencia').value = usuario.contacto_emergencia || '';
        document.getElementById('relacion').value = usuario.relacion || '';
        document.getElementById('fono_emergencia').value = usuario.fono_emergencia || '';
        document.getElementById('enfermedades').value = usuario.enfermedades || '';
        document.getElementById('Alergias').value = usuario.Alergias || '';

        // No se precarga clave por seguridad

        // Actualizar la acción del formulario
        document.getElementById('form-editar-personal').action = `/admin/apiEditarPersonalPost/${usuario.id}`;
    } catch (error) {
        console.error('Error al cargar datos del usuario:', error);
        alert('No se pudo cargar la información del usuario.');
    }
});

document.getElementById('form-editar-personal').addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(event.target);
    const id = document.getElementById('id').value;

    console.log(`Enviando actualización para el usuario ID: ${id}`);

    try {
        const response = await fetch(`/admin/apiEditarPersonalPost/${id}`, {
            method: 'POST',
            body: JSON.stringify(Object.fromEntries(formData)),
            headers: { 'Content-Type': 'application/json' }
        });

        console.log('Respuesta del servidor al actualizar:', response.status);

        const data = await response.json();
        console.log('Datos recibidos después de actualización:', data);

        if (data.success) {
            alert('Usuario actualizado correctamente');
            window.location.href = '/admin/listarPersonal';
        } else {
            throw new Error(data.error || 'No se pudo actualizar el usuario');
        }
    } catch (error) {
        console.error('Error al actualizar usuario:', error);
        alert('Error al actualizar usuario: ' + error.message);
    }
});

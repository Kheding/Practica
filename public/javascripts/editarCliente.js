document.addEventListener('DOMContentLoaded', async function () {
    // Esperar a que el DOM esté completamente cargado

    const params = new URLSearchParams(window.location.search);
    const idCliente = params.get('id');
    if (!idCliente) return;

    try {
        // Usar la ruta que llama a tu función apiEditarCliente
        const response = await fetch(`/admin/apiEditarCliente/${idCliente}`);
        if (!response.ok) throw new Error('No se pudo obtener el cliente');
        const cliente = await response.json();

        // Rellenar los campos del formulario
        for (const key in cliente) {
            const input = document.getElementById(key);
            if (input) {
                if (input.tagName === 'SELECT') {
                    input.value = cliente[key] || '';
                } else if (input.type === 'date' && cliente[key]) {
                    input.value = cliente[key].slice(0, 10);
                } else {
                    input.value = cliente[key] || '';
                }
            }
        }
    } catch (error) {
        console.error('Error al cargar datos del cliente:', error);
    }
});

document.getElementById('editarClienteForm').addEventListener('submit', async (event) => {
    event.preventDefault(); // Evita el envío automático

    const formData = new FormData(event.target);
    const IdCliente = document.getElementById('IdCliente').value;

    console.log(`Enviando actualización para el usuario ID: ${IdCliente}`); // Depuración

    try {
        const response = await fetch(`/admin/apiEditarClientePost/${IdCliente}`, {
            method: 'POST',
            body: JSON.stringify(Object.fromEntries(formData)),
            headers: { 'Content-Type': 'application/json' }
        });

        console.log('Respuesta del servidor al actualizar:', response.status);

        const data = await response.json();

        console.log('Datos recibidos después de actualización:', data);

        if (data.success) {
            alert('Usuario actualizado correctamente'); // Alerta de éxito
            window.location.href = '/admin/listarClientes'; // Redirección tras aceptar la alerta
        } else {
            throw new Error(data.error || 'No se pudo actualizar el usuario');
        }
    } catch (error) {
        console.error('Error al actualizar usuario:', error);
        alert('Error al actualizar usuario: ' + error.message);
    }
});
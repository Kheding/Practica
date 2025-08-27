let empleadosData = [];

// Función para obtener el personal desde el backend
async function fetchEmpleados() {
    try {
        const response = await fetch('/admin/listarEmpleadosAPI');
        empleadosData = await response.json();
        renderEmpleadosList(empleadosData);
    } catch (error) {
        console.error('Error al obtener el personal:', error);
    }
}
// Función para renderizar la lista de personal
function renderEmpleadosList(data) {
    const empleadosList = document.getElementById('listarEmpleados');
    empleadosList.innerHTML = '';

    data.forEach(person => {
        const row = document.createElement('tr');
        const getValue = (value) => value === null || value === undefined || value === '' ? 'Ninguna' : value;
        row.innerHTML = `
                    <td>${person.sede}</td>
                    <td>${person.estado_vd}</td>
                    <td>${person.nombre_completo}</td>
                    <td>${person.rut}</td>
                    <td>${person.email_personal}</td>
                    <td>${person.direccion}</td>
                    <td>${person.fono_contacto}</td>
                    <td>${person.contacto_emergencia}</td>
                    <td>${person.relacion}</td>
                    <td>${person.fono_emergencia}</td>
                    <td>${getValue(person.enfermedades)}</td>
                    <td>${getValue(person.Alergias)}</td>
                    <td class="actions">
                        <button onclick="window.location.href='/admin/editarEmpleados?id=${person.id}'">Editar</button>
                        <button onclick="deleteEmpleados(${person.id})">Eliminar</button>
                    </td>
                `;
        empleadosList.appendChild(row);
    });
}

async function deleteEmpleados(id) {
    const confirmation = confirm('¿Estás seguro de que deseas eliminar este usuario?');
    if (confirmation) {
        try {
            const response = await fetch(`/admin/apiEliminarEmpleados/${id}`, {
                method: 'DELETE'
            });

            const result = await response.json();
            console.log('Respuesta del backend:', result);
            if (result.success) {
                alert('Usuario eliminado correctamente.');
                fetchEmpleados(); // Actualizar la lista
            } else {
                alert('Error al eliminar el usuario.');
            }
        } catch (error) {
            console.error('Error al eliminar el usuario:', error);
            alert('Error en el servidor.');
        }
    }
}


// Función para buscar personal
function searchEmpleados() {
    const searchInput = document.getElementById('search-input').value.toLowerCase();
    const filteredData = EmpleadosData.filter(person =>
        person.nombre_completo.toLowerCase().includes(searchInput) ||
        person.email_personal.toLowerCase().includes(searchInput) ||
        person.rut.toLowerCase().includes(searchInput)
    );
    renderEmpleadosList(filteredData);
}

document.getElementById('search-input').addEventListener('keypress', function (event) {
    if (event.key === 'Enter') {
        searchEmpleados();
    }
});



// Llamar a la función al cargar la página
fetchEmpleados();
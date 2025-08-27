let clientesData = [];

// Función para obtener el personal desde el backend
async function fetchClientes() {
    try {
        const response = await fetch('/admin/apiListarClientes');
        clientesData = await response.json();
        renderClientesList(clientesData);
    } catch (error) {
        console.error('Error al obtener el personal:', error);
    }
}

// Función para renderizar la lista de personal
function renderClientesList(data) {
    const clientesList = document.getElementById('clientes-list');
    clientesList.innerHTML = '';

    data.forEach(clientes => {
        const row = document.createElement('tr');
        const getValue = (value) => value === null || value === undefined || value === '' ? 'Sin información ingresada' : value;
        row.innerHTML = `
            <td>${clientes.Nombre}</td>
            <td>${getValue(clientes.SegundoNombre)}</td>
            <td>${clientes.Apellido}</td>
            <td>${getValue(clientes.SegundoApellido)}</td>
            <td>${clientes.PlanC}</td>
            <td>${formatFecha(clientes.FechaRegistro)}</td>
            <td>${formatFecha(clientes.Conversion)}</td>
            <td>${formatFecha(clientes.VencimientoPlan)}</td>
            <td>${clientes.Sede}</td>
            <td>${clientes.PlanFirmado}</td>
            <td>${getValue(clientes.RUT)}</td>
            <td>${formatFecha(clientes.FechaNacimiento)}</td>
            <td>${clientes.DiasActivos}</td>
            <td>${clientes.CorreoElectronico}</td>
            <td>${clientes.Genero}</td>
            <td>${clientes.Edad}</td>
            <td>${clientes.TelefonoMovil}</td>
            <td>${formatFecha(clientes.UltimaPresencia)}</td>
            <td>${clientes.ValorPlan}</td>
            <td class="actions">
            <button onclick="window.location.href='/admin/editarCliente?id=${clientes.IdCliente}'">Editar</button>
            <button onclick="deleteCliente('${clientes.IdCliente}')">Eliminar</button>
            </td>
            `;
        clientesList.appendChild(row);
    });
}

async function deleteCliente(IdCliente) {
    if (!IdCliente || IdCliente === 'undefined') {
        alert('ID de cliente no válido.');
        return;
    }
    const confirmation = confirm('¿Estás seguro de que deseas eliminar este Cliente?');
    if (confirmation) {
        try {
            const response = await fetch(`/admin/apiEliminarCliente/${IdCliente}`, {
                method: 'DELETE'
            });

            const result = await response.json();
            console.log('Respuesta del backend:', result);
            if (result.success) {
                alert('Usuario eliminado correctamente.');
                fetchClientes(); // Actualizar la lista
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
function searchClientes() {
    const searchInput = document.getElementById('search-input').value.toLowerCase();
    const filteredData = clientesData.filter(clientes =>
        (clientes.Nombre || '').toLowerCase().includes(searchInput) ||
        (clientes.RUT || '').toLowerCase().includes(searchInput) ||
        (clientes.CorreoElectronico || '').toLowerCase().includes(searchInput) ||
        (clientes.Sede || '').toLowerCase().includes(searchInput)
    );
    console.log("Resultados filtrados:", filteredData);
    renderClientesList(filteredData);
}

document.addEventListener('DOMContentLoaded', function () {
    fetchClientes();

    // Buscar al presionar Enter
    document.getElementById('search-input').addEventListener('keypress', function (event) {
        if (event.key === 'Enter') {
            searchClientes();
        }
    });
    document.getElementById('search-button').addEventListener('click', searchClientes);
});


fetchClientes(); 

function formatFecha(fechaRaw) {
    if (!fechaRaw) return '';
    const fecha = new Date(fechaRaw);
    return fecha.toLocaleString('es-CL', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
}


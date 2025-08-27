let clientesData = [];

async function fetchClientes() {
    try {
        const response = await fetch('/rs/apiListarClientes'
            , {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

        if (!response.ok) throw new Error('Error en la respuesta del servidor');
        clientesData = await response.json();

        const sede = clientesData[0]?.Sede || 'Desconocida';
        document.getElementById('sede-name').textContent = sede;

        renderClientesList(clientesData);
    } catch (error) {
        console.error('Error al obtener los clientes:', error);
    }
}

function renderClientesList(data) {
    const clientesList = document.getElementById('clientes-list');
    clientesList.innerHTML = '';

    data.forEach(cliente => {
        const row = document.createElement('tr');
        const getValue = (value) => value === null || value === undefined || value === '' ? 'Sin información ingresada' : value;

        row.innerHTML = `
            <td>${cliente.Nombre}</td>
            <td>${cliente.Apellido}</td>
            <td>${cliente.PlanC}</td>
            <td>${cliente.CorreoElectronico}</td>
            <td>${formatFecha(cliente.VencimientoPlan)}</td>
            <td>${getValue(cliente.TelefonoMovil)}</td>
            <td>${cliente.DiasActivos}</td>
            <td>${cliente.ValorPlan}</td>
            <td class="actions">
                <button onclick="window.location.href='/rs/editarCliente?id=${cliente.IdCliente}'">Editar</button>
                <button onclick="deleteCliente('${cliente.IdCliente}')">Eliminar</button>
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
            const response = await fetch(`/rs/apiEliminarCliente/${IdCliente}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Error al eliminar el cliente');
            alert('Cliente eliminado correctamente');
            fetchClientes();
        } catch (error) {
            console.error('Error al eliminar el cliente:', error);
        }
    }
}

function formatFecha(fechaRaw) {
    if (!fechaRaw) return 'Sin información';
    const fecha = new Date(fechaRaw);
    return fecha.toLocaleDateString('es-CL');
}

function searchClientes() {
    const search = document.getElementById('search-input').value.toLowerCase();
    const resultados = clientesData.filter(c =>
        (c.Nombre || '').toLowerCase().includes(search) ||
        (c.Apellido || '').toLowerCase().includes(search) ||
        (c.CorreoElectronico || '').toLowerCase().includes(search) ||
        (c.TelefonoMovil || '').toLowerCase().includes(search)
    );
    renderClientesList(resultados);
}

document.addEventListener('DOMContentLoaded', () => {
    fetchClientes();
    document.getElementById('search-button').addEventListener('click', searchClientes);
    document.getElementById('search-input').addEventListener('keypress', e => {
        if (e.key === 'Enter') searchClientes();
    });
});

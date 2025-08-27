let personalData = [];

// Función para obtener el personal desde el backend
async function fetchPersonal() {
    try {
        const response = await fetch('/admin/listarPersonalAPI');
        personalData = await response.json();
        renderPersonalList(personalData);
    } catch (error) {
        console.error('Error al obtener el personal:', error);
    }
}

const roles={
    1:'Administrador',
    2:'Gerente Operaciones',
    3:'Jefe Operaciones',
    4:'Recursos Humanos',
    5:'Coordinador Comercial',
    6:'Responsable de Sede',
    7:'Ventas',
    8:'Staff'
};

// Función para renderizar la lista de personal
function renderPersonalList(data) {
    const personalList = document.getElementById('personal-list');
    personalList.innerHTML = '';

    data.forEach(person => {
        const row = document.createElement('tr');
        const getValue = (value) => value === null || value === undefined || value === '' ? 'Ninguna' : value;
        row.innerHTML = `
                    <td>${roles[person.rol_id]}</td>
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
                    <td>${person.enfermedades}</td>
                    <td>${getValue(person.Alergias)}</td>
                    <td class="actions">
                        <button onclick="window.location.href='/admin/editarPersonal?id=${person.id}'">Editar</button>
                        <button onclick="deletePersonal(${person.id})">Eliminar</button>
                    </td>
                `;
        personalList.appendChild(row);
    });
}

async function deletePersonal(id) {
    const confirmation = confirm('¿Estás seguro de que deseas eliminar este usuario?');
    if (confirmation) {
        try {
            const response = await fetch(`/admin/apiEliminarPersonal/${id}`, {
                method: 'DELETE'
            });

            const result = await response.json();
            console.log('Respuesta del backend:', result);
            if (result.success) {
                alert('Usuario eliminado correctamente.');
                fetchPersonal(); // Actualizar la lista
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
function searchPersonal() {
    const searchInput = document.getElementById('search-input').value.toLowerCase();
    const filteredData = personalData.filter(person =>
        person.nombre.toLowerCase().includes(searchInput) ||
        person.correo.toLowerCase().includes(searchInput) ||
        person.rol.toLowerCase().includes(searchInput)
    );
    renderPersonalList(filteredData);
}

document.getElementById('search-input').addEventListener('keypress', function (event) {
    if (event.key === 'Enter') {
        searchPersonal();
    }
});



// Llamar a la función al cargar la página
fetchPersonal();
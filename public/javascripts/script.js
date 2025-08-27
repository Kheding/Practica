document.getElementById('loginForm').addEventListener('submit', function (e) {
  const correo = document.getElementById('email_personal').value.trim();
  const password = document.getElementById('clave').value.trim();
  const loginBox = document.getElementById('loginBox');
  const loginButton = e.target.querySelector('button');

  // Si el correo o la contraseña están vacíos, mostrar animación de shake
  loginBox.classList.remove('shake', 'fade');

  if (correo === '' || password === '') {
    loginBox.classList.add('shake');
    e.preventDefault(); // Prevenir el envío si los campos están vacíos
  } else {
    // Mostrar el spinner dentro del botón
    const spinner = document.createElement('div');
    spinner.classList.add('spinner');
    loginButton.disabled = true; // Deshabilitar el botón para evitar múltiples envíos
    loginButton.innerHTML = ''; // Limpiar el contenido actual del botón
    loginButton.appendChild(spinner); // Agregar el spinner

    loginBox.classList.add('fade');

    // El formulario se enviará normalmente después de un pequeño retraso para mostrar el spinner
    setTimeout(() => {
      e.target.submit(); // Enviar el formulario
    }, 600); // Retardo para mostrar el spinner
  }
});

document.querySelector("form").addEventListener("submit", function(e) {
  const inputs = this.querySelectorAll("input, textarea");
  for (const input of inputs) {
    if (!input.value.trim()) {
      alert("Todos los campos son obligatorios.");
      e.preventDefault();
      return;
    }
  }
});

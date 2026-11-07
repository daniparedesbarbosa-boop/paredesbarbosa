// Utilidades reutilizables para mostrar mensajes coherentes en toda la app.
// SweetAlert2 dibuja las ventanas; los componentes solo llaman a estas funciones.
import Swal from 'sweetalert2'

// Informa de que una operación terminó correctamente.
export const alertaExito = (mensaje, titulo = 'Correcto') => {
    return Swal.fire({
        icon: 'success',
        title: titulo,
        text: mensaje,
        confirmButtonText: 'Aceptar'
    })
}

// Informa de un fallo y permite mostrar un título personalizado.
export const alertaError = (mensaje, titulo = 'Error') => {
    return Swal.fire({
        icon: 'error',
        title: titulo,
        text: mensaje,
        confirmButtonText: 'Aceptar'
    })
}

// Muestra información que no implica error ni confirmación.
export const alertaInfo = (mensaje, titulo = 'Información') => {
    return Swal.fire({
        icon: 'info',
        title: titulo,
        text: mensaje,
        confirmButtonText: 'Aceptar'
    })
}

// Pregunta antes de una acción destructiva; el resultado indica qué botón eligió el usuario.
export const alertaConfirmacion = (mensaje, titulo = '¿Estás seguro?') => {
    return Swal.fire({
        icon: 'question',
        title: titulo,
        text: mensaje,
        showCancelButton: true,
        confirmButtonText: 'Sí, continuar',
        cancelButtonText: 'Cancelar',
        reverseButtons: true
    })
}

<?php
header('Content-Type: application/json');

// Permitir solicitudes desde el mismo origen o especificar el dominio (CORS)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // Obtener los datos del cuerpo JSON
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);

    // Si no es JSON, intentar con $_POST tradicional
    if (!$data) {
        $data = $_POST;
    }

    $name = isset($data['name']) ? strip_tags(trim($data['name'])) : '';
    $email = isset($data['email']) ? filter_var(trim($data['email']), FILTER_SANITIZE_EMAIL) : '';
    $phone = isset($data['phone']) ? strip_tags(trim($data['phone'])) : '';
    $country = isset($data['country']) ? strip_tags(trim($data['country'])) : '';
    $package = isset($data['package']) ? strip_tags(trim($data['package'])) : '';
    $date = isset($data['date']) ? strip_tags(trim($data['date'])) : '';
    $passengers = isset($data['passengers']) ? strip_tags(trim($data['passengers'])) : '';
    $message = isset($data['message']) ? strip_tags(trim($data['message'])) : '';
    $pets = isset($data['pets']) ? 'Sí' : 'No';
    
    // Validar requeridos
    if (empty($name) || empty($email) || empty($phone) || empty($package) || empty($date) || empty($passengers)) {
        echo json_encode(['success' => false, 'message' => 'Por favor, completa todos los campos obligatorios.']);
        exit;
    }

    // Configuración del correo
    $to = 'reservas@karuoverland.com'; // Cambia esto al correo real de reservas
    $subject = "Nueva Solicitud de Reserva: $package - $name";
    
    $email_content = "Has recibido una nueva solicitud de viaje desde la página web.\n\n";
    $email_content .= "=== DATOS DEL CLIENTE ===\n";
    $email_content .= "Nombre: $name\n";
    $email_content .= "Correo Electrónico: $email\n";
    $email_content .= "Teléfono/WhatsApp: $country $phone\n\n";
    
    $email_content .= "=== DETALLES DEL VIAJE ===\n";
    $email_content .= "Paquete de Interés: $package\n";
    $email_content .= "Fecha Estimada: $date\n";
    $email_content .= "Número de Pasajeros: $passengers\n";
    $email_content .= "¿Viaja con mascotas?: $pets\n\n";
    
    $email_content .= "=== MENSAJE ADICIONAL ===\n";
    $email_content .= !empty($message) ? $message : "Sin detalles adicionales.";
    $email_content .= "\n\n-------------------------\nKaru Overland - Sistema Web";

    $headers = "From: noreply@karuoverland.com\r\n";
    $headers .= "Reply-To: $email\r\n";
    $headers .= "X-Mailer: PHP/" . phpversion();

    // Enviar el correo
    $success = @mail($to, $subject, $email_content, $headers);

    if ($success) {
        echo json_encode(['success' => true, 'message' => '¡Tu solicitud ha sido enviada con éxito! Nos pondremos en contacto contigo muy pronto.']);
    } else {
        // En entorno local XAMPP sin sendmail configurado, mail() fallará.
        // Simularemos éxito si estamos en localhost para que el UI funcione en pruebas
        $is_localhost = in_array($_SERVER['REMOTE_ADDR'], ['127.0.0.1', '::1']);
        if ($is_localhost) {
            echo json_encode(['success' => true, 'message' => '¡Solicitud recibida! (Modo de prueba local XAMPP)']);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Hubo un problema al enviar tu mensaje. Por favor, intenta de nuevo más tarde o contáctanos por WhatsApp.']);
        }
    }
} else {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido.']);
}
?>

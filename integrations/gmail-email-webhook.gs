/**
 * Webhook de correo para Pet Sereno, sin Google Sheets.
 *
 * 1. Crea un proyecto en script.google.com con la cuenta que enviará los correos.
 * 2. En Configuración > Propiedades del script agrega:
 *    PET_SERENO_WEBHOOK_SECRET = una clave larga y privada.
 * 3. Implementa como aplicación web con acceso "Cualquier persona".
 * 4. Guarda la URL y la misma clave como EMAIL_WEBHOOK_URL y
 *    EMAIL_WEBHOOK_SECRET en Sites.
 */
function doPost(event) {
  try {
    const payload = JSON.parse(event.postData.contents || "{}");
    const properties = PropertiesService.getScriptProperties();
    const expectedSecret = properties.getProperty("PET_SERENO_WEBHOOK_SECRET");

    if (!expectedSecret || payload.secret !== expectedSecret) {
      return jsonResponse_({ error: "No autorizado" });
    }
    if (payload.action !== "SEND_EMAIL" || !payload.to || !payload.subject || !payload.text) {
      return jsonResponse_({ error: "Solicitud incompleta" });
    }

    const idempotencyKey = String(payload.idempotencyKey || "");
    const sentKey = idempotencyKey ? "sent_" + idempotencyKey : "";
    if (sentKey && properties.getProperty(sentKey)) {
      return jsonResponse_({ messageId: idempotencyKey, duplicate: true });
    }

    GmailApp.sendEmail(String(payload.to), String(payload.subject), String(payload.text), {
      name: String(payload.fromName || "Pet Sereno"),
    });

    if (sentKey) properties.setProperty(sentKey, new Date().toISOString());
    return jsonResponse_({ messageId: idempotencyKey || Utilities.getUuid() });
  } catch (error) {
    return jsonResponse_({ error: String(error && error.message ? error.message : error) });
  }
}

function jsonResponse_(body) {
  return ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}

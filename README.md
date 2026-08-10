# Pet Sereno — Fase 1

Web comercial y operación inicial para Pet Sereno — Club de Mascotas. La app usa React/TypeScript sobre Vinext, Supabase Postgres y autenticación administrada por Sites/ChatGPT para `/admin`.

## Operación

Supabase es la fuente de verdad para clientes, mascotas, reservas, servicios, historial de estados y notificaciones. Una familia puede tener varias mascotas. Cada perfil de mascota expone un diccionario JSON por número de servicio y una vista cronológica con la reserva, fechas, estado, cambios y correos enviados.

Al confirmar una reserva se crea exactamente un servicio por mascota. Desde el panel se puede activar o cerrar cada servicio. Esos cambios se guardan transaccionalmente y generan una notificación idempotente para el correo del cliente.

## Correo

`lib/email.ts` implementa un adaptador de correo por webhook. El envío ocurre después de confirmar la transacción en Supabase: una falla externa no revierte el servicio. Cada intento queda como `PENDING`, `SENDING`, `SENT` o `FAILED` y puede reintentarse desde el panel.

El endpoint recibe `{ action, secret, fromName, to, subject, text, idempotencyKey }` y debe responder `{ "messageId": "..." }`. Puede implementarse con Gmail Apps Script, Resend, Brevo u otro proveedor.

Para Gmail sin hojas de cálculo se incluye `integrations/gmail-email-webhook.gs`. Se despliega como aplicación web desde la cuenta que enviará los mensajes y usa una propiedad privada para autenticar Pet Sereno.

## Seguridad

Todas las tablas expuestas tienen RLS. La app usa una clave publicable y una credencial privada almacenada únicamente en el servidor. Los datos personales no quedan disponibles mediante la clave pública por sí sola.

## Variables

Copiar `.env.example` a `.env` para desarrollo local. En producción las variables se administran en Sites. `SUPABASE_APP_TOKEN` y `EMAIL_WEBHOOK_SECRET` nunca deben exponerse al navegador.

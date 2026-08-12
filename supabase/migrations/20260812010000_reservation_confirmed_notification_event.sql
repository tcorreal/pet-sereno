-- Nuevo evento de notificación: correo al confirmar una reserva (además de
-- los ya existentes SERVICE_ACTIVATED/SERVICE_CLOSED). Va en su propia
-- migración porque un nuevo valor de enum no puede usarse en la misma
-- transacción en la que se agrega.
alter type public.notification_event add value if not exists 'RESERVATION_CONFIRMED';

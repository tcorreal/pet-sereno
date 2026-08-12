-- Permite que el agente del chat sepa qué sesiones ya "iniciaron sesión"
-- (verificaron su identidad por número de documento, mismo mecanismo que ya
-- usa /reservar) antes de poder crear una reserva en su nombre.
alter table chat_sessions add column if not exists verified_document_number text;

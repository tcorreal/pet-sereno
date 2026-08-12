-- La verificación por documento del chat fue reemplazada por el login real
-- del sitio (cookie de sesión reenviada por app/api/chat, ver
-- supabase/functions/chat-agent/_shared/auth.ts). Esta columna ya no se usa.
alter table public.chat_sessions drop column if exists verified_document_number;

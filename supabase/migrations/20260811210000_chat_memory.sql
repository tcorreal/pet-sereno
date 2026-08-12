-- Memoria de conversaciones del chatbot informativo (agente agnóstico de
-- proveedor de IA, canal-agnóstico). Solo la Edge Function `chat-agent`
-- (con la service_role key) lee y escribe estas tablas; el navegador nunca
-- las toca directamente.

create table if not exists chat_sessions (
  id uuid primary key default gen_random_uuid(),
  channel text not null default 'web' check (channel in ('web', 'whatsapp')),
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create table if not exists chat_messages (
  id bigint generated always as identity primary key,
  session_id uuid not null references chat_sessions(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_session_id_created_at_idx
  on chat_messages (session_id, created_at);

alter table chat_sessions enable row level security;
alter table chat_messages enable row level security;
-- A propósito, sin políticas: anon/authenticated no tienen acceso directo.
-- Solo service_role (usado por la Edge Function chat-agent) puede leer o
-- escribir, igual que el resto de datos sensibles del proyecto que solo se
-- exponen a través de funciones api_* controladas.

-- Limpieza opcional de sesiones inactivas, para que la tabla no crezca sin
-- límite con tráfico anónimo. Requiere la extensión pg_cron (Database ->
-- Extensions en el dashboard de Supabase).
create or replace function chat_purge_inactive_sessions()
returns void
language sql
security definer
set search_path = public
as $$
  delete from chat_sessions where last_message_at < now() - interval '48 hours';
$$;

-- Para programarla una sola vez desde el SQL Editor de Supabase, después de
-- habilitar pg_cron:
-- select cron.schedule('chat-purge-inactive', '0 * * * *', 'select chat_purge_inactive_sessions();');

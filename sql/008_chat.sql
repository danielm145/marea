-- Beach Trip v16 · chat del grupo (texto y fotos). Idempotente. Solo esquema marea.
set search_path = marea, public;

create table if not exists mensajes (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid not null references personas(id) on delete cascade,
  texto text check (texto is null or length(texto) <= 2000),
  foto text,                                   -- 'marea-muro:<ruta>' (bucket privado)
  created_at timestamptz not null default now(),
  check (texto is not null or foto is not null)
);
alter table mensajes add column if not exists foto text;
create index if not exists mensajes_fecha_ix on mensajes (created_at desc);

alter table mensajes enable row level security;
grant select, insert, delete on mensajes to authenticated;
drop policy if exists msg_sel on mensajes; create policy msg_sel on mensajes for select to authenticated using (mi_persona() is not null);
drop policy if exists msg_ins on mensajes; create policy msg_ins on mensajes for insert to authenticated with check (persona_id = mi_persona());
drop policy if exists msg_del on mensajes; create policy msg_del on mensajes for delete to authenticated using (persona_id = mi_persona() or es_admin());

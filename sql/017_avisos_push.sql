-- Casablanca v36 · AVISOS (Web Push): «que llegue como un mensaje» (Daniel, 9-oct-2026).
-- Cada teléfono que activa los avisos deja aquí su suscripción; la Edge Function marea-avisar
-- (con service_role) es la ÚNICA que lee y escribe estas tablas: el navegador nunca ve las
-- suscripciones de los demás ni la llave privada. Idempotente. Solo esquema marea.
set search_path = marea, public;

create table if not exists push_subs (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid not null references personas(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  ua text,
  fallos int not null default 0,
  created_at timestamptz not null default now(),
  ultimo_uso timestamptz
);
create index if not exists push_subs_persona_ix on push_subs (persona_id);

-- la pareja de llaves VAPID: la crea la función la primera vez y queda aquí (una sola fila)
create table if not exists push_vapid (
  id int primary key default 1 check (id = 1),
  publica text not null,
  privada_d text not null,
  created_at timestamptz not null default now()
);

alter table push_subs enable row level security;
alter table push_vapid enable row level security;
revoke all on push_subs from anon, authenticated;
revoke all on push_vapid from anon, authenticated;
-- sin políticas: solo service_role (la Edge Function) entra.

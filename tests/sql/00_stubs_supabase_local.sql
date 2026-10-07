-- Prueba local (Postgres 16 sin Supabase): imita auth/storage y los grants que Supabase da por defecto.
-- Uso: psql -f tests/sql/00_stubs_supabase_local.sql && psql -f sql/001_esquema.sql && psql -f tests/sql/10_balances_y_rls.sql
-- Verificado 2026-10-07 en Postgres 16: 0 tablas en public, 11 en marea, balances y RLS correctos.
do $$ begin if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; create role anon nologin; end if; end $$;
do $$ begin if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if; end $$;
create schema auth; create table auth.users(id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
create schema storage;
create table storage.buckets(id text primary key, name text, public boolean);
create table storage.objects(id uuid default gen_random_uuid(), bucket_id text, name text, owner uuid);
create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1] $$;
-- Supabase da estos grants por defecto; aquí hay que imitarlos
grant usage on schema public to authenticated, anon;
alter default privileges in schema public grant all on tables to authenticated;
alter default privileges in schema public grant all on sequences to authenticated;
alter default privileges in schema public grant execute on functions to authenticated;
grant usage on schema storage to authenticated; grant all on all tables in schema storage to authenticated;
grant usage on schema auth to authenticated, anon; grant execute on function auth.uid() to authenticated, anon;

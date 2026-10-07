-- Prueba local de sql/003 (correr después de 00_stubs, 001, 002, 003 y 10_balances_y_rls). Verificado 2026-10-07.
set search_path = marea, public;
\echo --- 003: tablas y semillas
select count(*) as presupuesto from presupuesto;
select count(*) as eventos_sembrados from eventos where estilo is not null;
select valor->>'lugar' as lugar from config where clave='viaje';
insert into comidas(id,dia,turno,titulo,modalidad,creado_por) values ('cccccccc-0000-0000-0000-000000000001','2026-11-01','almuerzo','Almuerzo costeño','cocinera','aaaaaaaa-0000-0000-0000-000000000001');
insert into platos(comida_id,nombre,ingredientes,creado_por) values ('cccccccc-0000-0000-0000-000000000001','Arroz marinero','{Arroz,Conchas}','aaaaaaaa-0000-0000-0000-000000000001');
\echo --- como invitado Beto
set role authenticated; set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select count(*) as ve_comidas from comidas;
select count(*) as ve_platos from platos;
insert into asistencia(comida_id,persona_id,va,opcion,variante) values ('cccccccc-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000002',true,null,'sin conchas');
do $$ begin insert into asistencia(comida_id,persona_id,va) values ('cccccccc-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000003',false); raise exception 'NO DEBIA'; exception when insufficient_privilege or check_violation then raise notice 'asistencia ajena bloqueada OK'; when others then if sqlerrm like '%row-level%' then raise notice 'asistencia ajena bloqueada OK'; else raise; end if; end $$;
do $$ begin insert into comidas(dia,turno,titulo) values ('2026-11-01','cena','x'); raise exception 'NO DEBIA'; exception when others then if sqlerrm like '%row-level%' then raise notice 'invitado no crea comidas OK'; else raise; end if; end $$;
do $$ begin update presupuesto set maximo=1 where true; if (select count(*) from presupuesto where maximo=1)>0 then raise exception 'NO DEBIA'; end if; raise notice 'presupuesto intocable OK'; end $$;
insert into platos(comida_id,nombre,creado_por) values ('cccccccc-0000-0000-0000-000000000001','Ensalada','aaaaaaaa-0000-0000-0000-000000000002');
insert into muro(persona_id,foto_path,texto,evento_id) values ('aaaaaaaa-0000-0000-0000-000000000002','x/1.jpg','hola',(select id from eventos limit 1));
update tareas set prioridad='alta' where true;
select count(*) as fotos from muro;
reset role;

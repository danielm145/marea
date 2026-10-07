insert into auth.users values ('11111111-1111-1111-1111-111111111111','a'),('22222222-2222-2222-2222-222222222222','b'),('33333333-3333-3333-3333-333333333333','c');
insert into personas(id,auth_id,cedula,nombre,rol) values
 ('aaaaaaaa-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','1','Ana','admin'),
 ('aaaaaaaa-0000-0000-0000-000000000002','22222222-2222-2222-2222-222222222222','2','Beto','invitado'),
 ('aaaaaaaa-0000-0000-0000-000000000003','33333333-3333-3333-3333-333333333333','3','Caro','invitado');
insert into gastos(descripcion,monto,pagadores,reparto,creado_por) values ('cena',90,
 '[{"persona_id":"aaaaaaaa-0000-0000-0000-000000000001","monto":90}]',
 '{"modo":"igual","partes":[{"persona_id":"aaaaaaaa-0000-0000-0000-000000000001","valor":0},{"persona_id":"aaaaaaaa-0000-0000-0000-000000000002","valor":0},{"persona_id":"aaaaaaaa-0000-0000-0000-000000000003","valor":0}]}','aaaaaaaa-0000-0000-0000-000000000001');
insert into gastos(descripcion,monto,pagadores,reparto,creado_por) values ('hielo',40,
 '[{"persona_id":"aaaaaaaa-0000-0000-0000-000000000002","monto":40}]',
 '{"modo":"porcentaje","partes":[{"persona_id":"aaaaaaaa-0000-0000-0000-000000000001","valor":25},{"persona_id":"aaaaaaaa-0000-0000-0000-000000000003","valor":75}]}','aaaaaaaa-0000-0000-0000-000000000002');
insert into gastos(tipo,descripcion,monto,pagadores,reparto,creado_por) values ('pago','abono',10,
 '[{"persona_id":"aaaaaaaa-0000-0000-0000-000000000003","monto":10}]',
 '{"modo":"porcentaje","partes":[{"persona_id":"aaaaaaaa-0000-0000-0000-000000000001","valor":100}]}','aaaaaaaa-0000-0000-0000-000000000003');
insert into gastos(tipo,descripcion,monto,pagadores,reparto,creado_por) values ('aporte','fondo',20,
 '[{"persona_id":"aaaaaaaa-0000-0000-0000-000000000002","monto":20}]',
 '{"modo":"igual","partes":[{"persona_id":"aaaaaaaa-0000-0000-0000-000000000001"},{"persona_id":"aaaaaaaa-0000-0000-0000-000000000002"},{"persona_id":"aaaaaaaa-0000-0000-0000-000000000003"}]}','aaaaaaaa-0000-0000-0000-000000000002');
insert into gastos(descripcion,monto,fondo,creado_por) values ('limones (fondo)',15,true,'aaaaaaaa-0000-0000-0000-000000000001');
\echo --- balances (verificado 2026-10-07: Ana 90 / 56.67 / 33.33 · Beto 60 / 36.67 / 23.33 · Caro 10 / 66.67 / -56.67)
select nombre, pagado, le_toca, saldo from vw_balances order by nombre;
select * from vw_fondo;
update gastos set monto=95 where descripcion='cena';
select count(*) as versiones_historial from gastos_historial;
\echo --- como invitado Beto
set role authenticated; set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select count(*) as filas_personas_visibles from personas;
select count(*) as publicas from personas_publicas;
update personas set apodo='B' where auth_id = auth.uid();
do $$ begin
  update personas set rol='admin' where auth_id = auth.uid();
  raise exception 'NO DEBIA PODER';
exception when others then
  if sqlerrm like '%solo el admin%' then raise notice 'guard OK'; else raise; end if;
end $$;
select count(*) as gastos_visibles from gastos;
update gastos set descripcion='hackeado' where creado_por='aaaaaaaa-0000-0000-0000-000000000001';
select count(*) as hackeados from gastos where descripcion='hackeado';
insert into votos(evento_id,persona_id) select id, 'aaaaaaaa-0000-0000-0000-000000000002' from eventos limit 1;
select count(*) as votos from votos;
reset role;

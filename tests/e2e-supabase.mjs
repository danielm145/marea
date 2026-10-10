// La app en MODO SUPABASE contra un simulador con las columnas reales de la base (tests/esquema-marea.json).
// Si algo guarda una columna que no existe, o un guardado falla, aquí se ve.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
const ESQ=fs.readFileSync('/home/user/marea/tests/esquema-marea.json','utf8'), MOCK=fs.readFileSync('/home/user/marea/tests/mock-supabase.js','utf8');
const srv=spawn('python3',['-m','http.server','8098','--bind','127.0.0.1','-d','/home/user/marea/public'],{stdio:'ignore'});await new Promise(r=>setTimeout(r,800));
const S='/tmp/claude-0/-home-user/5853f958-644c-5d2f-baa4-3130bae7435e/scratchpad/';
const errs=[];const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const ctx=await b.newContext({viewport:{width:390,height:844}});
// el día de la salida (9-oct a las 2 a.m.): así salen la votación del almuerzo y los carros en el inicio
await ctx.addInitScript(()=>{const real=Date;const off=new real('2026-10-09T02:00:00-05:00').getTime()-real.now();class D extends real{constructor(...a){super(...(a.length?a:[real.now()+off]))}static now(){return real.now()+off}};window.Date=D});
await ctx.addInitScript(`window.__ESQUEMA=${ESQ};\n${MOCK}`);
await ctx.route('**/*',async r=>{const u=r.request().url();
  if(u.startsWith('https://mock.supabase.co/functions/v1/')){const body=JSON.parse(r.request().postData()||'{}');
    if(u.endsWith('marea-admin-personas')&&body.action==='entrar')return r.fulfill({contentType:'application/json',body:JSON.stringify({access_token:'tok:'+body.telefono,refresh_token:'r'})});
    return r.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,enviados:0})})}
  if(u.includes('/api/ia/salud'))return r.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,motor:'gemini',prueba:'ok'})});
  if(u.endsWith('/api/ia')){const body=JSON.parse(r.request().postData()||'{}');const ids=(body.contexto&&body.contexto.personas||[]).map(p=>p.id);
    return r.fulfill({contentType:'application/json',body:JSON.stringify({propuesta:{ia:true,resumen:'Factura del supermercado',gastos:[{descripcion:'Supermaxi Same',monto:30.5,fecha:'2026-10-09',categoria:'despensa',alcance:'fijo',pagador_ids:[body.contexto.autor_id],participante_ids:ids,modo:'igual',partes:null,pago_entre:null,evento_id:null,etiquetas:['despensa'],confianza:0.95,
      factura:{tipo_documento:'factura',comercio:'Supermaxi',ruc:'1790016919001',fecha:'2026-10-09',items:[{descripcion:'Hielo',cantidad:2,total:6,para_ids:[]},{descripcion:'Cerveza',cantidad:12,total:24.5,para_ids:[]}],subtotal:30.5,impuestos:0,propina:null,total:30.5}}],tareas:[],planes:[],dudas:[]}})})}
  if(u.includes('/api/config.js'))return r.fulfill({contentType:'text/javascript',body:'/* mock */'});
  if(u.includes('/api/canciones'))return r.fulfill({contentType:'application/json',body:JSON.stringify({canciones:[{id:9,titulo:'Bailando',artista:'Enrique Iglesias',portada:'',preview:''}]})});
  if(u.includes('/api/'))return r.fulfill({status:404,body:'{}'});
  return u.startsWith('http://127.0.0.1:8098')?r.continue():r.abort()});
const pg=await ctx.newPage();pg.on('pageerror',e=>errs.push(e.message));pg.on('dialog',d=>d.accept());
await pg.goto('http://127.0.0.1:8098/index.html');await pg.waitForTimeout(500);
console.log('modo:',await pg.evaluate(()=>MODO));
await pg.fill('#lced','0990000001');await pg.click('#lbtn');await pg.waitForSelector('.hh',{timeout:8000});
await pg.evaluate(()=>{window.__T=[];const t=window.toast;window.toast=m=>{window.__T.push(String(m));t(m)}});
const paso=async(n,fn)=>{try{await pg.evaluate(fn)}catch(e){errs.push(n+': '+e.message.split('\n')[0])}await pg.waitForTimeout(450)};
console.log('inicio con datos:',await pg.locator('.md').count(),'Mi día ·',await pg.locator('.carro2').count(),'carros ·',await pg.locator('#jcard').count(),'juegos');
// almuerzo
await pg.fill('#almIn','Encocado en Quinindé');await pg.click('#votoAlm >> text=Agregar');await pg.waitForTimeout(600);
console.log('almuerzo:',await pg.locator('#votoAlm button.voto-o').count(),'opción con voto');
// gasto por formulario (pago) + liquidar
await paso('pago',async()=>{const T=simplificar(balances())[0];registrarPago(T.de,T.a,T.monto);await new Promise(r=>setTimeout(r,200));await guardarGasto()});
console.log('pagos guardados:',await pg.evaluate(()=>__DB.gastos.filter(g=>g.tipo==='pago').length));
// juegos
await paso('trivia',async()=>{TEMA='nosotros';await nuevaTrivia();const j=JUEGOS[0];await avanzarTrivia(j.id,'pregunta',0);await responder(j.id,0,j.preguntas[0].ok);await avanzarTrivia(j.id,'resultado',0);await avanzarTrivia(j.id,'fin',0)});
console.log('trivia:',await pg.evaluate(()=>JSON.stringify({juegos:__DB.juegos.length,estado:__DB.juegos[0]&&__DB.juegos[0].estado,resp:__DB.juego_respuestas.length,pts:(__DB.juego_respuestas[0]||{}).puntos})));
await paso('probable',async()=>{await nuevoProbable();const j=JUEGOS.find(x=>x.tipo==='probable');await votarProbable(j.id,0,PERSONAS[2].id)});
await paso('karaoke',async()=>{KRES=[{id:9,titulo:'Bailando',artista:'Enrique Iglesias',portada:'',preview:''}];KCANT=[ME.id,PERSONAS[1].id];await guardarCancion(0);await siguienteCancion();await terminoCancion(KARAOKE[0].id);await votarPremio('karaoke:voz',ME.id);await votarSug(2);await juguemos('voley')});
console.log('karaoke:',await pg.evaluate(()=>JSON.stringify({canciones:__DB.karaoke.map(k=>k.estado+':'+k.cantantes.length),votos:__DB.votos_juego.map(v=>v.clave)})));
// looks: guía (sin IA → guía con el look) + inspiración
await paso('look',async()=>{await armarGuia('Welcome White Night')});
console.log('guía del look:',await pg.evaluate(()=>__DB.look_guias.length&&__DB.look_guias[0].clave));
// chat, checklist de evento, asistencia, plato, tarea, carro, perfil
await paso('chat',async()=>{irA('chat');await new Promise(r=>setTimeout(r,200));document.getElementById('chatT').value='Hola desde la prueba';await chatEnviar()});
await paso('asistencia',async()=>{await setAsis(COMIDAS.find(c=>c.turno==='desayuno').id,{opcion:'B'})});
await paso('plato',async()=>{abrirFormPlato(null,COMIDAS[0].id);PL.nombre='Prueba de plato';await guardarPlato()});
await paso('tarea',async()=>{const t=TAREAS[0];await hecha(t.id,true)});
await paso('subirme',async()=>{TRAY='ida';await subirme(VEHICULOS[1].id)});
await paso('votar plan',async()=>{const e=EVENTOS.find(x=>x.estado==='propuesta'&&!esAlmuerzoCamino(x));await votar(e.id,true)});
console.log('db:',await pg.evaluate(()=>JSON.stringify({mensajes:__DB.mensajes.length,asist:__DB.asistencia.length,platos:__DB.platos.some(p=>p.nombre==='Prueba de plato'),votos:__DB.votos.length})));
// gasto con foto de factura leída por la IA
await paso('gasto ia',async()=>{abrirLector(null,null,null,'gasto');await new Promise(r=>setTimeout(r,200));document.getElementById('ltxt').value='Pagué la factura del super, para todos';await procesarLector();await new Promise(r=>setTimeout(r,1500));await guardarGasto()});
console.log('gasto de la IA guardado:',await pg.evaluate(()=>{const g=__DB.gastos.find(x=>x.descripcion==='Supermaxi Same');return g?JSON.stringify({monto:g.monto,items:(g.factura||{}).items&&g.factura.items.length,partes:(g.reparto||{}).partes&&g.reparto.partes.length,origen:g.origen}):'NO'}));
// álbum e inspiración de Insta
await pg.evaluate(()=>irA('hoy'));await pg.waitForTimeout(300);
await pg.setInputFiles('.hm-alb input',['/home/user/marea/public/img/gente/kevin-lopez.jpg']);await pg.waitForTimeout(800);await paso('album',async()=>{await subirFotos()});await pg.waitForTimeout(800);
console.log('fotos en el álbum:',await pg.evaluate(()=>__DB.muro.length));
await pg.evaluate(()=>{SUBE='dress';irA('planes')});await pg.waitForTimeout(300);
await pg.locator('.lk-insta input[type=file]').first().setInputFiles(['/home/user/marea/public/img/looks/welcome-white.jpg']);await pg.waitForTimeout(2500);
console.log('inspiración guardada:',await pg.evaluate(()=>__DB.inspiracion.length),'· guía:',await pg.evaluate(()=>__DB.look_guias.length));
await pg.evaluate(()=>irA('hoy'));await pg.waitForTimeout(400);
const T=await pg.evaluate(()=>__T);const malos=T.filter(x=>/no pude|error|could not|column|schema|falló|inválid/i.test(x));
console.log('avisos raros:',malos.length?malos:'ninguno');
console.log('columnas que no existen:',await pg.evaluate(()=>__ERRORES_DB.length?__ERRORES_DB:'ninguna'));
await pg.screenshot({path:S+'supabase-hoy.png'});
// SIN SEÑAL: se recarga la app sin base → abre con lo guardado y los juegos de carro andan
await pg.evaluate(()=>localStorage.setItem('__mock_offline','1'));await pg.reload();await pg.waitForTimeout(1500);
console.log('sin señal · modo:',await pg.evaluate(()=>MODO),'· sin config del servidor:',await pg.evaluate(()=>!!window.MAREA_SB));
console.log('sin señal · abre:',await pg.locator('.hh').count()===1,'· aviso:',await pg.locator('.sinred').count(),'· Mi día:',await pg.locator('.md').count(),'· carros:',await pg.locator('.carro2').count());
await pg.evaluate(()=>irA('juegos'));await pg.waitForTimeout(300);console.log('juegos sin señal · aviso claro:',(await pg.locator('#main').innerText()).includes('Sin conexión'));
await pg.screenshot({path:S+'sin-senal.png'});
await pg.evaluate(()=>{localStorage.removeItem('__mock_offline');window.dispatchEvent(new Event('online'))});await pg.waitForTimeout(1200);
console.log('vuelve la señal · aviso quitado:',await pg.locator('.sinred').count()===0);
console.log('errores JS:',errs.length?errs:'ninguno');await b.close();srv.kill();

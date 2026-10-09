// v51 · juegos con DOS teléfonos a la vez (demo comparte el localStorage): trivia, ¿quién es más probable?, karaoke y premios, playa.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const srv=spawn('python3',['-m','http.server','8099','--bind','127.0.0.1','-d','/home/user/marea/public'],{stdio:'ignore'});await new Promise(r=>setTimeout(r,800));
const S='/tmp/claude-0/-home-user/5853f958-644c-5d2f-baa4-3130bae7435e/scratchpad/';
const errs=[];const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const ctx=await b.newContext({viewport:{width:390,height:844}});
await ctx.route('**/*',r=>{const u=r.request().url();
  if(u.includes('/api/canciones'))return r.fulfill({contentType:'application/json',body:JSON.stringify({canciones:[{id:1,titulo:'Bailando',artista:'Enrique Iglesias',album:'Sex and Love',genero:'Pop latino',duracion:'4:03',portada:'http://127.0.0.1:8099/img/menu/d1-cena.jpg',preview:'',anio:'2014'},{id:2,titulo:'Vivir mi vida',artista:'Marc Anthony',portada:'',preview:''}]})});
  if(u.includes('/api/'))return r.fulfill({status:404,body:'{}'});
  return u.startsWith('http://127.0.0.1:8099')?r.continue():r.abort()});
const abrir=async(tel)=>{const pg=await ctx.newPage();pg.on('pageerror',e=>errs.push(e.message));await pg.goto('http://127.0.0.1:8099/index.html');await pg.waitForTimeout(400);
  if(!(await pg.locator('#lced').count())){await pg.evaluate(()=>{localStorage.removeItem('marea_demo_sesion')});await pg.reload();await pg.waitForTimeout(400)}
  await pg.fill('#lced',tel);await pg.click('#lbtn');await pg.waitForSelector('.hh');return pg};
const A=await abrir('0990000001');await A.evaluate(()=>{localStorage.removeItem('marea_demo_v1')});await A.reload();await A.waitForTimeout(300);
if(await A.locator('#lced').count()){await A.fill('#lced','0990000001');await A.click('#lbtn');await A.waitForSelector('.hh')}
const B=await abrir('0990000002');
console.log('inicio: tarjeta de juegos',await A.locator('#jcard').count());
// TRIVIA
await A.evaluate(()=>{JSUB='trivia';irA('juegos')});await B.evaluate(()=>{JSUB='trivia';irA('juegos')});
await A.click('text=Empezar una trivia');await A.waitForTimeout(400);
await B.waitForSelector('text=¡Trivia lista!',{timeout:5000});console.log('B ve la trivia lista: sí');
await A.click('text=¡Empezar!');await B.waitForSelector('.kbtn',{timeout:5000});console.log('B ve la pregunta con',await B.locator('.kbtn').count(),'botones de colores');
await B.screenshot({path:S+'trivia-q.png'});
const ok=await A.evaluate(()=>JUEGOS.find(j=>j.tipo==='trivia').preguntas[0].ok);
await B.locator('.kbtn').nth(ok).click();await A.locator('.kbtn').nth((ok+1)%4).click();await A.waitForTimeout(300);
await A.click('text=Ver la respuesta');await B.waitForSelector('.kres',{timeout:5000});
console.log('B acertó:',await B.locator('.banner.tide').count()===1,'· A falló:',await A.locator('.banner.warn').count()===1);
await B.screenshot({path:S+'trivia-r.png'});
const pts=await A.evaluate(()=>puntaje(JUEGOS.find(j=>j.tipo==='trivia')).map(x=>[nom(x.id),x.p]));console.log('puntaje:',JSON.stringify(pts));
await A.evaluate(()=>{const j=JUEGOS.find(x=>x.tipo==='trivia');avanzarTrivia(j.id,'fin',j.idx)});await B.waitForSelector('.jg-podio',{timeout:5000});console.log('podio en B: sí');
// ¿QUIÉN ES MÁS PROBABLE?
await A.evaluate(()=>{JSUB='probable';render()});await B.evaluate(()=>{JSUB='probable';render()});
await B.click('text=Empezar (10 rondas)');await A.waitForSelector('.pgrid-i',{timeout:5000});
await A.locator('.pgrid-i').nth(2).click();await B.locator('.pgrid-i').nth(2).click();await B.waitForTimeout(300);
await B.click('text=Ver quién ganó');await A.waitForSelector('.jg-gana',{timeout:5000});console.log('ganador visto por A:',await A.locator('.jg-gana h2').innerText());
// KARAOKE
await A.evaluate(()=>{JSUB='karaoke';render()});await B.evaluate(()=>{JSUB='karaoke';render()});
await A.fill('#kq','bailando');await A.click('.kbus >> text=Buscar');await A.waitForSelector('.kr-i');console.log('resultados iTunes:',await A.locator('.kr-i').count(),'·',(await A.locator('.kr-i').first().innerText()).replace(/\n+/g,' | '),'· portada:',await A.locator('.kr-i img').count());
console.log('ancho de la pantalla (390 = no se sale):',await A.evaluate(()=>document.documentElement.scrollWidth));
await A.waitForTimeout(1500);console.log('sugeridas con portada:',await A.locator('#jsug .kq-i img').count());
await A.locator('.kr-i').first().locator('text=Pedir').click();await A.waitForTimeout(200);
await A.locator('#kpick .avp').nth(1).click();await A.click('text=Agregar a la fila');await A.waitForTimeout(300);
await B.waitForSelector('.k-sigue',{timeout:5000});console.log('B ve quién sigue:',(await B.locator('.k-sigue').innerText()).replace(/\n+/g,' | '),'· con portada:',await B.locator('.k-sigue img.k-sig-img').count());
await A.evaluate(()=>pedirCancion(null));await A.fill('#kt','Vivir mi vida');await A.fill('#ka','Marc Anthony');await A.click('text=Agregar a la fila');await A.waitForTimeout(500);
await B.waitForSelector('#jdin .kq-i',{timeout:5000});console.log('canción escrita a mano · busca su portada sola:',await B.locator('#jdin .kq-i img').count(),'·',(await B.locator('#jdin .kq-i').first().innerText()).replace(/\n+/g,' | '));
await B.click('text=Que empiece');await A.waitForSelector('.k-ahora',{timeout:5000});console.log('A ve «Ahora canta»:',(await A.locator('.k-ahora h2').innerText()));
await A.screenshot({path:S+'karaoke.png',fullPage:true});
await A.click('text=✓ Terminó');await B.waitForSelector('.prem',{timeout:5000});console.log('premios visibles en B:',await B.locator('.prem').count());
await B.locator('.prem').first().locator('.prem-i').first().click();await A.waitForTimeout(2600);console.log('A ve el voto del premio:',await A.locator('.prem-i em').first().innerText());
// el buscador no se borra mientras llegan datos
await A.fill('#kq','vivir');await A.waitForTimeout(2600);console.log('el buscador conserva lo escrito:',await A.inputValue('#kq'));
// PLAYA
await A.evaluate(()=>{JSUB='playa';render()});console.log('actividades:',await A.locator('.act').count());await A.locator('.act').first().locator('text=¡Juguemos!').click();await A.waitForTimeout(200);
console.log('me apunto:',await A.locator('text=✓ Me apunto').count());
await A.screenshot({path:S+'playa.png'});
console.log('errores JS:',errs.length?errs:'ninguno');await b.close();srv.kill();

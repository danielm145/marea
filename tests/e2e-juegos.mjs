// v60 · solo trivia, con DOS teléfonos a la vez (demo comparte el localStorage): un solo mando, modo normal y «responder rápido», podio.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
const srv=spawn('python3',['-m','http.server','8099','--bind','127.0.0.1','-d','/home/user/marea/public'],{stdio:'ignore'});await new Promise(r=>setTimeout(r,800));
const S='/tmp/claude-0/-home-user/5853f958-644c-5d2f-baa4-3130bae7435e/scratchpad/';
const errs=[];const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const ctx=await b.newContext({viewport:{width:390,height:844}});
await ctx.route('**/*',r=>{const u=r.request().url();if(u.includes('/api/'))return r.fulfill({status:404,body:'{}'});return u.startsWith('http://127.0.0.1:8099')?r.continue():r.abort()});
const abrir=async(tel)=>{const pg=await ctx.newPage();pg.on('pageerror',e=>errs.push(e.message));pg.on('dialog',d=>d.accept());await pg.goto('http://127.0.0.1:8099/index.html');await pg.waitForTimeout(400);
  if(!(await pg.locator('#lced').count())){await pg.evaluate(()=>{localStorage.removeItem('marea_demo_sesion')});await pg.reload();await pg.waitForTimeout(400)}
  await pg.fill('#lced',tel);await pg.click('#lbtn');await pg.waitForSelector('.hh');return pg};
const A=await abrir('0990000001');await A.evaluate(()=>{localStorage.removeItem('marea_demo_v1')});await A.reload();await A.waitForTimeout(300);
if(await A.locator('#lced').count()){await A.fill('#lced','0990000001');await A.click('#lbtn');await A.waitForSelector('.hh')}
const B=await abrir('0990000002');
console.log('inicio: tarjeta de trivia',await A.locator('#jcard').count(),'·',(await A.locator('#jcard b').innerText()));
await A.evaluate(()=>irA('juegos'));await B.evaluate(()=>irA('juegos'));
console.log('pestañas de otros juegos:',await A.locator('.jseg').count(),'(debe ser 0) · modos:',await A.locator('.modo').count());
// TRIVIA NORMAL · A lleva el mando
await A.click('text=Empezar · 10 preguntas');await A.waitForTimeout(400);
await B.waitForSelector('text=¡Trivia lista!',{timeout:5000});console.log('B ve la trivia lista:',(await B.locator('.jg-mando').innerText()).replace(/\n/g,' '),'· B tiene botón de empezar:',await B.locator('button:has-text("¡Empezar!")').count());
await B.evaluate(()=>avanzarTrivia(JUEGOS[0].id,'pregunta',0));await B.waitForTimeout(300);console.log('B intentó avanzar · estado sigue:',await B.evaluate(()=>JUEGOS[0].estado));
await A.click('text=¡Empezar!');await B.waitForSelector('.kbtn',{timeout:5000});console.log('B ve la pregunta con',await B.locator('.kbtn').count(),'botones · B tiene «Ver la respuesta»:',await B.locator('button:has-text("Ver la respuesta")').count());
await B.screenshot({path:S+'trivia-q.png'});
const ok=await A.evaluate(()=>JUEGOS.find(j=>j.tipo==='trivia').preguntas[0].ok);
await B.locator('.kbtn').nth(ok).click();await A.waitForTimeout(2600);console.log('A ve la cara de B entre los que respondieron:',await A.locator('.jg-caras .av').count());
await A.locator('.kbtn').nth((ok+1)%4).click();await A.waitForTimeout(300);
await A.click('text=Ver la respuesta');await B.waitForSelector('.kres',{timeout:5000});
console.log('B acertó:',await B.locator('.banner.tide').count()===1,'· A falló:',await A.locator('.banner.warn').count()===1,'· B tiene «Siguiente»:',await B.locator('button:has-text("Siguiente pregunta")').count(),'· A ve «Sigue sola en»:',(await A.locator('#jauto').innerText()).slice(0,14));
await B.screenshot({path:S+'trivia-r.png'});
const pts=await A.evaluate(()=>puntaje(JUEGOS.find(j=>j.tipo==='trivia')).map(x=>[nom(x.id),x.p]));console.log('puntaje:',JSON.stringify(pts));
await A.evaluate(()=>{const j=JUEGOS.find(x=>x.tipo==='trivia');avanzarTrivia(j.id,'fin',j.idx)});await B.waitForSelector('.jg-podio',{timeout:5000});console.log('podio en B: sí');
// RESPONDER RÁPIDO · B lleva el mando esta vez
await B.evaluate(()=>{TMODO='rapido';pintarJuegos()});await B.click('text=Empezar · 10 preguntas');await A.waitForSelector('text=¡Responder rápido lista!',{timeout:5000});
console.log('rápida:',await A.evaluate(()=>{const j=JUEGOS.find(x=>x.tipo==='trivia'&&x.estado!=='fin');return j.segundos+' s · mando '+nom(j.host)}));
await B.click('text=¡Empezar!');await A.waitForSelector('.kbtn',{timeout:5000});
const ok2=await A.evaluate(()=>JUEGOS.find(j=>j.tipo==='trivia'&&j.estado!=='fin').preguntas[0].ok);await A.locator('.kbtn').nth(ok2).click();await A.waitForTimeout(300);
console.log('puntos en rápida (≈2000):',await A.evaluate(()=>JRESP.filter(r=>r.juego_id===JUEGOS.find(j=>j.tipo==='trivia'&&j.estado!=='fin').id)[0].puntos));
await A.screenshot({path:S+'trivia-rapida.png'});
console.log('errores JS:',errs.length?errs:'ninguno');await b.close();srv.kill();

// v52 · liquidar con menos transferencias, juegos de carro sin internet, canciones del karaoke, desayunos, carros, looks con Insta + IA
import { chromium } from 'playwright';
const S='/tmp/claude-0/-home-user/5853f958-644c-5d2f-baa4-3130bae7435e/scratchpad/';
const errs=[];const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await (await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2})).newPage();pg.on('pageerror',e=>errs.push(e.message));
await pg.route('**/*',r=>{const u=r.request().url();return u.startsWith('file:')?r.continue():r.abort()});
await pg.goto('file:///home/user/marea/public/index.html');await pg.evaluate(()=>localStorage.clear());await pg.reload();await pg.waitForTimeout(400);
await pg.fill('#lced','0990000001');await pg.click('#lbtn');await pg.waitForSelector('.hh');
// LIQUIDAR
await pg.evaluate(()=>{SUBG='bal';irA('gastos')});await pg.waitForTimeout(300);
console.log('botón al final:',await pg.locator('.liq-c').count(),'·',(await pg.locator('.liq-c .muted').innerText()));
await pg.click('text=Ver cómo liquidar y por qué');await pg.waitForTimeout(300);
const r=await pg.evaluate(()=>{const T=simplificar(balances()),bs=balances();const M={};T.forEach(t=>{M[t.de]=(M[t.de]||0)+t.monto;M[t.a]=(M[t.a]||0)-t.monto});return {transf:T.length,deudas:deudasGrupo().length,todosEnCero:bs.every(b=>Math.abs(b.saldo+(M[b.id]||0))<0.02)}});
console.log('liquidar:',JSON.stringify(r),'· explicaciones:',await pg.locator('.liq-p').count(),'· ceros comprobados:',(await pg.locator('#sheetBody .liq-s b').allInnerTexts()).filter(x=>x==='= $0,00').length);
await pg.screenshot({path:S+'liquidar.png',fullPage:true});
await pg.locator('text=Ya se hizo: registrar este pago').first().click();await pg.waitForTimeout(300);console.log('abre el pago:',await pg.evaluate(()=>F&&F.tipo));
await pg.evaluate(()=>closeSheet());
// (v60: los juegos de carro y el karaoke salieron de la app: solo trivia)
// DESAYUNO
await pg.evaluate(()=>{DIA_MENU=diasViaje()[1];SUBM='carta';irA('menu')});await pg.waitForTimeout(300);
console.log('desayuno:',await pg.locator('.carta-t').first().innerText(),'·',(await pg.locator('.incl span').allInnerTexts()).join(' | '),'· opciones:',(await pg.locator('.opt-n').allInnerTexts()).join(' / '));
await pg.screenshot({path:S+'desayuno.png'});
// CARROS
await pg.evaluate(()=>irA('hoy'));await pg.waitForTimeout(200);console.log('carros:',(await pg.locator('.carro2').allInnerTexts()).map(t=>t.replace(/\n+/g,' | ')));
// LOOKS: subir Insta + descripción + guía (sin IA en file:// → guía con el look)
await pg.evaluate(()=>{SUBE='dress';irA('planes')});await pg.waitForTimeout(300);
await pg.locator('.lk-insta input[type=file]').first().setInputFiles(['/home/user/marea/public/img/looks/welcome-white.jpg','/home/user/marea/public/img/looks/golden-hour.jpg']);await pg.waitForTimeout(2500);
console.log('fotos de Insta:',await pg.locator('.lk-fotos button').count(),'· guía:',await pg.locator('.lk-guia').count());
await pg.locator('.lk-insta textarea').first().fill('Todos de blanco, ellas con dorado');await pg.locator('.lk-insta .out-b').first().click();await pg.waitForTimeout(1500);
console.log('guía guardada con la descripción:',await pg.evaluate(()=>(guiaDe('Welcome White Night').descripcion||'')),'·',(await pg.locator('.lk-guia').first().innerText()).slice(0,120).replace(/\n/g,' | '));
await pg.locator('.lk-insta').first().screenshot({path:S+'look-insta.png'});
console.log('errores JS:',errs.length?errs:'ninguno');await b.close();

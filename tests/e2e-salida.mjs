import { chromium } from 'playwright';
// v47: la alerta de salida (hoy 9 oct, 8:00 a.m., Cumbayá) y «Todo del viaje»
const errs=[];const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,timezoneId:'America/Guayaquil'});
await ctx.addInitScript(()=>{const real=Date;const fijo=new real('2026-10-09T01:40:00-05:00').getTime();const off=fijo-real.now();class D extends real{constructor(...a){super(...(a.length?a:[real.now()+off]))}static now(){return real.now()+off}};window.Date=D});
const pg=await ctx.newPage();pg.on('pageerror',e=>errs.push(e.message));
await pg.route('**/*',r=>{const u=r.request().url();return u.startsWith('file:')?r.continue():r.abort()});
await pg.goto('file:///home/user/marea/public/index.html');await pg.evaluate(()=>localStorage.clear());await pg.reload();await pg.waitForTimeout(400);
await pg.fill('#lced','0990000001');await pg.click('#lbtn');await pg.waitForSelector('.hh');
console.log('alerta:',await pg.locator('.sal').count(),'·',(await pg.locator('.sal-in').innerText().catch(()=>'')).replace(/\n/g,' | '));
await pg.locator('.sal').scrollIntoViewIfNeeded();await pg.screenshot({path:'/tmp/claude-0/-home-user/5853f958-644c-5d2f-baa4-3130bae7435e/scratchpad/salida.png'});
await pg.click('.todo-c');await pg.waitForTimeout(300);
console.log('todo del viaje · secciones:',await pg.locator('.todo-s').count(),'· botones mapa:',await pg.locator('#sheetBody a:has-text("Google Maps"), #sheetBody a:has-text("Waze")').count(),'· whatsapp:',await pg.locator('#sheetBody a:has-text("WhatsApp")').count());
await pg.screenshot({path:'/tmp/claude-0/-home-user/5853f958-644c-5d2f-baa4-3130bae7435e/scratchpad/todo.png'});
console.log('errores JS:',errs.length?errs:'ninguno');await b.close();

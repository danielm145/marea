import { chromium } from 'playwright';
const errs=[];const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2});
await ctx.addInitScript(()=>{const real=Date;const off=new real('2026-10-09T02:00:00-05:00').getTime()-real.now();class D extends real{constructor(...a){super(...(a.length?a:[real.now()+off]))}static now(){return real.now()+off}};window.Date=D});
const pg=await ctx.newPage();pg.on('pageerror',e=>errs.push(e.message));
await pg.route('**/*',r=>{const u=r.request().url();return u.startsWith('file:')?r.continue():r.abort()});
await pg.goto('file:///home/user/marea/public/index.html');await pg.evaluate(()=>localStorage.clear());await pg.reload();await pg.waitForTimeout(400);
await pg.fill('#lced','0990000001');await pg.click('#lbtn');await pg.waitForSelector('.hh');
// como quedan en la base con sql/018
await pg.evaluate(()=>{const id=n=>activos().find(p=>norm(p.nombre).startsWith(n)).id;
  VEHICULOS=[{id:'v1',nombre:'Lexus de Kevin',conductor:id('kevin'),puestos:5,maletas:5,nota:'Maneja Kevin'},{id:'v2',nombre:'Amarok de Lenin',conductor:id('daniel'),puestos:5,maletas:6,nota:'Copiloto: Ana Paula'}];
  PASAJEROS=[...['alegria','domenika','natalia'].map(n=>({vehiculo_id:'v1',persona_id:id(n),trayecto:'ida'})),...['ana paula','amelia'].map(n=>({vehiculo_id:'v2',persona_id:id(n),trayecto:'ida'}))];render()});
await pg.waitForTimeout(300);
console.log('carros:',await pg.locator('.carro').count(),'·',(await pg.locator('.carro-in').allInnerTexts()).map(t=>t.replace(/\n+/g,' | ')));
await pg.locator('.carros').scrollIntoViewIfNeeded();await pg.screenshot({path:'/tmp/claude-0/-home-user/5853f958-644c-5d2f-baa4-3130bae7435e/scratchpad/carros.png'});
await pg.click('.todo-c');await pg.waitForTimeout(300);console.log('en Todo del viaje:',await pg.locator('#sheetBody .carro').count(),'· WhatsApp lleva carros:',decodeURIComponent(await pg.getAttribute('#sheetBody a:has-text("WhatsApp")','href')).includes('Lexus de Kevin'));
console.log('errores JS:',errs.length?errs:'ninguno');await b.close();

import { chromium } from 'playwright';
const errs=[], log=(...a)=>console.log(...a);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await (await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2})).newPage();
pg.on('pageerror',e=>errs.push(e.message)); pg.on('console',m=>{if(m.type()==='error'&&!/ERR_FAILED|404/.test(m.text()))errs.push(m.text())});
await pg.route('**/*',r=>{const u=r.request().url();return u.startsWith('file:')||/fonts\.(googleapis|gstatic)/.test(u)?r.continue():r.abort()});
await pg.goto('file:///home/user/marea/public/index.html');
await pg.evaluate(()=>{try{localStorage.clear()}catch(e){}}); await pg.reload(); await pg.waitForTimeout(700);
await pg.screenshot({path:'v7-01-login.png'});
await pg.fill('#lced','100000001'); await pg.fill('#lpin','2026'); await pg.click('#lbtn'); await pg.waitForSelector('.hero'); await pg.waitForTimeout(500);
await pg.screenshot({path:'v7-02-hoy.png'});
log('rapido:', (await pg.locator('.rapido button').allInnerTexts()).join(' | '));
log('scrollW', await pg.evaluate(()=>document.documentElement.scrollWidth));
await pg.click('.rapido button:nth-child(4)'); await pg.waitForTimeout(200); log('fotos tab ok:', await pg.locator('.tab[aria-current=page]').innerText());
// tareas automáticas
await pg.click('.tab:nth-child(5)'); await pg.waitForTimeout(300);
log('tareas h2:', (await pg.$$eval('#main h2,#main summary',x=>x.map(e=>e.textContent.trim()))).join(' | '));
const antes=await pg.locator('#main .tcheck, #main [onclick^="hecha("]').count(); log('checks', antes);
const rep=pg.locator('#main button:has-text("Repartir")'); if(await rep.count()){await rep.first().click(); await pg.waitForTimeout(400); log('tras repartir:', (await pg.$$eval('#main h2,#main summary',x=>x.map(e=>e.textContent.trim()))).join(' | '))}
await pg.screenshot({path:'v7-03-tareas.png'});
// lo esencial: casa
await pg.click('.tab:nth-child(1)'); const ch=pg.locator('#main .chips button, #main .esc-chip').first(); 
const casaBtn=pg.locator('#main button:has-text("Casa"), #main button:has-text("casa")').first();
if(await casaBtn.count()){await casaBtn.click(); await pg.waitForTimeout(300); log('casa:', (await pg.locator('#sheetBody').innerText()).slice(0,260).replace(/\n+/g,' / ')); await pg.screenshot({path:'v7-04-casa.png'}); await pg.keyboard.press('Escape')} else log('no hay chip casa');
log('errores:', errs.length? errs: 'ninguno');
await b.close();

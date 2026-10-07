import { chromium } from 'playwright';
const errs=[], log=(...a)=>console.log(...a);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await (await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2})).newPage();
pg.on('pageerror',e=>errs.push(e.message)); pg.on('console',m=>{if(m.type()==='error'&&!/ERR_FAILED/.test(m.text()))errs.push(m.text())});
await pg.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.abort());
await pg.goto('file:///home/user/marea/public/index.html');
await pg.fill('#lced','0990000001'); await pg.fill('#lpin','1001'); await pg.click('#lbtn'); await pg.waitForSelector('.hh');
await pg.evaluate(()=>{SUBE='info';irA('planes')}); log('lo esencial:', (await pg.$$eval('#main .item .t',x=>x.map(e=>e.textContent))).join(', '));
await pg.click('#main .item:has-text("Qué llevar")'); log('qué llevar ítems:', await pg.locator('#sheetBody .sub-item').count()); await pg.keyboard.press('Escape');
await pg.screenshot({path:'v4-01-hoy.png'});
await pg.evaluate(()=>irA('admin')); await pg.waitForSelector('.tiles');
log('tiles:', (await pg.locator('.tiles').innerText()).replace(/\n/g,' '));
await pg.screenshot({path:'v4-02-admin.png'});
await pg.click('text=Invitar a los que no han entrado'); await pg.click('text=Armar'); await pg.waitForSelector('text=Invitaciones listas');
log('invitaciones:', await pg.locator('#sheetBody .item').count()); await pg.keyboard.press('Escape');
await pg.waitForTimeout(200); log('tiles después:', (await pg.locator('.tiles').innerText()).replace(/\n/g,' '));
await pg.click('.chips.scroll .chip >> text=Invitados sin entrar'); log('invitados sin entrar:', await pg.locator('#main .card .item').count());
// llenar lo esencial con la lectura rápida
await pg.click('text=Llenar con IA'); await pg.fill('#in_ia','La casa queda en Same, vía a Tonsupa km 3. Check-in 3pm y salida 12. WiFi CasaSame clave playa2026.\nCocinera Rosa: 0991234567\nNo se permite fumar adentro');
await pg.click('#in_iab'); await pg.waitForTimeout(300);
log('lectura info:', await pg.inputValue('#in_direccion'),'|',await pg.inputValue('#in_checkin'),'|',await pg.inputValue('#in_wifi_red'),'|',await pg.inputValue('#in_wifi_clave'));
log('contactos:', (await pg.inputValue('#in_contactos')).replace(/\n/g,' / '), '| reglas:', (await pg.inputValue('#in_reglas')).split('\n').slice(-1)[0]);
await pg.click('#sheetBody button.btn.primary.block'); await pg.waitForTimeout(200);
// mensaje de invitación
await pg.click('#main .card .item >> nth=0'); await pg.click('text=Enviar invitación por WhatsApp'); await pg.waitForSelector('#wa_msg');
log('MENSAJE:\n'+await pg.inputValue('#wa_msg')); await pg.screenshot({path:'v4-03-pin.png'}); await pg.keyboard.press('Escape');
// la cédula queda recordada
await pg.evaluate(()=>salir()); log('cédula recordada:', await pg.inputValue('#lced'));
log('scrollWidth:', await pg.evaluate(()=>document.documentElement.scrollWidth)); log('ERRORES:', errs.length?errs.join('\n'):'ninguno');
await b.close();

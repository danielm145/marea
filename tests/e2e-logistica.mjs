import { chromium } from 'playwright';
const errs=[], log=(...a)=>console.log(...a);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await (await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2})).newPage();
pg.on('pageerror',e=>errs.push(e.message)); pg.on('console',m=>{if(m.type()==='error'&&!/ERR_FAILED|ERR_FILE_NOT_FOUND/.test(m.text()))errs.push(m.text())});
await pg.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.abort());
await pg.goto('file:///home/user/marea/public/index.html');
await pg.evaluate(()=>{try{localStorage.clear()}catch(e){}}); await pg.reload();
await pg.fill('#lced','0990000006');  await pg.click('#lbtn'); await pg.waitForSelector('.hh');  // Ana Cris
log('hoy:', (await pg.locator('.hh-in').innerText()).replace(/\n/g,' '));
await pg.evaluate(()=>{SUBE='programa';DIA_PLAN=diasViaje()[1];irA('planes')}); await pg.waitForSelector('.tl3');
log('día 1:', (await pg.locator('.tl3').innerText()).split('\n').filter(Boolean).slice(0,16).join(' · '));
await pg.screenshot({path:'v6-01-itinerario.png'});
await pg.click('text=Looks'); log('dress:', (await pg.$$eval('#main .card h3',x=>x.map(e=>e.textContent))).join(' | '));
// Equipo
await pg.evaluate(()=>irA('tareas')); await pg.click('#main .seg >> text=Cosas'); await pg.waitForSelector('#main .item');
log('equipo:', await pg.locator('#main .item').count(), 'cosas');
await pg.click('#main .item >> text=Proyector'); await pg.click('text=Yo lo llevo'); await pg.waitForTimeout(150);
log('proyector:', await pg.locator('#sheetBody button:has-text("Ya no lo llevo")').count()?'lo llevo yo':'FALLA'); await pg.keyboard.press('Escape');
await pg.screenshot({path:'v6-02-equipo.png'});
// Carros
await pg.click('#main .seg >> text=Carros'); await pg.waitForSelector('#main .card .amt');
log('puestos por carro:', (await pg.locator('#main .card .amt').allInnerTexts()).join(' | '));
await pg.screenshot({path:'v6-03-carros.png'});
// llenar el carro y probar que no deja pasar
const r=await pg.evaluate(async()=>{const v=VEHICULOS[1];for(const pid of ['p08','p09'])await API.setPasajero({vehiculo_id:v.id,trayecto:'ida',maletas:1},pid);await cargar();render();return PASAJEROS.filter(p=>p.vehiculo_id===v.id&&p.trayecto==='ida').length});
log('ocupados Kevin L.:', r, '| botón:', await pg.locator('#main .card >> nth=1 >> button.btn.block').count()?await pg.locator('#main .card >> nth=1 >> button.btn.block').textContent():'(está subida)');
// presupuesto con equipos y trípodes
await pg.evaluate(()=>irA('gastos')); await pg.click('text=Dashboard'); log('dashboard:', await pg.locator('.db-n').innerText());
// menú día 1: cena ligera
await pg.click('.tab:nth-child(3)'); log('cenas día 1:', (await pg.$$eval('.carta .carta-t',x=>x.map(e=>e.textContent))).join(' | '));
log('scrollWidth:', await pg.evaluate(()=>document.documentElement.scrollWidth)); log('ERRORES:', errs.length?errs.join('\n'):'ninguno');
await b.close();

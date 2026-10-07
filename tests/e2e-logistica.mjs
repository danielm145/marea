import { chromium } from 'playwright';
const errs=[], log=(...a)=>console.log(...a);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await (await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2})).newPage();
pg.on('pageerror',e=>errs.push(e.message)); pg.on('console',m=>{if(m.type()==='error'&&!/ERR_FAILED/.test(m.text()))errs.push(m.text())});
await pg.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.abort());
await pg.goto('file:///home/user/marea/public/index.html');
await pg.evaluate(()=>{try{localStorage.clear()}catch(e){}}); await pg.reload();
await pg.fill('#lced','100000006'); await pg.fill('#lpin','2026'); await pg.click('#lbtn'); await pg.waitForSelector('.hero');  // Ana Cris
log('cuenta regresiva:', (await pg.locator('.hero .row').innerText()).replace(/\n/g,' '));
await pg.click('.tab:nth-child(4)'); await pg.waitForSelector('.day');
log('día 1:', (await pg.locator('.day').nth(0).innerText()).split('\n').filter(Boolean).slice(0,16).join(' · '));
log('día 2 orden:', (await pg.$$eval('.day >> nth=1',()=>0).catch(()=>0)), (await pg.locator('.day').nth(1).locator('.t, .meal div div:last-child').allInnerTexts()).join(' → '));
await pg.screenshot({path:'v6-01-itinerario.png'});
await pg.click('text=Dress code'); log('dress:', (await pg.$$eval('#main .card h3',x=>x.map(e=>e.textContent))).join(' | '));
// Equipo
await pg.click('.tab:nth-child(5)'); await pg.click('#main .seg >> text=Equipo'); await pg.waitForSelector('.ah-t');
log('equipo:', await pg.textContent('.ah-t'), '|', await pg.locator('#main .item').count(), 'cosas');
await pg.click('#main .item >> text=Proyector'); await pg.click('text=Yo lo llevo'); await pg.waitForTimeout(150);
log('proyector:', await pg.locator('#sheetBody button:has-text("Ya no lo llevo")').count()?'lo llevo yo':'FALLA'); await pg.keyboard.press('Escape');
await pg.screenshot({path:'v6-02-equipo.png'});
// Carros
await pg.click('#main .seg >> text=Carros'); await pg.waitForSelector('#main .card .amt');
log('sin puesto ida:', (await pg.locator('.banner').innerText()).slice(0,120));
await pg.click('#main .card >> nth=1 >> text=Me subo aquí'); await pg.waitForTimeout(150);
log('carro Kevin L. puestos:', await pg.locator('#main .card >> nth=1 >> .amt >> nth=0').textContent());
await pg.click('#main .card >> nth=1 >> .chip >> text=2'); await pg.waitForTimeout(100);
log('maletas:', await pg.locator('#main .card >> nth=1 >> .amt >> nth=1').textContent());
await pg.screenshot({path:'v6-03-carros.png'});
// llenar el carro y probar que no deja pasar
const r=await pg.evaluate(async()=>{const v=VEHICULOS[1];for(const pid of ['p08','p09'])await API.setPasajero({vehiculo_id:v.id,trayecto:'ida',maletas:1},pid);await cargar();render();return PASAJEROS.filter(p=>p.vehiculo_id===v.id&&p.trayecto==='ida').length});
log('ocupados Kevin L.:', r, '| botón:', await pg.locator('#main .card >> nth=1 >> button.btn.block').count()?await pg.locator('#main .card >> nth=1 >> button.btn.block').textContent():'(está subida)');
// presupuesto con equipos y trípodes
await pg.click('.tab:nth-child(2)'); await pg.click('text=Presupuesto'); log('rubros:', (await pg.$$eval('#main .card b.grow',x=>x.map(e=>e.textContent))).join(', '));
// menú día 1: cena ligera
await pg.click('.tab:nth-child(3)'); log('cenas día 1:', (await pg.$$eval('.carta .carta-t',x=>x.map(e=>e.textContent))).join(' | '));
log('scrollWidth:', await pg.evaluate(()=>document.documentElement.scrollWidth)); log('ERRORES:', errs.length?errs.join('\n'):'ninguno');
await b.close();

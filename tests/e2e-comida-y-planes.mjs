import { chromium } from 'playwright';
const errs=[], log=(...a)=>console.log(...a);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2});
const pg=await ctx.newPage();
pg.on('pageerror',e=>errs.push('pageerror: '+e.message));
pg.on('console',m=>{if(m.type()==='error'&&!/ERR_FAILED/.test(m.text()))errs.push('console: '+m.text())});
await pg.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.abort());
await pg.goto('file:///home/user/marea/public/index.html');
const shot=n=>pg.screenshot({path:`/tmp/marea-test/v2-${n}.png`});
const esc=()=>pg.keyboard.press('Escape');
// Alegría (100000003)
await pg.fill('#lced','0990000003'); await pg.fill('#lpin','1211'); await pg.click('#lbtn'); await pg.waitForSelector('.hh');
log('pestañas:', (await pg.$$eval('.tab span',x=>x.map(e=>e.textContent))).join(','));
log('lugar:', await pg.textContent('.hh-l'));
await shot('01-hoy');
// MENÚ
await pg.click('.tab:nth-child(3)'); await pg.evaluate(()=>{SUBM='carta';render()}); await pg.waitForSelector('.carta'); await pg.evaluate(()=>{DIA_MENU=diasViaje()[1];render()}); await pg.waitForSelector('.carta'); await shot('02-menu-dia1');
log('día 1 comidas:', (await pg.$$eval('.carta .carta-t',x=>x.map(e=>e.textContent))).join(' | '));
log('día 1 platos:', (await pg.$$eval('.carta .plato-n',x=>x.map(e=>e.textContent))).join(' | '));
// elegir A en el desayuno
await pg.locator('.opt-go').first().click(); await pg.waitForTimeout(300);
log('desayuno elegido:', await pg.locator('.opt.sel .opt-n').innerText());
// día 3: arroz marinero → alerta para Alegría
await pg.click('.dch button >> nth=3'); await pg.waitForSelector('.carta');
const alerta=await pg.locator('.carta .banner.warn').allTextContents(); log('alertas día 3:', alerta.join(' / ')||'(ninguna)');
log('pedidos especiales día 3:', (await pg.locator('.carta >> text=Pedidos especiales').count()));
await shot('03-menu-dia3');
// abrir plato y completar con IA local
await pg.click('.dish >> text=Arroz marinero'); await pg.waitForSelector('#sheetBody .pl-h');
log('alérgenos arroz:', (await pg.$$eval('#sheetBody .pill.warn',x=>x.map(e=>e.textContent))).join(', '));
log('no apto:', (await pg.locator('#sheetBody .banner.bad').count())?(await pg.locator('#sheetBody .banner.bad').textContent()).trim():'nadie (el arroz de Kevin no lleva conchas)');
await shot('04-plato'); await esc();
// lista de compras
await pg.click('text=Lista de compras'); await pg.waitForSelector('.sub-item'); await pg.click('text=Todo el viaje');
log('pasillos:', (await pg.$$eval('.card .eyebrow[style*="tide"]',x=>x.map(e=>e.textContent))).join(', '));
log('ítems compras:', await pg.locator('.sub-item').count());
await shot('05-compras');
// GASTOS: presupuesto y facturas
await pg.evaluate(()=>irA('gastos')); await pg.click('text=Presupuesto'); await pg.waitForSelector('.pbar'); await shot('06-presupuesto');
log('rubros:', (await pg.$$eval('.pbar',x=>x.length)), '|', (await pg.locator('#main .card >> nth=0').innerText()).replace(/\n/g,' '));
await pg.click('text=Facturas'); log('facturas vacío:', await pg.locator('.empty').count());
await pg.click('text=Movimientos'); await pg.click('#glist .item >> text=Despensa de llegada'); await pg.waitForSelector('#sheetBody table');
log('factura detalle filas:', await pg.locator('#sheetBody table tbody tr').count()); await shot('07-gasto-factura'); await esc();
// PLANES: itinerario con comidas + dress code
await pg.evaluate(()=>{SUBE='programa';DIA_PLAN=diasViaje()[2];irA('planes')}); await pg.waitForSelector('.tl2');
log('día 2 itinerario:', (await pg.locator('.tl2').innerText()).split('\n').filter(Boolean).slice(0,14).join(' · '));
await shot('08-itinerario');
await pg.click('text=Looks'); await pg.waitForSelector('.swatch'); await shot('09-dress');
log('dress codes:', (await pg.$$eval('#main .card h3',x=>x.map(e=>e.textContent))).join(' | '));
// TAREAS desde texto dictado
await pg.click('.fab'); await pg.click('#lmodo button:has-text("Pendientes")');
await pg.fill('#ltxt','Comprar 3 fundas de hielo, carbón para el asado del sábado y llevar los dos micrófonos para el karaoke');
await pg.click('#lgo'); await pg.waitForSelector('#sheetBody input[data-i]');
log('tareas propuestas:\n  '+(await pg.$$eval('#sheetBody .sub-item',x=>x.map(e=>e.innerText.replace(/\n/g,' — ')))).join('\n  '));
await shot('10-tareas-propuestas');
await pg.click('text=Crear las marcadas'); await pg.waitForSelector('.trow'); await shot('11-tareas');
// Mi ficha: restricciones + talento
await pg.evaluate(()=>abrirMiPerfil()); await pg.fill('#pf_talento','Imitaciones de profesores'); await pg.click('text=Guardar mi ficha'); await pg.waitForTimeout(150);
// Admin
await pg.evaluate(()=>salir()); await pg.fill('#lced','0990000001'); await pg.fill('#lpin','1001'); await pg.click('#lbtn'); await pg.waitForSelector('.hh');
await pg.evaluate(()=>irA('admin')); await pg.waitForSelector('text=Comida y presupuesto'); await shot('12-admin');
log('invitados admin:', await pg.locator('#main .item').count());
// Talent show muestra el talento de Alegría
await pg.evaluate(()=>abrirEvento(EVENTOS.find(e=>/Talent/.test(e.titulo)).id)); await pg.waitForSelector('text=Programa del show');
log('programa del show:', (await pg.locator('#sheetBody .card >> text=Programa del show >> xpath=..').innerText()).replace(/\n/g,' '));
await esc();
// sin fechas → menú pide fechas
const sum=await pg.evaluate(()=>balances().reduce((a,b)=>a+b.saldo,0)); log('suma de saldos:',sum.toFixed(2));
await pg.emulateMedia({colorScheme:'dark'}); await pg.click('.tab:nth-child(3)'); await shot('13-menu-noche');
log('scrollWidth:', await pg.evaluate(()=>document.documentElement.scrollWidth));
log('ERRORES:', errs.length?errs.join('\n'):'ninguno');
await b.close();

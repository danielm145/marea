import { chromium } from 'playwright';
const errs=[];const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await (await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2})).newPage();pg.on('pageerror',e=>errs.push(e.message));
await pg.route('**/*',r=>{const u=r.request().url();return u.startsWith('file:')||/fonts\.(googleapis|gstatic)/.test(u)?r.continue():r.abort()});
await pg.goto('file:///home/user/marea/public/index.html');
// un teléfono con la demo vieja y fechas raras (2 oct – 9 nov) se re-siembra con las reales
await pg.evaluate(()=>{try{localStorage.clear();localStorage.setItem('marea_demo_v1',JSON.stringify({v:14,config:{desde:'2026-10-02',hasta:'2026-11-09'}}))}catch(e){}});await pg.reload();await pg.waitForTimeout(500);
await pg.fill('#lced','0990000001');await pg.fill('#lpin','1001');await pg.click('#lbtn');await pg.waitForSelector('.hh');
console.log('portada:',(await pg.locator('.hh-f').innerText()),'· días:',await pg.locator('.st b').first().innerText());
console.log('botones en la tarjeta IA:',await pg.locator('.iac').count(),'(es un solo botón:',await pg.evaluate(()=>document.querySelector('.iac').tagName),')');
await pg.screenshot({path:'f-1-hoy.png'});
await pg.click('.iac');await pg.waitForSelector('#ltxt');await pg.waitForTimeout(400);
console.log('pantalla:',await pg.locator('#sheetTitle').innerText(),'· botones grandes:',await pg.locator('#sheetBody .btn').count(),'· pestañas:',await pg.locator('#lmodo').count());
await pg.screenshot({path:'f-2-registrar.png'});
// cambiar las fechas diciéndoselo a la IA
await pg.evaluate(()=>{API.saveConfig({desde:'2026-10-02',hasta:'2026-11-09'});return cargar()});
await pg.fill('#ltxt','El viaje es del 28 de octubre al 1 de noviembre');await pg.click('#lgo');await pg.waitForSelector('.vj-f');
console.log('hoja viaje:',(await pg.locator('#sheetBody .card').innerText()).replace(/\n+/g,' | '));
await pg.waitForTimeout(1200);await pg.screenshot({path:'f-3-viaje.png'});
await pg.click('#sheetBody .btn.primary');await pg.waitForTimeout(500);
console.log('guardado:',await pg.evaluate(()=>CFG.desde+' → '+CFG.hasta),'· portada:',await pg.locator('.hh-f').innerText());
// el formulario de admin avisa si ponen 38 días
pg.on('dialog',d=>{console.log('aviso admin:',d.message());d.dismiss()});
await pg.evaluate(()=>{irA('admin')});await pg.waitForTimeout(300);
const hay=await pg.locator('#cv_d').count();if(hay){await pg.fill('#cv_d','2026-10-02');await pg.fill('#cv_h','2026-11-09');await pg.evaluate(()=>guardarViaje());await pg.waitForTimeout(300);console.log('tras cancelar sigue:',await pg.evaluate(()=>CFG.desde+' → '+CFG.hasta))}else console.log('(sin formulario de viaje visible en admin)');
console.log('errores:',errs.length?errs:'ninguno');await b.close();

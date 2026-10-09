import { chromium } from 'playwright';
// v35: en el inicio, debajo de la factura, «Subir fotos del viaje» (varias, al álbum)
const errs=[];const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await (await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2})).newPage();pg.on('pageerror',e=>errs.push(e.message));
await pg.route('**/*',r=>{const u=r.request().url();return u.startsWith('file:')?r.continue():r.abort()});
await pg.goto('file:///home/user/marea/public/index.html');await pg.evaluate(()=>localStorage.clear());await pg.reload();await pg.waitForTimeout(400);
await pg.fill('#lced','0990000001');await pg.click('#lbtn');await pg.waitForSelector('.hh');
console.log('debajo de la factura:',await pg.evaluate(()=>document.querySelector('.iac2').nextElementSibling.className),'· varias:',await pg.getAttribute('.subir-f input','multiple')!==null);
await pg.locator('.iac2').scrollIntoViewIfNeeded();await pg.screenshot({path:'/tmp/claude-0/-home-user/5853f958-644c-5d2f-baa4-3130bae7435e/scratchpad/inicio-v35.png'});
await pg.setInputFiles('.subir-f input',['/home/user/marea/public/img/gente/kevin-lopez.jpg','/home/user/marea/public/img/gente/alegria.jpg']);
await pg.waitForTimeout(800);console.log('hoja para subir abierta:',await pg.locator('#sheet:not([hidden])').count());
console.log('errores JS:',errs.length?errs:'ninguno');await b.close();

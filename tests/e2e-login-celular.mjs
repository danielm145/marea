import { chromium } from 'playwright';
// v33: se entra SOLO con el celular (sin clave)
const errs=[];const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await (await b.newContext({viewport:{width:390,height:844}})).newPage();pg.on('pageerror',e=>errs.push(e.message));
await pg.route('**/*',r=>{const u=r.request().url();return u.startsWith('file:')?r.continue():r.abort()});
await pg.goto('file:///home/user/marea/public/index.html');await pg.evaluate(()=>localStorage.clear());await pg.reload();await pg.waitForTimeout(400);
console.log('campo de clave:',await pg.locator('#lpin').count());
const intento=async t=>{await pg.fill('#lced',t);await pg.click('#lbtn');await pg.waitForTimeout(300);return await pg.locator('.hh').count()?'ENTRÓ':await pg.locator('#lerr').innerText()};
console.log('celular que no está →',await intento('0991234567'));
console.log('celular de Daniel   →',await intento('0990000001'));
console.log('errores JS:',errs.length?errs:'ninguno');await b.close();

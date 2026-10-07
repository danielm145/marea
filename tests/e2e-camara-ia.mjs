import { chromium } from 'playwright';
// v32: la cámara con IA del inicio: foto → hoja de registrar con la foto puesta
const errs=[];const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await (await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2})).newPage();pg.on('pageerror',e=>errs.push(e.message));
await pg.route('**/*',r=>{const u=r.request().url();return u.startsWith('file:')?r.continue():r.abort()});
await pg.goto('file:///home/user/marea/public/index.html');await pg.evaluate(()=>localStorage.clear());await pg.reload();await pg.waitForTimeout(400);
await pg.fill('#lced','0990000001');await pg.click('#lbtn');await pg.waitForSelector('.hh');
console.log('tarjeta cámara:',await pg.locator('.cam-ia').count(),'· capture:',await pg.getAttribute('.cam-ia input','capture'),'· estrella Gemini:',await pg.locator('.cam-gem svg').count());
await pg.locator('.iac2').scrollIntoViewIfNeeded();await pg.screenshot({path:'/tmp/claude-0/-home-user/5853f958-644c-5d2f-baa4-3130bae7435e/scratchpad/cam-home.png'});
await pg.setInputFiles('.cam-ia input','/home/user/marea/public/img/gente/kevin-lopez.jpg');
await pg.waitForSelector('#lthumb:not([hidden])',{timeout:5000});
console.log('hoja abierta con la foto:',await pg.locator('#lfotob span').innerText(),'· placeholder:',await pg.getAttribute('#ltxt','placeholder'));
await pg.screenshot({path:'/tmp/claude-0/-home-user/5853f958-644c-5d2f-baa4-3130bae7435e/scratchpad/cam-hoja.png'});
console.log('errores JS:',errs.length?errs:'ninguno');await b.close();

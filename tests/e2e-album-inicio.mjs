import { chromium } from 'playwright';
// v37: el álbum en el inicio: últimas fotos, se abren en grande, botón Subir fotos
const errs=[];const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await (await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2})).newPage();pg.on('pageerror',e=>errs.push(e.message));
await pg.route('**/*',r=>{const u=r.request().url();return u.startsWith('file:')?r.continue():r.abort()});
await pg.goto('file:///home/user/marea/public/index.html');await pg.evaluate(()=>localStorage.clear());await pg.reload();await pg.waitForTimeout(400);
await pg.fill('#lced','0990000001');await pg.click('#lbtn');await pg.waitForSelector('.hh');
// la demo nace sin fotos: se ponen dos de prueba (dibujadas) como si alguien las hubiera subido
await pg.evaluate(()=>{const mk=c=>{const cv=document.createElement('canvas');cv.width=cv.height=200;const x=cv.getContext('2d');x.fillStyle=c;x.fillRect(0,0,200,200);return cv.toDataURL('image/jpeg',.7)};const ids=activos().map(p=>p.id);
  MURO.push({id:'f1',persona_id:ids[1],foto_path:mk('#2F80ED'),texto:'Llegamos',dia:CFG.desde,created_at:new Date().toISOString()},{id:'f2',persona_id:ids[2],foto_path:mk('#F5A623'),texto:'',dia:CFG.desde,created_at:new Date(Date.now()-60000).toISOString()});render()});
await pg.waitForTimeout(300);
console.log('fotos en la demo:',await pg.evaluate(()=>MURO.length),'· miniaturas en el inicio:',await pg.locator('.hm-alb-g button').count(),'· botón subir:',await pg.locator('.hm-alb-b input[multiple]').count());
await pg.locator('.hm-alb').scrollIntoViewIfNeeded();await pg.screenshot({path:'/tmp/claude-0/-home-user/5853f958-644c-5d2f-baa4-3130bae7435e/scratchpad/inicio-v37.png'});
if(await pg.locator('.hm-alb-g button').count()){await pg.locator('.hm-alb-g button').first().click();await pg.waitForTimeout(400);
  console.log('al tocar: se abre en grande →',await pg.locator('#sheet:not([hidden]) .lb img').count(),'· con autor →',await pg.locator('#sheet:not([hidden]) .lb .row b').first().innerText());
  await pg.screenshot({path:'/tmp/claude-0/-home-user/5853f958-644c-5d2f-baa4-3130bae7435e/scratchpad/foto-grande.png'});}
console.log('errores JS:',errs.length?errs:'ninguno');await b.close();

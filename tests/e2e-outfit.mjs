import { chromium } from 'playwright';
// v46: en cada look, sin «Subir inspiración»; «Armar mi outfit con IA» → para ella / para él → piezas claras
const errs=[];const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await (await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2})).newPage();pg.on('pageerror',e=>errs.push(e.message));
await pg.route('**/*',r=>{const u=r.request().url();return u.startsWith('file:')?r.continue():r.abort()});
await pg.goto('file:///home/user/marea/public/index.html');await pg.evaluate(()=>localStorage.clear());await pg.reload();await pg.waitForTimeout(400);
await pg.fill('#lced','0990000001');await pg.click('#lbtn');await pg.waitForSelector('.hh');
await pg.evaluate(()=>{SUBE='dress';irA('planes')});await pg.waitForTimeout(400);
console.log('looks:',await pg.locator('.look').count(),'· «Subir inspiración»:',await pg.locator('text=Subir inspiración').count(),'· botones IA:',await pg.locator('.out-b').count());
await pg.locator('.out-b').first().scrollIntoViewIfNeeded();await pg.screenshot({path:'/tmp/claude-0/-home-user/5853f958-644c-5d2f-baa4-3130bae7435e/scratchpad/look.png'});
await pg.locator('.out-b').first().click();await pg.waitForTimeout(300);
await pg.click('.chip:has-text("Para ella")');await pg.click('#outgo');await pg.waitForTimeout(500);
console.log('outfit (sin IA en la vista previa → con las ideas del look):',await pg.locator('.out-row').count(),'piezas ·',await pg.locator('.out-row').allInnerTexts());
await pg.screenshot({path:'/tmp/claude-0/-home-user/5853f958-644c-5d2f-baa4-3130bae7435e/scratchpad/outfit.png'});
console.log('errores JS:',errs.length?errs:'ninguno');await b.close();

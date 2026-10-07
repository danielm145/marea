import { chromium } from 'playwright';
const errs=[];const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await (await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2})).newPage();
pg.on('pageerror',e=>errs.push(e.message));
await pg.route('**/*',r=>{const u=r.request().url();return u.startsWith('file:')||/fonts\.(googleapis|gstatic)/.test(u)?r.continue():r.abort()});
await pg.goto('file:///home/user/marea/public/index.html');await pg.evaluate(()=>{try{localStorage.clear()}catch(e){}});await pg.reload();
await pg.fill('#lced','0990000001');await pg.fill('#lpin','1001');await pg.click('#lbtn');await pg.waitForSelector('.hh');
for(const [t,f] of [['Yoga matutino','ev-yoga'],['BBQ & Cocktail Night','ev-bbq'],['Throwback 2000s','ev-prop']]){
  await pg.evaluate(t=>abrirEvento(EVENTOS.find(e=>e.titulo===t).id),t);await pg.waitForTimeout(500);
  await pg.screenshot({path:f+'.png'});await pg.locator('#sheetBody').screenshot({path:f+'-full.png'});
  console.log(t,'| facts:',(await pg.locator('.fact').allInnerTexts()).map(x=>x.replace(/\n/g,' ')).join(' / '));}
await pg.evaluate(()=>abrirEvento(EVENTOS.find(e=>e.titulo==='Yoga matutino').id));await pg.click('.ev-go');await pg.waitForTimeout(300);
console.log('tras apuntarse:',await pg.locator('.ev-go').innerText(),'|',await pg.locator('.evt[data-t=gente] .card').nth(1).locator('.eyebrow').innerText());
await pg.click('.fact:has-text("Look")');await pg.waitForTimeout(300);console.log('look abre dress:',await pg.locator('.look').count());
console.log('errores:',errs.length?errs:'ninguno');await b.close();

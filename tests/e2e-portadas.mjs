import { chromium } from 'playwright';
const errs=[];const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await (await b.newContext({viewport:{width:390,height:844}})).newPage();pg.on('pageerror',e=>errs.push(e.message));
await pg.route('**/*',r=>{const u=r.request().url();return u.startsWith('file:')?r.continue():r.abort()});
await pg.goto('file:///home/user/marea/public/index.html');await pg.evaluate(()=>{try{localStorage.clear()}catch(e){}});await pg.reload();
await pg.fill('#lced','0990000001');await pg.fill('#lpin','1001');await pg.click('#lbtn');await pg.waitForSelector('.hero');
for(const t of ['BBQ & Cocktail Night','Yoga matutino','Círculo de intenciones bajo las estrellas']){await pg.evaluate(t=>abrirEvento(EVENTOS.find(e=>e.titulo===t).id),t);await pg.waitForTimeout(500);
 console.log(t,'→',await pg.evaluate(()=>{const i=document.querySelector('.evh-img');return i?(i.src.split('/public/')[1]+' ok='+(i.naturalWidth>0)):'(sin imagen: degradado)'}))}
await pg.evaluate(()=>closeSheet());await pg.click('.link-x');await pg.waitForTimeout(300);console.log('créditos:',(await pg.locator('#sheetBody').innerText()).replace(/\n/g,' / ').slice(0,160));
console.log('errores:',errs.length?errs:'ninguno');await b.close();

import { chromium } from 'playwright';
const errs=[];const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await (await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2})).newPage();pg.on('pageerror',e=>errs.push(e.message));
await pg.route('**/*',r=>{const u=r.request().url();return u.startsWith('file:')||/fonts\.(googleapis|gstatic)/.test(u)?r.continue():r.abort()});
await pg.goto('file:///home/user/marea/public/index.html');await pg.evaluate(()=>{try{localStorage.clear()}catch(e){}});await pg.reload();await pg.waitForTimeout(500);
await pg.fill('#lced','0990000001');await pg.fill('#lpin','1001');await pg.click('#lbtn');await pg.waitForSelector('.hh');
const FOTO='/home/user/marea/public/img/casa/playa.jpg';
console.log('panzazos usa su foto:',await pg.evaluate(()=>imgEvento(EVENTOS.find(e=>/panzazos/.test(e.titulo)))[0]));
// lo que hizo Daniel: desde el evento, botón Gasto, foto + "poner foto de portada del evento…"
await pg.evaluate(()=>{const e=EVENTOS.find(x=>/intenciones/.test(x.titulo));abrirEvento(e.id)});await pg.waitForTimeout(300);
await pg.click('#sheetBody .ev-acc button:has-text("Gasto")');await pg.waitForSelector('#ltxt');
await pg.setInputFiles('#lfoto',FOTO);await pg.waitForSelector('#lfotob.con');
await pg.fill('#ltxt','Poner foto de portada del evento círculo de intenciones bajo las estrellas');await pg.click('#lgo');
await pg.waitForSelector('#portgo');console.log('hoja portada · plan escogido:',await pg.locator('#sheetBody .chip[aria-pressed=true]').innerText());
await pg.waitForTimeout(1500);await pg.screenshot({path:'p-1-portada.png'});
await pg.click('#portgo');await pg.waitForSelector('.evh-foto');
console.log('evento con foto propia:',await pg.evaluate(()=>{const e=EVENTOS.find(x=>/intenciones/.test(x.titulo));return !!e.foto&&imgEvento(e)[0].startsWith('data:')}));
await pg.screenshot({path:'p-2-evento.png'});
// botón Cambiar foto directo en el evento
await pg.evaluate(()=>{closeSheet();const e=EVENTOS.find(x=>/Yoga/.test(x.titulo));abrirEvento(e.id)});await pg.waitForSelector('.evh-foto');
await pg.setInputFiles('.evh-foto input',FOTO);await pg.waitForFunction(()=>!!EVENTOS.find(x=>/Yoga/.test(x.titulo)).foto);console.log('Cambiar foto (yoga): ok');
// texto suelto sin foto en "Lo que sea" → pide la foto
await pg.evaluate(()=>{closeSheet();abrirLector()});await pg.fill('#ltxt','cambia la foto del evento de karaoke');await pg.click('#lgo');await pg.waitForSelector('#portgo');
console.log('sin foto · plan:',await pg.locator('#sheetBody .chip[aria-pressed=true]').innerText(),'· botón deshabilitado:',await pg.locator('#portgo').isDisabled());
await pg.setInputFiles('#sheetBody .ia-foto input','/home/user/marea/public/img/casa/playa.jpg');await pg.waitForFunction(()=>!document.querySelector('#portgo').disabled);await pg.click('#portgo');await pg.waitForFunction(()=>!!EVENTOS.find(x=>/Karaoke/.test(x.titulo)).foto);console.log('sin foto → escogió foto → karaoke con portada: ok');
await pg.screenshot({path:'p-3-karaoke.png'});
console.log('errores:',errs.length?errs:'ninguno');await b.close();

import { chromium } from 'playwright';
const errs=[],falta=[];const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await (await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2})).newPage();pg.on('pageerror',e=>errs.push(e.message));
pg.on('requestfailed',r=>{if(r.failure()?.errorText.includes('FILE_NOT_FOUND'))falta.push(r.url().replace(/.*public\//,''))});
await pg.route('**/*',r=>{const u=r.request().url();return u.startsWith('file:')||/fonts\.(googleapis|gstatic)/.test(u)?r.continue():r.abort()});
await pg.goto('file:///home/user/marea/public/index.html');await pg.evaluate(()=>{try{localStorage.clear()}catch(e){}});await pg.reload();await pg.waitForTimeout(500);
await pg.fill('#lced','0990000001');await pg.click('#lbtn');await pg.waitForSelector('.hh');
for(const t of ['planes','menu','nosotros','tareas','gastos','hoy'])await pg.evaluate(t=>irA(t),t),await pg.waitForTimeout(300);
console.log('pedidas que no existen:',falta.length?[...new Set(falta)]:'ninguna');
const r=await pg.evaluate(()=>{const e=EVENTOS.find(x=>x.titulo==='BBQ & Cocktail Night');const antes=imgEvento(e)[0];
  FOTOS_GEN.add('img/eventos/bbq-cocktail-night.jpg');FOTOS_GEN.add('img/gente/kevin-lopez.jpg');
  const k=activos().find(p=>p.nombre==='Kevin López');
  return {antes,despues:imgEvento(e)[0],cara:caraDe(k),av:av(k.id).includes('img/gente/kevin-lopez.jpg'),
    conLista:EVENTOS.filter(x=>(x.lista||[]).length).length,total:EVENTOS.length,desc:e.descripcion.length}});
console.log(JSON.stringify(r));
await pg.evaluate(()=>{const e=EVENTOS.find(x=>x.titulo==='Spike ball, red y paletas de playa');abrirEvento(e.id)});await pg.waitForTimeout(500);
console.log('lista del evento:',(await pg.locator('#sheetBody .ev-lista').innerText()).replace(/\n+/g,' · ').slice(0,200));
await pg.screenshot({path:'y-1-evento.png'});
console.log('errores:',errs.length?errs:'ninguno');await b.close();

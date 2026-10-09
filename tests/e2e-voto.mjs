import { chromium } from 'playwright';
const errs=[];const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2});
await ctx.addInitScript(()=>{const real=Date;const off=new real('2026-10-09T02:10:00-05:00').getTime()-real.now();class D extends real{constructor(...a){super(...(a.length?a:[real.now()+off]))}static now(){return real.now()+off}};window.Date=D});
const pg=await ctx.newPage();pg.on('pageerror',e=>errs.push(e.message));
await pg.route('**/*',r=>{const u=r.request().url();return u.startsWith('file:')?r.continue():r.abort()});
await pg.goto('file:///home/user/marea/public/index.html');await pg.evaluate(()=>localStorage.clear());await pg.reload();await pg.waitForTimeout(400);
await pg.fill('#lced','0990000001');await pg.click('#lbtn');await pg.waitForSelector('.hh');
// las 4 opciones como quedan con sql/019
await pg.evaluate(async()=>{for(const [t,h] of [['Directo al ceviche de la casa','14:00'],['Encocado en Esmeraldas','13:30'],['Mariscos frente al mar en Atacames','14:00'],['Almuerzo típico en la vía (La Concordia)','12:00']])await API.saveEvento({id:uid(),titulo:t,tematica:'Almuerzo de camino',descripcion:'…',dia:CFG.desde,hora:h,bloque:'tarde',estado:'propuesta',creado_por:ME.id},true);await cargar();render()});
await pg.waitForTimeout(300);
console.log('bienvenida:',await pg.locator('.bienv').count(),'· opciones:',await pg.locator('.voto-o').count());
await pg.locator('.voto-o:has-text("Encocado")').click();await pg.waitForTimeout(300);
await pg.locator('.voto-o:has-text("ceviche")').click();await pg.waitForTimeout(300);
console.log('un solo voto (cambiado a ceviche):',await pg.evaluate(()=>EVENTOS.filter(esAlmuerzoCamino).map(e=>e.titulo.slice(0,12)+':'+votosDe(e.id).length).join(' ')),'·',await pg.locator('.voto .muted.tiny').first().innerText());
await pg.locator('.bienv').scrollIntoViewIfNeeded();await pg.screenshot({path:'/tmp/claude-0/-home-user/5853f958-644c-5d2f-baa4-3130bae7435e/scratchpad/bienv.png',fullPage:false});
await pg.locator('.voto').scrollIntoViewIfNeeded();await pg.screenshot({path:'/tmp/claude-0/-home-user/5853f958-644c-5d2f-baa4-3130bae7435e/scratchpad/voto.png'});
console.log('errores JS:',errs.length?errs:'ninguno');await b.close();

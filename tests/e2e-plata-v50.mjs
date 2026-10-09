import { chromium } from 'playwright';
const errs=[];const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await (await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2})).newPage();pg.on('pageerror',e=>errs.push(e.message));
await pg.route('**/*',r=>{const u=r.request().url();return u.startsWith('file:')?r.continue():r.abort()});
await pg.goto('file:///home/user/marea/public/index.html');await pg.evaluate(()=>localStorage.clear());await pg.reload();await pg.waitForTimeout(400);
await pg.fill('#lced','0990000001');await pg.click('#lbtn');await pg.waitForSelector('.hh');
await pg.evaluate(()=>{SUBG='bal';irA('gastos')});await pg.waitForTimeout(300);
const txt=await pg.locator('#app').innerText();
console.log('Saldos · sin atajo:',!/Atajo|menos transferencias/i.test(txt),'· desglose:',await pg.locator('.dg').count(),'gastos ·',/De dónde sale/i.test(txt));
// cara en una fila de deuda abre la foto, no la fila
const av=pg.locator('.qq-r .av[data-p]').first();
console.log('caras clicables en deudas:',await pg.locator('.qq-r .av[data-p]').count());
await av.click();await pg.waitForTimeout(300);
console.log('visor de cara abierto:',await pg.locator('#visorCara').isVisible().catch(()=>false),'· sheet de deuda abierto:',await pg.locator('#sheetBody .dd-row').count());
await pg.evaluate(()=>{const v=document.getElementById('visorCara');v&&v.click()});await pg.keyboard.press('Escape');await pg.waitForTimeout(200);
// resumen del viaje
await pg.evaluate(()=>abrirResumen());await pg.waitForTimeout(300);
const rs=await pg.locator('#sheetBody').innerText();
console.log('Resumen · sin "Transferencias para cerrar":',!/Transferencias para cerrar/i.test(rs),'· quién le debe:',/le debe a/i.test(rs),'· cada gasto:',/Cada gasto/i.test(rs));
await pg.screenshot({path:'/tmp/claude-0/-home-user/5853f958-644c-5d2f-baa4-3130bae7435e/scratchpad/resumen50.png',fullPage:true});
await pg.evaluate(()=>closeSheet());await pg.waitForTimeout(200);
// en el formulario de gasto, la cara del selector sigue seleccionando
await pg.evaluate(()=>{typeof abrirGasto==='function'&&abrirGasto()});await pg.waitForTimeout(400);
const avp=pg.locator('.avp').first();const n=await pg.locator('.avp').count();
if(n){const antes=await avp.getAttribute('class');await avp.click();await pg.waitForTimeout(150);const desp=await avp.getAttribute('class');
 console.log('selector de personas responde:',antes!==desp,'· visor NO abierto:',!(await pg.locator('#visorCara').isVisible().catch(()=>false)));}
else console.log('(sin .avp en el formulario)');
await pg.screenshot({path:'/tmp/claude-0/-home-user/5853f958-644c-5d2f-baa4-3130bae7435e/scratchpad/saldos50.png'});
console.log('errores JS:',errs.length?errs:'ninguno');await b.close();

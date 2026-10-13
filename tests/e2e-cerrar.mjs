// v61 · cerrar cuentas: Alegría (debe) ve lo suyo, sube el comprobante y paga; Daniel (recibe) lo ve con la foto; el plan se rehace solo.
import { chromium } from 'playwright';
const S='/tmp/claude-0/-home-user/5853f958-644c-5d2f-baa4-3130bae7435e/scratchpad/';
const errs=[];const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2});
// después del viaje (13-oct)
await ctx.addInitScript(()=>{const real=Date;const off=new real('2026-10-13T10:00:00-05:00').getTime()-real.now();class D extends real{constructor(...a){super(...(a.length?a:[real.now()+off]))}static now(){return real.now()+off}};window.Date=D});
const pg=await ctx.newPage();pg.on('pageerror',e=>errs.push(e.message));pg.on('dialog',d=>d.accept());
await pg.route('**/*',r=>{const u=r.request().url();return u.startsWith('file:')?r.continue():r.abort()});
const entrar=async tel=>{await pg.goto('file:///home/user/marea/public/index.html');await pg.evaluate(()=>localStorage.removeItem('marea_demo_sesion'));await pg.reload();await pg.waitForTimeout(400);await pg.fill('#lced',tel);await pg.click('#lbtn');await pg.waitForSelector('.hh')};
await pg.goto('file:///home/user/marea/public/index.html');await pg.evaluate(()=>localStorage.clear());
await entrar('0990000003');   // Alegría: debe
console.log('inicio · tarjeta cerrar:',(await pg.locator('.cc-home').innerText()).replace(/\n+/g,' | '));
await pg.locator('.cc-home').screenshot({path:S+'cc-home.png'});
await pg.click('.cc-home');await pg.waitForTimeout(300);
console.log('Gastos abre en:',await pg.locator('.seg button[aria-pressed=true]').first().innerText(),'· lo tuyo:',(await pg.locator('.cc-big').innerText()).replace(/\n+/g,' | '),'· pagos que me tocan:',await pg.locator('.cc-t').count(),'· botones comprobante:',await pg.locator('.cc-b').count());
await pg.screenshot({path:S+'cc-1.png',fullPage:true});
const antes=await pg.evaluate(()=>({saldo:balances().find(b=>b.id===ME.id).saldo,plan:simplificar(balances()).length,pagos:GASTOS.filter(g=>g.tipo==='pago').length}));
const aQuien=await pg.evaluate(()=>nom(simplificar(balances()).find(t=>t.de===ME.id).a));
await pg.locator('.cc-b').first().click();await pg.waitForTimeout(300);
console.log('hoja de pago:',await pg.locator('#sheetTitle').innerText(),'· monto prellenado:',await pg.inputValue('#pgm'),'· botón:',await pg.locator('#pgok').innerText());
await pg.setInputFiles('#sheetBody input[type=file]:not([capture])',['/home/user/marea/public/img/menu/d2-cena.jpg']);await pg.waitForTimeout(900);
console.log('con comprobante:',await pg.locator('#sheetBody .thumb').count(),'· botón:',await pg.locator('#pgok').innerText());
await pg.screenshot({path:S+'cc-pago.png'});
await pg.click('#pgok');await pg.waitForTimeout(800);
const desp=await pg.evaluate(()=>({saldo:balances().find(b=>b.id===ME.id).saldo,plan:simplificar(balances()).length,pagos:GASTOS.filter(g=>g.tipo==='pago').length,conFoto:!!GASTOS.find(g=>g.tipo==='pago').respaldo_path}));
console.log('antes:',JSON.stringify(antes),'→ después:',JSON.stringify(desp),'· a quien pagó:',aQuien);
console.log('pantalla después:',(await pg.locator('.cc-mio').innerText()).replace(/\n+/g,' | ').slice(0,160));
await pg.screenshot({path:S+'cc-2.png',fullPage:true});
// Daniel recibe
await pg.evaluate(()=>salir());await entrar('0990000001');await pg.evaluate(()=>{SUBG='cerrar';window.__SUBG_TOCADO=1;irA('gastos')});await pg.waitForTimeout(300);
console.log('Daniel · lo suyo:',(await pg.locator('.cc-big').innerText()).replace(/\n+/g,' | '),'· pagos que le llegaron:',await pg.locator('.cc-mio .cc-pg').count(),'·',(await pg.locator('.cc-mio .cc-pg').first().innerText()).replace(/\n+/g,' | '));
await pg.locator('.cc-mio .cc-pg').first().click();await pg.waitForTimeout(300);console.log('detalle del pago con comprobante:',await pg.locator('#gthumb').count(),'·',await pg.locator('#sheetTitle').innerText());
await pg.evaluate(()=>closeSheet());await pg.click('text=Recordarles a los que faltan');await pg.waitForTimeout(200);
console.log('WhatsApp:',decodeURIComponent(await pg.getAttribute('a:has-text("Mandar el resumen al grupo")','href')).split('text=')[1].split('\n').slice(0,4).join(' / '));
console.log('ancho:',await pg.evaluate(()=>document.documentElement.scrollWidth));
console.log('errores JS:',errs.length?errs:'ninguno');await b.close();

import { chromium } from 'playwright';
// v36: la IA desglosa los platos; se toca quién pidió qué; IVA/propina en proporción; cuadra al centavo
const errs=[];const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await (await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2})).newPage();pg.on('pageerror',e=>errs.push(e.message));
await pg.route('**/*',r=>{const u=r.request().url();return u.startsWith('file:')?r.continue():r.abort()});
await pg.goto('file:///home/user/marea/public/index.html');await pg.evaluate(()=>localStorage.clear());await pg.reload();await pg.waitForTimeout(400);
await pg.fill('#lced','0990000001');await pg.click('#lbtn');await pg.waitForSelector('.hh');
console.log('inicio: chat →',await pg.locator('.subir-f .chat-ic').count(),'· avisos (solo con Supabase) →',await pg.locator('.bell-ic').count());
// una propuesta como la que devuelve la IA para una cena: 3 platos, quién pidió 2 de ellos, el 3.º compartido
const r=await pg.evaluate(()=>{const ids=activos().map(p=>p.id);const [a,bb,c]=ids;LECT={dataUrl:null,ev:null,txt:'cena'};
  mostrarPropuesta({resumen:'Cena en El Muelle, $69, la pagaste tú',gastos:[{descripcion:'Cena en El Muelle',monto:69,categoria:'restaurantes',alcance:'consumo',pagador_ids:[a],participante_ids:ids,modo:'igual',partes:null,pago_entre:null,evento_id:null,
    factura:{tipo_documento:'factura',comercio:'El Muelle',items:[{descripcion:'Pizza familiar',cantidad:1,total:20,para_ids:[a,bb]},{descripcion:'Ceviche',cantidad:1,total:15,para_ids:[c]},{descripcion:'Picada',cantidad:1,total:25,para_ids:[]}],subtotal:60,impuestos:9,total:69},
    etiquetas:['cena'],confianza:.9,dudas:['¿Quién pidió qué? Toca cada plato para repartirlo.']}],tareas:[],eventos:[],album:null},null,'foto');
  const n=ids.length;return {n,por_platos:F.por_platos,modo:F.modo,suma:Object.values(F.valores).reduce((x,y)=>x+y,0),a:F.valores[a],b:F.valores[bb],c:F.valores[c],otro:F.valores[ids[3]],esperado_a:(10+25/n)*1.15,esperado_c:(15+25/n)*1.15,esperado_otro:(25/n)*1.15}});
console.log(JSON.stringify(r));
console.log('cuadra al centavo:',Math.abs(r.suma-69)<0.001,'· a≈esperado:',Math.abs(r.a-r.esperado_a)<0.02,'· c≈esperado (±4 centavos de redondeo):',Math.abs(r.c-r.esperado_c)<0.05,'· resto≈esperado:',Math.abs(r.otro-r.esperado_otro)<0.02);
console.log('pregunta visible:',await pg.locator('.ia-preg').count(),'· filas de platos:',await pg.locator('.pl-row').count(),'· guardar habilitado:',!(await pg.locator('#fsave').isDisabled()));
await pg.locator('.pl-sec').scrollIntoViewIfNeeded();await pg.screenshot({path:'/tmp/claude-0/-home-user/5853f958-644c-5d2f-baa4-3130bae7435e/scratchpad/platos.png'});
// tocar: la picada ya no es de todos sino de a
await pg.locator('.pl-row').nth(2).locator('.pl-av').first().click();await pg.waitForTimeout(200);
const r2=await pg.evaluate(()=>{const ids=activos().map(p=>p.id);return {a:F.valores[ids[0]],otro:F.valores[ids[3]],de:document.querySelectorAll('.pl-row')[2].querySelector('.pl-de').textContent}});
console.log('tras tocar la picada → a:',r2.a,'(esperado',(10+25).toFixed(2)+'·1.15=',(35*1.15).toFixed(2)+') · otro:',r2.otro,'· etiqueta:',r2.de);
// monto en 0 → la pregunta grande
await pg.evaluate(()=>{F.monto='';repintarF()});
console.log('sin total → pregunta «¿Cuánto fue?»:',await pg.locator('.ia-monto').count());await pg.fill('#fmonto2','75,50');await pg.click('.ia-monto .btn');await pg.waitForTimeout(200);
console.log('monto puesto:',await pg.evaluate(()=>F.monto),'· suma:',await pg.evaluate(()=>Object.values(F.valores).reduce((x,y)=>x+y,0).toFixed(2)));
await pg.screenshot({path:'/tmp/claude-0/-home-user/5853f958-644c-5d2f-baa4-3130bae7435e/scratchpad/platos2.png'});
// guardar de verdad y ver las cuentas
await pg.click('#fsave');await pg.waitForTimeout(500);
const g=await pg.evaluate(()=>{const g=GASTOS[0];return {desc:g.descripcion,modo:g.reparto.modo,partes:g.reparto.partes.length,items:(g.factura.items||[]).length,para:g.factura.items[2].para_ids.length}});console.log('guardado:',JSON.stringify(g));
console.log('errores JS:',errs.length?errs:'ninguno');await b.close();

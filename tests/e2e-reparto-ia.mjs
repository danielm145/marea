import { chromium } from 'playwright';
// v38: «Para todos» / «Todos excepto…», explicar a la IA quién pidió qué, desglosar con IA, subir fotos abajo
const errs=[];const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
const pg=await (await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2})).newPage();pg.on('pageerror',e=>errs.push(e.message));
await pg.route('**/*',r=>{const u=r.request().url();return u.startsWith('file:')?r.continue():r.abort()});
await pg.goto('file:///home/user/marea/public/index.html');await pg.evaluate(()=>localStorage.clear());await pg.reload();await pg.waitForTimeout(400);
await pg.fill('#lced','0990000001');await pg.click('#lbtn');await pg.waitForSelector('.hh');
console.log('abajo del inicio «Sube tus fotos»:',await pg.locator('.subir-f input[multiple]').count()>=1);
// una compra de supermercado: 3 productos, nadie dijo de quién → por platos activo, todo «de todos»
await pg.evaluate(()=>{const ids=activos().map(p=>p.id);LECT={dataUrl:'data:image/jpeg;base64,/9j/',ev:null,txt:''};
  mostrarPropuesta({resumen:'Compra en Tía, $31',gastos:[{descripcion:'Compra en Tía',monto:31,categoria:'despensa',alcance:'fijo',pagador_ids:[ids[0]],participante_ids:ids,modo:'igual',partes:null,pago_entre:null,evento_id:null,
    factura:{tipo_documento:'ticket',comercio:'Tía',items:[{descripcion:'Hielo 5kg',cantidad:2,total:6,para_ids:[]},{descripcion:'Bloqueador solar',cantidad:1,total:15,para_ids:[]},{descripcion:'Cervezas six pack',cantidad:1,total:10,para_ids:[]}],subtotal:31,impuestos:0,total:31},
    etiquetas:['despensa'],confianza:.9,dudas:['¿Quién pidió qué? Toca las caras en cada producto.']}],tareas:[],eventos:[],album:null},null,'foto')});
await pg.waitForTimeout(300);
console.log('supermercado → por platos:',await pg.evaluate(()=>F.por_platos),'· chips rápidos:',await pg.locator('.ia-sec .chip:has-text("Para todos"), .ia-sec .chip:has-text("Todos excepto"), .ia-sec .chip:has-text("Por platos")').count());
// explicarle a la IA (la IA se simula: devuelve los mismos ítems con las caras)
await pg.evaluate(()=>{const ids=activos().map(p=>p.id);API.leer=async(o)=>({gastos:[{descripcion:'Compra en Tía',monto:31,factura:{items:[{descripcion:'Hielo 5kg',total:6,para_ids:[]},{descripcion:'Bloqueador solar',total:15,para_ids:[ids[1]]},{descripcion:'Cervezas six pack',total:10,para_ids:[ids[0],ids[2]]}]}}]})});
await pg.fill('#plx','el bloqueador es de Ana Paula y las cervezas mías y de Alegría');await pg.click('#plxb');await pg.waitForTimeout(400);
const r=await pg.evaluate(()=>{const ids=activos().map(p=>p.id);return {blo:F.factura.items[1].para_ids.length,cerv:F.factura.items[2].para_ids.length,anaPaula:F.valores[ids[1]],yo:F.valores[ids[0]],suma:Object.values(F.valores).reduce((a,b)=>a+b,0).toFixed(2)}});
console.log('tras explicar:',JSON.stringify(r),'· esperado Ana Paula = 15 + 6/8 = 15.75');
await pg.screenshot({path:'/tmp/claude-0/-home-user/5853f958-644c-5d2f-baa4-3130bae7435e/scratchpad/reparto-ia.png'});
// atajos
await pg.click('.ia-sec .chip:has-text("Todos excepto")');await pg.waitForTimeout(200);
console.log('todos excepto → aviso:',await pg.locator('.banner:has-text("Toca la cara")').count(),'· por platos apagado:',await pg.evaluate(()=>!F.por_platos));
await pg.locator('.ia-sec .av-pick').nth(1).locator('.avp').nth(3).click();await pg.waitForTimeout(200);
console.log('encabezado:',await pg.evaluate(()=>[...document.querySelectorAll('.ia-sec .eyebrow')].map(e=>e.textContent).find(t=>t.startsWith('Entre quiénes'))),'· cada uno:',await pg.evaluate(()=>(31/7).toFixed(2)));
await pg.click('.ia-sec .chip:has-text("Para todos")');await pg.waitForTimeout(200);console.log('para todos → ',await pg.evaluate(()=>F.part.length+' personas, modo '+F.modo));
console.log('errores JS:',errs.length?errs:'ninguno');await b.close();

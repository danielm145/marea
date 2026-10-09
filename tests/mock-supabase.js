// Simulador de Supabase para las pruebas: corre el motor «Sb» de la app (no el demo) contra tablas en memoria,
// y RECHAZA cualquier columna que no exista en la base real (window.__ESQUEMA, sacado de Postgres con todos los sql/).
// Se inyecta con addInitScript; los datos se siembran con el seedDemo() de la propia app la primera vez que se consultan.
(() => {
  const ESQ = window.__ESQUEMA || {};
  const DB = {}; let sembrado = false;
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2));
  window.__DB = DB; window.__ERRORES_DB = [];
  function sembrar() {
    if (sembrado) return; sembrado = true;
    const d = window.seedDemo();
    DB.personas = d.personas.map((p) => ({ ...p, auth_id: 'auth-' + p.id }));
    DB.config = [{ clave: 'viaje', valor: d.config }];
    for (const [t, k] of [['gastos', 'gastos'], ['tareas', 'tareas'], ['eventos', 'eventos'], ['votos', 'votos'], ['etiquetas', 'etiquetas'], ['comidas', 'comidas'], ['platos', 'platos'], ['asistencia', 'asistencia'], ['presupuesto', 'presupuesto'], ['inspiracion', 'inspiracion'], ['muro', 'muro'], ['equipo', 'equipo'], ['vehiculos', 'vehiculos'], ['pasajeros', 'pasajeros'], ['comercios', 'comercios'], ['mensajes', 'mensajes']])
      DB[t] = (d[k] || []).map((r) => ({ ...r }));
    DB.gastos.forEach((g) => { g.eliminado = false; });
    for (const t of ['juegos', 'juego_respuestas', 'karaoke', 'votos_juego', 'look_guias', 'gastos_historial', 'push_subs']) DB[t] = [];
  }
  const tabla = (t) => { sembrar(); if (t === 'personas_publicas') return DB.personas.map(({ telefono, cumple, cedula, emergencia, ...p }) => p); return (DB[t] = DB[t] || []); };
  function validar(t, filas) {
    const cols = ESQ[t]; if (!cols) return null;
    for (const f of filas) for (const k of Object.keys(f)) if (!cols.includes(k)) return `Could not find the '${k}' column of '${t}' in the schema cache`;
    return null;
  }
  function correr(st) {
    if (localStorage.getItem('__mock_offline') === '1') return { data: null, error: { message: 'TypeError: Failed to fetch' } };
    const L = tabla(st.t), pasa = (r) => st.f.every((fn) => fn(r));
    let error = null, data = null;
    if (st.op === 'insert' || st.op === 'upsert' || st.op === 'update') {
      const filas = st.op === 'update' ? [st.p] : [].concat(st.p);
      error = validar(st.t, filas);
      if (error) { window.__ERRORES_DB.push(st.t + ': ' + error); return { data: null, error: { message: error } }; }
    }
    if (st.op === 'select') {
      data = L.filter(pasa);
      for (const [c, asc] of st.o.slice().reverse()) data.sort((a, b) => (String(a[c] ?? '') < String(b[c] ?? '') ? -1 : String(a[c] ?? '') > String(b[c] ?? '') ? 1 : 0) * (asc ? 1 : -1));
      if (st.lim != null) data = data.slice(0, st.lim);
      data = data.map((r) => JSON.parse(JSON.stringify(r)));
    } else if (st.op === 'insert') {
      data = [].concat(st.p).map((r) => { const n = { id: uid(), created_at: new Date().toISOString(), ...JSON.parse(JSON.stringify(r)) }; L.push(n); return n; });
    } else if (st.op === 'upsert') {
      const ks = (st.opts.onConflict || 'id').split(',').map((s) => s.trim()); data = [];
      for (const r of [].concat(st.p)) {
        const ya = L.find((x) => ks.every((k) => x[k] === r[k]));
        if (ya) { if (!st.opts.ignoreDuplicates) Object.assign(ya, JSON.parse(JSON.stringify(r))); data.push(ya); }
        else { const n = { id: uid(), created_at: new Date().toISOString(), ...JSON.parse(JSON.stringify(r)) }; L.push(n); data.push(n); }
      }
    } else if (st.op === 'update') {
      data = L.filter(pasa); data.forEach((r) => Object.assign(r, JSON.parse(JSON.stringify(st.p))));
    } else if (st.op === 'delete') {
      data = L.filter(pasa); for (const r of data) L.splice(L.indexOf(r), 1);
    }
    if (st.single) { if (st.single === 'one' && data.length !== 1) return { data: null, error: { message: 'JSON object requested, multiple (or no) rows returned' } }; data = data[0] || null; }
    return { data, error };
  }
  function qb(t) {
    const st = { t, op: 'select', f: [], o: [], lim: null, single: null, p: null, opts: {} };
    const b = {
      select() { return b; }, eq(c, v) { st.f.push((r) => r[c] === v); return b; }, neq(c, v) { st.f.push((r) => r[c] !== v); return b; },
      in(c, vs) { st.f.push((r) => vs.includes(r[c])); return b; }, order(c, o = {}) { st.o.push([c, o.ascending !== false]); return b; },
      limit(n) { st.lim = n; return b; }, maybeSingle() { st.single = 'maybe'; return b; }, single() { st.single = 'one'; return b; },
      insert(p) { st.op = 'insert'; st.p = p; return b; }, update(p) { st.op = 'update'; st.p = p; return b; },
      upsert(p, opts) { st.op = 'upsert'; st.p = p; st.opts = opts || {}; return b; }, delete() { st.op = 'delete'; return b; },
      then(ok, mal) { return Promise.resolve().then(() => correr(st)).then(ok, mal); },
    };
    return b;
  }
  let sesion = null; try { sesion = JSON.parse(localStorage.getItem('__mock_ses')); } catch (e) { /* nada */ }
  const archivos = {};
  // sin señal, /api/config.js no llega: la app debe usar la conexión que guardó
  if (localStorage.getItem('__mock_offline') !== '1') window.MAREA_SB = { url: 'https://mock.supabase.co', anon: 'anon-mock' };
  window.supabase = { createClient: () => ({
    from: qb,
    auth: {
      async getSession() { return { data: { session: sesion } }; },
      async setSession({ access_token }) { sembrar(); const tel = String(access_token).replace('tok:', ''); const p = DB.personas.find((x) => x.telefono === tel);
        if (!p) return { data: {}, error: { message: 'no' } }; sesion = { access_token, user: { id: p.auth_id } }; localStorage.setItem('__mock_ses', JSON.stringify(sesion)); return { data: { user: sesion.user }, error: null }; },
      async signOut() { sesion = null; localStorage.removeItem('__mock_ses'); return {}; },
    },
    storage: { from: (bucket) => ({
      async upload(path, blob) { archivos[bucket + ':' + path] = URL.createObjectURL(blob); return { error: null }; },
      async createSignedUrl(path) { return { data: { signedUrl: archivos[bucket + ':' + path] || 'data:image/gif;base64,R0lGODlhAQABAAAAACw=' }, error: null }; },
    }) },
  }) };
})();

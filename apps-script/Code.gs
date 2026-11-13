/* Condominio Lahia · Finanzas en vivo
   Apps Script que lee la hoja de captura mensual de la administración
   ("Lahia-Captura-Mensual") y entrega a finanzas.html las cifras AGREGADAS de
   cada mes. Instalación paso a paso: apps-script/INSTALAR.md

   Qué hace:
   - doGet: responde un JSON con, por mes, saldos, ingresos (mantenimiento y
     derrama de agua), egresos (fijos, variables y pipas) con su desglose por
     proveedor, cobranza, morosidad acumulada y deuda de agua. Un mes aparece
     en el sitio en cuanto su pestaña tiene cobros o gastos.
     NUNCA devuelve cobros por departamento: la morosidad sale sumada.
   - probar(): para ver en el registro lo que se publicaría.
   - diagnostico(): para ver qué pestañas reconoce y qué leyó de cada una.

   La hoja puede ser una Hoja de Google o un archivo de Excel (.xlsx) guardado
   en Drive, como el que hoy lleva la administración. Si es Excel, el script
   saca una copia convertida a Hoja de Google en tu Drive (no la toques: se
   rehace sola cada vez que el Excel cambia) y lee de ahí.

   Cómo reconoce las pestañas: por su nombre, un mes en mayúsculas ("AGOSTO")
   o con año ("ENERO 2027"). El año lo toma del nombre y, si no lo trae, de la
   celda "Mes y año"; "Captura Mensual" es la plantilla y no cuenta.

   Pestaña copiada sin capturar: si un mes tiene exactamente las mismas cifras
   que el anterior y su saldo inicial no es el saldo final del anterior (pasa
   al duplicar la pestaña y no llenarla), se considera copia y no se publica;
   queda anotado en "avisos" de la respuesta. */

/* Id del archivo en Drive (Hoja de Google o .xlsx). Es el que aparece en la
   dirección: drive.google.com/file/d/ESTE_ID/view  o  docs.google.com/spreadsheets/d/ESTE_ID/edit */
const HOJA_ID = "1nm4aYVSgaaNxz3D3jclvWu3tc3KP4H4Dx_YsilRgBOk";   // Lahia-Captura-Mensual (2) ARQ ANDRES (Hoja de Google de la Administración; solo se lee)

const CUOTA = 2000;                  // cuota mensual de mantenimiento si la hoja no trae el renglón "Cuota de mantenimiento"
const UNIDADES = 40;                 // si la hoja no trae "Número de unidades"
const CACHE_SEGUNDOS = 300;          // el sitio ve los cambios de la hoja a más tardar 5 minutos después
const FILAS = 240;                   // hasta dónde se lee cada pestaña (sobra para 40 deptos y decenas de gastos)

const MESES = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
const NOMBRES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const CORTOS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const MIME_HOJA = "application/vnd.google-apps.spreadsheet";

/* ============================ SERVICIO WEB ============================ */

function doGet(e) {
  const p = (e && e.parameter) || {};
  try {
    /* Correos, casa club, Mi cuenta y lista de departamentos (archivo Vecinos.gs). */
    if (p.accion && typeof rutaVecinosGet_ === "function") { const r = rutaVecinosGet_(p); if (r) return texto_(JSON.stringify(r)); }
    const cache = CacheService.getScriptCache();
    if (!p.fresh) {
      const guardado = cache.get("finanzas");
      if (guardado) return texto_(guardado);
    }
    const salida = JSON.stringify(armarFinanzas_());
    try { cache.put("finanzas", salida, CACHE_SEGUNDOS); } catch (_) { /* si pesa más de lo que admite el caché, se sirve sin caché */ }
    return texto_(salida);
  } catch (err) {
    return texto_(JSON.stringify({ ok: false, servicio: "lahia-finanzas", error: String(err.message || err) }));
  }
}

/* Calentador: cada 10 minutos deja Finanzas y «Mi cuenta» listas en el caché para que nadie espere ~30 s.
   Para no gastar la cuota diaria de Google, solo rehace las cuentas si la hoja cambió; si no, alarga
   la copia guardada (menos de 1 s). Se instala solo con instalarVecinos() o con instalarCalentador(). */
function calentarFinanzas() {
  const c = CacheService.getScriptCache(), p = PropertiesService.getScriptProperties();
  let ver = ""; try { ver = String(DriveApp.getFileById(HOJA_ID).getLastUpdated().getTime()); } catch (e) {}
  const g = c.get("finanzas"), mp = c.get("matriz_pagos");
  if (g && mp && ver && p.getProperty("calentador_ver") === ver) {
    c.put("finanzas", g, 1500); c.put("matriz_pagos", mp, 1500);
    const d = c.get("deptos_v"); if (d) c.put("deptos_v", d, 3600);
    return;
  }
  try { c.put("finanzas", JSON.stringify(armarFinanzas_()), 1500); } catch (e) { Logger.log("calentador: " + e); }
  try { if (typeof calentarVecinos_ === "function") calentarVecinos_(); } catch (e) { Logger.log("calentador vecinos: " + e); }
  if (ver) p.setProperty("calentador_ver", ver);
}
function instalarCalentador() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === "calentarFinanzas").forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger("calentarFinanzas").timeBased().everyMinutes(10).create();
  calentarFinanzas();
}

function texto_(s) { return ContentService.createTextOutput(s).setMimeType(ContentService.MimeType.JSON); }

/* Para probar desde el editor: Ejecutar → probar, y ver el registro. */
function probar() {
  const d = armarFinanzas_();
  Logger.log(JSON.stringify(d, null, 2));
  return d;
}

/* Qué pestañas reconoce y qué leyó de cada una (sin datos por departamento). */
function diagnostico() {
  const ss = hoja_();
  Logger.log("Archivo leído: " + ss.getName());
  ss.getSheets().forEach(h => {
    const info = infoMes_(h);
    if (!info) { Logger.log("· " + h.getName() + " → no es un mes, se ignora"); return; }
    const m = leerMes_(info);
    Logger.log("· " + h.getName() + " → " + m.id + (m.capturado ? "" : " (vacía)") +
      " · saldo " + m.saldoIni + " → " + m.saldoFin +
      " · manto " + m.ingresos.manto + " · agua " + m.ingresos.agua +
      " · fijos " + m.egresos.fijos + " · variables " + m.egresos.variables + " · pipas " + m.egresos.agua +
      " · pagaron " + m.cobranza.pagaron + "/" + m.unidades);
  });
}

/* ============================ ORIGEN DE DATOS ============================ */

/* Abre la hoja. Si HOJA_ID es una Hoja de Google, directo. Si es un Excel,
   usa (o rehace) la copia convertida que el script guarda en tu Drive. */
function hoja_() {
  if (!HOJA_ID) return SpreadsheetApp.getActive();
  const archivo = DriveApp.getFileById(HOJA_ID);
  if (archivo.getMimeType() === MIME_HOJA) return SpreadsheetApp.openById(HOJA_ID);
  return SpreadsheetApp.openById(copiaConvertida_(archivo));
}

function copiaConvertida_(archivo) {
  const props = PropertiesService.getScriptProperties();
  const version = String(archivo.getLastUpdated().getTime()) + "|" + HOJA_ID;
  const actual = props.getProperty("copiaId");
  if (actual && props.getProperty("copiaVersion") === version) {
    try { DriveApp.getFileById(actual); return actual; } catch (_) { /* la borraron: se rehace */ }
  }
  const candado = LockService.getScriptLock();
  candado.waitLock(30000);
  try {
    /* Otra ejecución pudo rehacerla mientras se esperaba el candado. */
    const otra = props.getProperty("copiaId");
    if (otra && otra !== actual && props.getProperty("copiaVersion") === version) return otra;
    const r = UrlFetchApp.fetch("https://www.googleapis.com/drive/v3/files/" + encodeURIComponent(HOJA_ID) + "/copy?supportsAllDrives=true&fields=id", {
      method: "post",
      contentType: "application/json",
      headers: { Authorization: "Bearer " + ScriptApp.getOAuthToken() },
      payload: JSON.stringify({ name: "Lahia · copia de lectura para el sitio (no editar)", mimeType: MIME_HOJA }),
      muteHttpExceptions: true
    });
    if (r.getResponseCode() >= 300) throw new Error("No pude convertir el Excel a Hoja de Google (" + r.getResponseCode() + "): " + r.getContentText().slice(0, 200));
    const nueva = JSON.parse(r.getContentText()).id;
    props.setProperties({ copiaId: nueva, copiaVersion: version });
    if (actual && actual !== nueva) { try { DriveApp.getFileById(actual).setTrashed(true); } catch (_) { /* ya no estaba */ } }
    return nueva;
  } finally {
    candado.releaseLock();
  }
}

/* ============================ LECTURA ============================ */

function armarFinanzas_() {
  const ss = hoja_();
  const hojas = ss.getSheets().map(h => infoMes_(h)).filter(Boolean).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  if (!hojas.length) throw new Error("No encuentro pestañas de meses (ENERO, FEBRERO…).");

  /* Meses futuros (alguien pagó diciembre por adelantado): no se publican ni cobran
     cuota; sus pagos cuentan como adelanto del mes en curso. */
  const hoyId = Utilities.formatDate(new Date(), "America/Mexico_City", "yyyy-MM");
  const meses = [], avisos = [], proyectos = {}, futuros = [];
  let unidades = UNIDADES, cuota = CUOTA;
  hojas.forEach(info => {
    const m = leerMes_(info);
    if (!m.capturado) return;
    if (m.id > hoyId) { futuros.push(m); return; }
    const prev = meses[meses.length - 1];
    if (prev && prev.id === m.id) { avisos.push("Hay dos pestañas para " + m.nombre + " " + m.anio + "; se usa la primera."); return; }
    if (prev && firma_(prev) === firma_(m) && Math.abs(m.saldoIni - prev.saldoFin) > 0.5) {
      avisos.push(m.nombre + " " + m.anio + " es una copia de " + prev.nombre.toLowerCase() + " sin capturar (mismas cifras y saldo inicial sin encadenar); no se publica.");
      return;
    }
    const anterior = (m.id.slice(5) === "01" ? (m.anio - 1) + "-12" : m.anio + "-" + ("0" + (parseInt(m.id.slice(5), 10) - 1)).slice(-2));
    if (prev && prev.id === anterior && Math.abs(m.saldoIni - prev.saldoFin) > 0.5) {     // también de diciembre a enero
      avisos.push("El saldo inicial de " + m.nombre.toLowerCase() + " (" + m.saldoIni + ") no coincide con el saldo final de " + prev.nombre.toLowerCase() + " (" + prev.saldoFin + ").");
    }
    unidades = m.unidades || unidades;
    cuota = m.cuota || cuota;
    m.proyectos.forEach(p => { proyectos[p.nombre.toLowerCase()] = p; });
    delete m.proyectos;
    meses.push(m);
  });
  if (!meses.length) throw new Error("Ninguna pestaña mensual tiene datos todavía.");

  /* Morosidad acumulada: saldo por unidad = todo lo pagado − todas las cuotas
     transcurridas, SIN reiniciar en enero (quien debe diciembre sigue debiéndolo en
     enero). Se calcula aquí, con los cobros por departamento, y SOLO salen las sumas
     y los conteos. */
  const saldos = typeof saldosIniciales_ === "function" ? saldosIniciales_() : {};   // adeudos de antes de la primera pestaña (Vecinos.gs, privado)
  meses.forEach((m, i) => {
    m.pagosPorUnidad.forEach(([depto, pagado]) => { saldos[depto] = (saldos[depto] || 0) + pagado - m.cuota; });
    if (i === meses.length - 1) futuros.forEach(f => f.pagosPorUnidad.forEach(([depto, pagado]) => { saldos[depto] = (saldos[depto] || 0) + pagado; }));
    m.enCurso = m.id === hoyId;
    const vals = Object.keys(saldos).map(k => saldos[k]);
    const neg = vals.filter(v => v < -0.5), pos = vals.filter(v => v > 0.5);
    m.mora = {
      acumulada: redondear_(-neg.reduce((a, b) => a + b, 0)),
      unidades: neg.length,
      adelantos: redondear_(pos.reduce((a, b) => a + b, 0)),
      unidadesAdelanto: pos.length
    };
    delete m.pagosPorUnidad; delete m.aguaPorUnidad;   // no salen del script
  });

  return {
    ok: true,
    servicio: "lahia-finanzas",
    generado: new Date().toISOString(),
    unidades: unidades,
    cuota: cuota,
    anio: Math.max.apply(null, meses.map(m => m.anio)),
    meses: meses,
    proyectos: Object.keys(proyectos).map(k => proyectos[k]),
    avisos: avisos
  };
}

function firma_(m) {
  return [m.saldoIni, m.ingresos.manto, m.ingresos.agua, m.egresos.fijos, m.egresos.variables, m.egresos.agua].join("|");
}

function infoMes_(hoja) {
  const n = sinAcentos_(hoja.getName().trim().toUpperCase());
  const m = /^([A-Z]+)(?:\s+(\d{4}))?$/.exec(n);
  if (!m) return null;
  const mes = MESES.indexOf(m[1]);
  if (mes < 0) return null;
  let anio = m[2] ? parseInt(m[2], 10) : null;
  if (!anio) {
    /* "Mes y año": en esta hoja a veces quedó la fecha de otro mes al copiar
       la pestaña, así que de esa celda solo se toma el año. */
    const vals = hoja.getRange(1, 2, 12, 2).getValues();
    const fila = vals.find(f => norm_(f[0]).indexOf("mesyano") === 0);
    const v = fila ? fila[1] : "";
    if (v instanceof Date) anio = new Date(v.getTime() + 12 * 3600 * 1000).getFullYear();
    else if (typeof v === "number" && v > 30000 && v < 80000) anio = new Date(Date.UTC(1899, 11, 30) + v * 86400000).getUTCFullYear();
    else {
      const t = /(\d{4})\s*$/.exec(String(v || ""));
      if (t) anio = parseInt(t[1], 10);
    }
  }
  if (!anio) anio = new Date().getFullYear();
  return { hoja: hoja, mes: mes, anio: anio, id: anio + "-" + ("0" + (mes + 1)).slice(-2) };
}

/* Lee una pestaña mensual buscando cada dato por su etiqueta (columna B), así
   no importa si la administración inserta o mueve filas.
   Columnas: B etiqueta · C valor (resumen).
   Cobros: B depto · C mantenimiento · D agua · E total · F deuda de agua.
   Gastos: B proveedor · C descripción · D monto · E liga al comprobante. */
function leerMes_(info) {
  const h = info.hoja;
  const vals = h.getRange(1, 2, FILAS, 5).getValues();          // B:F
  const etiquetas = vals.map(f => norm_(f[0]));

  const filaDe = (clave, desde, hasta) => {
    for (let i = desde || 0; i < Math.min(hasta || FILAS, etiquetas.length); i++) if (etiquetas[i].indexOf(clave) === 0) return i;
    return -1;
  };
  /* Las secciones van después del bloque COBROS; buscar desde ahí evita
     confundir "GASTOS FIJOS (ordinarios)" con el renglón "(−) Gastos fijos". */
  const fCobros = filaDe("cobrospordepartamento");
  const seccion = clave => filaDe(clave, fCobros > 0 ? fCobros + 1 : 0);
  const fFijos = seccion("gastosfijos");
  const fVar = seccion("gastosvariables");
  const fAgua = seccion("gastosdeagua");
  const fProy = seccion("proyectosencurso");
  const tope = fCobros > 0 ? fCobros : 40;

  const numResumen = clave => { const i = filaDe(clave, 0, tope); return i < 0 ? null : num_(vals[i][1]); };
  const unidades = Math.round(numResumen("numerodeunidades") || numResumen("unidadestotales") || 0) || UNIDADES;
  const cuota = numResumen("cuotademantenimiento") || CUOTA;

  /* Renglones de una sección: desde la fila siguiente al encabezado de
     columnas hasta el renglón "TOTAL" (o hasta un bloque vacío largo). */
  const renglones = (inicio, conTotal) => {
    const out = [];
    if (inicio < 0) return out;
    let vacias = 0;
    for (let i = inicio + 2; i < etiquetas.length; i++) {
      const et = etiquetas[i];
      if (conTotal && et.indexOf("total") === 0) break;
      if (!conTotal && /^(gastos|cobros|proyectos)/.test(et)) break;
      if (!et && !String(vals[i][1]).trim() && !String(vals[i][2]).trim()) { if (++vacias >= 8) break; continue; }
      vacias = 0;
      out.push({ fila: i + 1, b: String(vals[i][0]).trim(), c: vals[i][1], d: vals[i][2], e: vals[i][3], f: vals[i][4] });
    }
    return out;
  };

  const cobros = renglones(fCobros, true).filter(r => r.b);
  const pagosPorUnidad = cobros.map(r => [r.b, num_(r.c)]);
  const manto = pagosPorUnidad.reduce((a, b) => a + b[1], 0);
  const agua = cobros.reduce((a, r) => a + num_(r.d), 0);
  const deudas = cobros.map(r => num_(r.f)).filter(v => v > 0.5);

  const ligas = ligasDrive_(h, Math.min.apply(null, [fFijos, fVar, fAgua].map(f => f < 0 ? FILAS : f)));
  const gastos = inicio => renglones(inicio, true)
    .filter(r => (r.b || String(r.c).trim()) && num_(r.d))
    .map(r => {
      const it = [titulo_(r.b), titulo_(String(r.c || "").trim(), true), redondear_(num_(r.d))];
      const liga = ligas[r.fila];
      if (liga) it.push(liga);
      return it;
    });
  const fijos = gastos(fFijos), variables = gastos(fVar), pipas = gastos(fAgua);
  const tot = l => redondear_(l.reduce((a, b) => a + b[2], 0));
  const totFijos = tot(fijos), totVar = tot(variables), totAgua = tot(pipas);

  const proyectos = renglones(fProy, false).filter(r => r.b && r.b !== "—").map(r => {
    const e = String(r.e || "").trim();
    return {
      nombre: r.b, estado: String(r.c || "").trim(),
      presupuesto: num_(r.d) || null,
      liga: /^https?:\/\//.test(e) ? e : "",
      avance: /^https?:\/\//.test(e) || e === "—" ? "" : e
    };
  });

  const saldoIni = numResumen("saldoinicial") || 0;
  const iFin = filaDe("saldofinaldelmes", 0, tope);
  const saldoFin = iFin >= 0 ? num_(vals[iFin][1]) : saldoIni + manto + agua - totFijos - totVar - totAgua;
  const pagaron = pagosPorUnidad.filter(p => p[1] > 0).length;
  const derrama = numResumen("derramadeaguaporunidad");

  return {
    id: info.id, anio: info.anio, nombre: NOMBRES[info.mes], corto: CORTOS[info.mes],
    unidades: unidades, cuota: cuota,
    saldoIni: redondear_(saldoIni), saldoFin: redondear_(saldoFin),
    ingresos: { manto: redondear_(manto), agua: redondear_(agua) },
    egresos: { fijos: totFijos, variables: totVar, agua: totAgua },
    cobranza: { pagaron: pagaron, pct: redondear_(unidades ? pagaron / unidades * 100 : 0, 1), morosos: Math.max(0, unidades - pagaron) },
    derrama: derrama == null ? null : redondear_(derrama),
    deudaAgua: { monto: redondear_(deudas.reduce((a, b) => a + b, 0)), unidades: deudas.length },
    detalle: { fijos: fijos, variables: variables, agua: pipas },
    proyectos: proyectos,
    capturado: manto > 0 || agua > 0 || totFijos > 0 || totVar > 0 || totAgua > 0,
    pagosPorUnidad: pagosPorUnidad,
    aguaPorUnidad: cobros.map(r => [r.b, num_(r.d), num_(r.f)])      // [depto, agua pagada, deuda de agua] · solo para «Mi cuenta»
  };
}

/* Ligas de comprobante en la columna E de los gastos: hipervínculo del texto,
   URL escrita o fórmula HYPERLINK. Devuelve { fila: url }. */
function ligasDrive_(h, inicio) {
  const out = {};
  if (inicio >= FILAS) return out;
  const rango = h.getRange(inicio + 1, 5, FILAS - inicio, 1);     // E
  const ricos = rango.getRichTextValues();
  const formulas = rango.getFormulas();
  const valores = rango.getValues();
  for (let i = 0; i < ricos.length; i++) {
    let url = ricos[i][0] && ricos[i][0].getLinkUrl();
    if (!url && ricos[i][0]) {
      const runs = ricos[i][0].getRuns();
      for (let r = 0; r < runs.length && !url; r++) url = runs[r].getLinkUrl();
    }
    if (!url) { const m = /HYPERLINK\(\s*"([^"]+)"/i.exec(formulas[i][0] || ""); if (m) url = m[1]; }
    if (!url && /^https?:\/\//.test(String(valores[i][0]).trim())) url = String(valores[i][0]).trim();
    if (url) out[inicio + 1 + i] = url;
  }
  return out;
}

/* ============================ UTILIDADES ============================ */

/* Lo capturado en MAYÚSCULAS se publica legible: proveedores en tipo título
   ("MARÍA CRUZ RAMÍREZ H." → "María Cruz Ramírez H.") y descripciones en tipo
   oración ("PAGO DE 14 PIPAS DE AGUA" → "Pago de 14 pipas de agua"). Lo que ya
   viene en minúsculas, las razones sociales y las siglas se dejan como están. */
const SIGLAS = ["CFE", "MOP", "PH", "IVA", "CEA", "LED", "PVC", "SA", "CV", "III", "II", "IV"];
function titulo_(s, oracion) {
  s = String(s || "").replace(/\s+/g, " ").trim();
  if (!s || s !== s.toUpperCase() || /S\.A\.|C\.V\./.test(s)) return s;
  const menores = ["de", "del", "la", "las", "el", "los", "y", "e", "o", "u", "a", "al", "en", "por", "para", "con"];
  return s.split(" ").map((w, i) => {
    const limpia = w.replace(/[^A-ZÁÉÍÓÚÑÜ]/g, "");
    if (SIGLAS.indexOf(limpia) >= 0) return w;
    const l = w.toLowerCase();
    if (i === 0) return l.charAt(0).toUpperCase() + l.slice(1);
    if (oracion || menores.indexOf(l) >= 0) return l;
    return l.charAt(0).toUpperCase() + l.slice(1);
  }).join(" ");
}
function sinAcentos_(s) { return String(s).normalize("NFD").replace(/[̀-ͯ]/g, ""); }
function norm_(s) { return sinAcentos_(String(s == null ? "" : s)).toLowerCase().replace(/[^a-z0-9]+/g, ""); }
function num_(v) {
  if (typeof v === "number") return isFinite(v) ? v : 0;
  let s = String(v == null ? "" : v).trim();
  if (!s) return 0;
  const neg = /^\(.*\)$/.test(s) || /[-−–]/.test(s);
  s = s.replace(/[^0-9.,]/g, "");
  const lp = s.lastIndexOf("."), lc = s.lastIndexOf(",");
  if (lp !== -1 && lc !== -1) s = lp > lc ? s.replace(/,/g, "") : s.replace(/\./g, "").replace(",", ".");
  else if (lc !== -1) { const p = s.split(","); s = (p.length === 2 && p[1].length !== 3) ? p[0] + "." + p[1] : s.replace(/,/g, ""); }
  const n = parseFloat(s);
  return isFinite(n) ? (neg ? -n : n) : 0;
}
function redondear_(v, dec) { const f = Math.pow(10, dec == null ? 2 : dec); return Math.round(v * f) / f; }

/* Lahia · Vecinos: Mi cuenta (PIN), casa club, correos, reporte del día 10 y semáforo (segundo archivo del proyecto).
   En el editor: «+ → Secuencia de comandos» → nómbralo Vecinos → pega este archivo. Luego, una sola vez:
   Ejecutar → instalarVecinos.

   La hoja de la Administración (HOJA_ID en Código) SOLO SE LEE. Todo lo que el sitio guarda (configuración,
   correos, PIN cifrados, reservas de la casa club, saldos iniciales y bitácora) vive en una hoja aparte,
   «Lahia · Sitio (privado)», que instalarVecinos crea en tu Drive. Así no se agregan pestañas a la hoja de la
   Administración ni hace falta permiso para editarla.

   - micuenta.html: cada depto crea su PIN (con la clave de residentes) y ve su estado de cuenta: mantenimiento mes
     por mes (los adelantos cubren los meses siguientes) y su deuda de agua.
   - casa-club.html: calendario público (solo dice qué días están apartados). Se pide con depto, nombre, correo y
     número de personas; a la Administración le llega un correo con ✅ Confirmar / ❌ Rechazar (ligas firmadas) y
     el aviso de si el depto tiene adeudo (el reglamento pide estar al corriente).
   - correo.html: registro y baja del reporte mensual (con la clave de residentes).
   - Día 10: kit para la Administración (texto para WhatsApp + semáforo). Con Config → reporte_envio = «sí»
     también sale el reporte a los correos registrados (copia oculta). Nunca dos veces el mismo mes.
   Para probar: Ejecutar → reportePrueba o revisar (llegan solo a ti). */

const KEY_HASH_SITIO = "bcac371b54f59945a14aa49e2e408e5d6e4dbc59387f5d8cfc6b015d40d5bb02";   // el mismo de js/finanzas.js
const HOJA_CFG_V = "Config (sitio)", HOJA_CORREOS_V = "Correos", HOJA_RCC_V = "Reservas casa club", HOJA_REP_V = "Reportes";
const ENC_CORREOS_V = ["Registrado", "Departamento", "Correo", "Activo"];
const ENC_RCC_V = ["Folio", "Solicitada el", "Día", "Departamento", "Correo", "Estatus", "Nota de la Administración", "Quién la pide", "Personas", "Horario", "Motivo"];
const EST_RCC_V = ["Por confirmar", "Confirmada", "Rechazada", "Cancelada"];
const ZONA_V = "America/Mexico_City";
const REMITENTE_V = "Lahia · Administración (AMC)";
/* Datos de la Administración (AMC · Andrés). Si en Config la casilla está vacía, se usan estos. */
const ADMON_V = "admon.lahia@gmail.com";
const DEF_V = { admin_whatsapp: "4424616789", admin_correo: ADMON_V, sitio_url: "https://eduardolusan-source.github.io/condominio-lahia" };

/* ------------------------------- rutas ------------------------------- */
function rutaVecinosGet_(p) {
  if (p.accion === "vecinos") return { ok: true, deptos: deptosV_(), correos: correosCuenta_() };
  if (p.accion === "casa") return casaPublica_();
  if (p.accion === "folio") return folioCasa_(p.folio);
  if (p.accion === "resolverCasa") return resolverCasaV_(p);
  return null;
}
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const d = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    if (String(d.web || "").trim()) return texto_(JSON.stringify({ ok: true }));                 // campo trampa
    if (!limiteV_("post", 300)) return texto_(JSON.stringify({ ok: false, error: "espera" }));
    lock.waitLock(15000);
    const r = d.accion === "correo" ? registrarCorreoV_(d) : d.accion === "casa" ? reservarCasaV_(d) : d.accion === "cancelarCasa" ? cancelarCasaV_(d)
      : d.accion === "pin" ? crearPinV_(d) : d.accion === "cuenta" ? miCuentaV_(d) : { ok: false, error: "accion" };
    return texto_(JSON.stringify(r));
  } catch (err) { return texto_(JSON.stringify({ ok: false, error: String(err.message || err) })); }
  finally { try { lock.releaseLock(); } catch (_) {} }
}

/* ------------------------------- utilidades ------------------------------- */
/* Hoja privada del sitio (la crea instalarVecinos y guarda su id). */
let DATOS_MEMO_V = null, CFG_MEMO_V = null;   // se abre una sola vez por ejecución
function datosV_() {
  if (DATOS_MEMO_V) return DATOS_MEMO_V;
  const p = PropertiesService.getScriptProperties(), id = p.getProperty("datos_id");
  if (id) { try { return (DATOS_MEMO_V = SpreadsheetApp.openById(id)); } catch (_) { /* la borraron: se crea otra */ } }
  const ss = SpreadsheetApp.create("Lahia · Sitio (privado)");
  p.setProperty("datos_id", ss.getId());
  try { ss.getSheets()[0].setName(HOJA_CFG_V); ss.getSheets()[0].getRange(1, 1, 1, 3).setValues([["Clave", "Valor", "Para qué"]]).setFontWeight("bold"); } catch (_) {}
  return ss;
}
function cfgV_() {
  if (CFG_MEMO_V) return CFG_MEMO_V;
  const h = datosV_().getSheetByName(HOJA_CFG_V), out = {};
  if (h && h.getLastRow() > 1) h.getRange(2, 1, h.getLastRow() - 1, 2).getValues().forEach(f => { if (f[0]) out[String(f[0]).trim()] = f[1]; });
  Object.keys(DEF_V).forEach(k => { if (!String(out[k] == null ? "" : out[k]).trim()) out[k] = DEF_V[k]; });
  return (CFG_MEMO_V = out);
}
function hojaV_(nombre, enc) {
  const ss = datosV_(); let h = ss.getSheetByName(nombre);
  if (!h) { h = ss.insertSheet(nombre); h.getRange(1, 1, 1, enc.length).setValues([enc]).setFontWeight("bold").setBackground("#e3e3db"); h.setFrozenRows(1); }
  return h;
}
function filasV_(nombre, ancho) { const h = datosV_().getSheetByName(nombre); return h && h.getLastRow() > 1 ? h.getRange(2, 1, h.getLastRow() - 1, ancho).getValues() : []; }
function limpioV_(s, n) { return String(s == null ? "" : s).replace(/^[=+\-@\t\r]+/, "").replace(/\s+/g, " ").trim().slice(0, n); }
function correoOkV_(c) { return /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[a-z]{2,}$/i.test(String(c || "")); }
function diaV_(v) { return Object.prototype.toString.call(v) === "[object Date]" ? Utilities.formatDate(v, ZONA_V, "yyyy-MM-dd") : String(v || "").slice(0, 10); }
function limiteV_(k, max) { const c = CacheService.getScriptCache(), kk = "limv_" + k, n = Number(c.get(kk) || 0); if (n >= max) return false; c.put(kk, String(n + 1), 3600); return true; }
function sitioV_() { return String(cfgV_().sitio_url || "").replace(/\/+$/, ""); }
/* A quién le llega lo de la Administración (kit, casa club, PIN nuevos): siempre admon.lahia@gmail.com
   y además quien esté en Config → reporte_copia. */
function admonV_() { const l = [ADMON_V].concat(String(cfgV_().reporte_copia || "").split(/[,;\s]+/)).map(x => String(x).trim().toLowerCase()).filter(correoOkV_).filter((x, i, a) => a.indexOf(x) === i); return l; }
function secretoV_() { const p = PropertiesService.getScriptProperties(); let k = p.getProperty("secreto"); if (!k) { k = Utilities.getUuid() + Utilities.getUuid(); p.setProperty("secreto", k); } return k; }
function hexV_(b) { return b.map(x => ("0" + ((x + 256) % 256).toString(16)).slice(-2)).join(""); }
function firmaV_(texto) { return hexV_(Utilities.computeHmacSha256Signature(texto, secretoV_())).slice(0, 32); }
function claveOkV_(clave) {
  if (!limiteV_("clave_" + String(clave || "").length, 60)) return false;
  const b = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(clave || "").trim(), Utilities.Charset.UTF_8);
  return b.map(x => ("0" + ((x + 256) % 256).toString(16)).slice(-2)).join("") === KEY_HASH_SITIO;
}
/* Departamentos: los renglones de COBROS de la pestaña más reciente que tenga datos. */
function hojasMesL_(ss) { return ss.getSheets().map(h => infoMes_(h)).filter(Boolean).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0); }
function deptosV_() {
  const c = CacheService.getScriptCache(), g = c.get("deptos_v"); if (g) return JSON.parse(g);
  const hs = hojasMesL_(hoja_()).reverse();
  for (let i = 0; i < hs.length; i++) {
    const m = leerMes_(hs[i]); const ds = m.pagosPorUnidad.map(p => String(p[0]).trim()).filter(Boolean);
    if (ds.length) { c.put("deptos_v", JSON.stringify(ds), 3600); return ds; }
  }
  return [];
}
function correosCuenta_() {
  const act = filasV_(HOJA_CORREOS_V, 4).filter(f => correoOkV_(f[2]) && !/^no/i.test(String(f[3])));
  return { con: act.map(f => String(f[1])).filter((x, i, a) => a.indexOf(x) === i).length, total: deptosV_().length || 32 };
}

/* ------------------------------- correos ------------------------------- */
function registrarCorreoV_(d) {
  const correo = String(d.correo || "").trim().toLowerCase(), depto = limpioV_(d.depto, 20), baja = d.baja === true;
  if (!correoOkV_(correo)) return { ok: false, error: "correo" };
  const h = hojaV_(HOJA_CORREOS_V, ENC_CORREOS_V), fs = filasV_(HOJA_CORREOS_V, 4);
  const i = fs.findIndex(f => String(f[2]).trim().toLowerCase() === correo);
  if (baja) {
    if (i >= 0) h.getRange(i + 2, 4).setValue("no");
    MailApp.sendEmail(correo, "Ya no recibirás el reporte de Lahia", "Listo: dejaste de recibir el reporte mensual de Lahia.\n\nSi fue un error, vuelve a registrarte en el sitio.", { name: REMITENTE_V });
    return { ok: true, baja: true };
  }
  if (!claveOkV_(d.clave)) return { ok: false, error: "clave" };
  if (deptosV_().length && deptosV_().map(x => x.toLowerCase()).indexOf(depto.toLowerCase()) < 0) return { ok: false, error: "departamento" };
  if (i >= 0) h.getRange(i + 2, 1, 1, 4).setValues([[new Date(), depto, correo, "sí"]]);
  else h.getRange(h.getLastRow() + 1, 1, 1, 4).setValues([[new Date(), depto, correo, "sí"]]);
  MailApp.sendEmail(correo, "Ya recibirás el reporte de Lahia", "Hola:\n\nCada mes, alrededor del día 10, te llegará el reporte de cuentas del condominio: saldo, ingresos, gastos y cobranza, siempre en cifras agregadas.\n\nSi no fuiste tú, date de baja en la página «Recibe el reporte» del sitio" + (sitioV_() ? ": " + sitioV_() + "/correo.html" : "") + ".", { name: REMITENTE_V });
  return { ok: true };
}

/* ------------------------------- casa club ------------------------------- */
const activaV_ = f => /por confirmar|confirmada/i.test(String(f[5] || "Por confirmar"));
function casaPublica_() {
  const c = CacheService.getScriptCache(), g = c.get("casa_pub"); if (g) return JSON.parse(g);
  const r = casaPublicaFresca_(); try { c.put("casa_pub", JSON.stringify(r), 60); } catch (_) {} return r;
}
function olvidarCasa_() { try { CacheService.getScriptCache().remove("casa_pub"); } catch (_) {} }
function casaPublicaFresca_() {
  const hoy = Utilities.formatDate(new Date(), ZONA_V, "yyyy-MM-dd");
  return { ok: true, ocupados: filasV_(HOJA_RCC_V, ENC_RCC_V.length).filter(f => f[0] && activaV_(f) && diaV_(f[2]) >= hoy).map(f => ({ dia: diaV_(f[2]), estatus: /confirmada/i.test(String(f[5])) ? "ocupado" : "apartado" })),
    deptos: deptosV_(), renta: Number(cfgV_().casa_club_renta) || 1000 };
}
function folioCasa_(folio) {
  const f = String(folio || "").trim().toUpperCase();
  if (!/^CC-\d{4}$/.test(f) || !limiteV_("folio", 200)) return { ok: false, error: "folio" };
  const x = filasV_(HOJA_RCC_V, ENC_RCC_V.length).find(r => String(r[0]).toUpperCase() === f);
  return x ? { ok: true, folio: f, dia: diaV_(x[2]), estatus: String(x[5] || "Por confirmar"), nota: String(x[6] || "") } : { ok: false, error: "no encontrado" };
}
/* Reglamento Interno 2024: renta $1,000 siempre; garantía según personas (10–20 $1,000 · 21–30 $1,500 · 31–50 $2,000;
   9 o menos, sin garantía); máximo 50. Horario: L–J 9–22 h, V y S 9–23:59 h, D 10–20 h. */
const HORARIO_CC_V = { 0: "10:00 a 20:00 h", 1: "9:00 a 22:00 h", 2: "9:00 a 22:00 h", 3: "9:00 a 22:00 h", 4: "9:00 a 22:00 h", 5: "9:00 a 23:59 h", 6: "9:00 a 23:59 h" };
function garantiaCC_(n) { return n >= 31 ? 2000 : n >= 21 ? 1500 : n >= 10 ? 1000 : 0; }
function reservarCasaV_(d) {
  /* Sin clave: la puede pedir el propietario o el inquilino; la Administración confirma cada una. */
  const depto = limpioV_(d.depto, 20), dia = String(d.dia || "").slice(0, 10), correo = String(d.correo || "").trim().toLowerCase(), nombre = limpioV_(d.nombre, 80);
  const personas = Math.round(Number(d.personas) || 0), motivo = limpioV_(d.motivo, 120);
  if (!limiteV_("casa_" + depto.toLowerCase(), 6)) return { ok: false, error: "espera" };
  if (nombre.length < 3) return { ok: false, error: "nombre" };
  if (!(personas >= 1 && personas <= 50)) return { ok: false, error: "personas" };
  if (deptosV_().length && deptosV_().map(x => x.toLowerCase()).indexOf(depto.toLowerCase()) < 0) return { ok: false, error: "departamento" };
  if (!correoOkV_(correo)) return { ok: false, error: "correo" };
  const hoy = Utilities.formatDate(new Date(), ZONA_V, "yyyy-MM-dd"), tope = Utilities.formatDate(new Date(Date.now() + 90 * 864e5), ZONA_V, "yyyy-MM-dd");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia) || dia <= hoy) return { ok: false, error: "dia" };
  if (dia > tope) return { ok: false, error: "lejos" };
  const fs = filasV_(HOJA_RCC_V, ENC_RCC_V.length);
  if (fs.some(f => activaV_(f) && diaV_(f[2]) === dia)) return { ok: false, error: "ocupado" };
  if (fs.filter(f => activaV_(f) && String(f[3]).toLowerCase() === depto.toLowerCase() && diaV_(f[2]) >= hoy).length >= 2) return { ok: false, error: "tope" };
  const props = PropertiesService.getScriptProperties(), n = Number(props.getProperty("folio_casa") || 0) + 1; props.setProperty("folio_casa", String(n));
  const folio = "CC-" + ("000" + n).slice(-4), h = hojaV_(HOJA_RCC_V, ENC_RCC_V), fila = h.getLastRow() + 1;
  const horario = HORARIO_CC_V[new Date(dia + "T12:00:00").getDay()], renta = Number(cfgV_().casa_club_renta) || 1000, gar = garantiaCC_(personas);
  if (!String(h.getRange(1, 9).getValue() || "").trim()) h.getRange(1, 1, 1, ENC_RCC_V.length).setValues([ENC_RCC_V]).setFontWeight("bold");
  h.getRange(fila, 1, 1, ENC_RCC_V.length).setValues([[folio, new Date(), dia, depto, correo, "Por confirmar", "", nombre, personas, horario, motivo]]);
  h.getRange(fila, 3).setNumberFormat("yyyy-mm-dd"); olvidarCasa_();
  try { h.getRange(fila, 6).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(EST_RCC_V, true).setAllowInvalid(true).build()); } catch (_) {}
  encolarAvisoCasa_(folio);
  MailApp.sendEmail(correo, "Recibimos tu solicitud de casa club " + folio, "Día: " + dia + " (" + horario + ")\nPersonas: " + personas + "\nEstatus: por confirmar.\n\nLa Administración te confirmará por correo. Renta: $" + renta.toLocaleString("es-MX") + (gar ? "; garantía: $" + gar.toLocaleString("es-MX") : "; sin garantía (menos de 10 personas)") + ". El reglamento pide entregar la solicitud por escrito y firmada.\nConsulta tu folio en la página «Casa club» del sitio.", { name: REMITENTE_V });
  return { ok: true, folio: folio, renta: renta, garantia: gar, horario: horario };
}
/* El correo con botones a la Administración sale unos segundos después de la reserva, en otra ejecución:
   así el vecino no espera a que se calcule el adeudo del depto ni a que salgan los correos. */
function encolarAvisoCasa_(folio) {
  const p = PropertiesService.getScriptProperties(), cola = String(p.getProperty("cola_casa") || "").split(",").filter(Boolean);
  if (cola.indexOf(folio) < 0) cola.push(folio);
  p.setProperty("cola_casa", cola.join(","));
  if (!ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === "avisarAdmonCasa")) ScriptApp.newTrigger("avisarAdmonCasa").timeBased().after(5 * 1000).create();
}
function avisarAdmonCasa() {
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === "avisarAdmonCasa").forEach(t => ScriptApp.deleteTrigger(t));
  const lock = LockService.getScriptLock(); lock.waitLock(30000);
  let cola;
  try { const p = PropertiesService.getScriptProperties(); cola = String(p.getProperty("cola_casa") || "").split(",").filter(Boolean); p.deleteProperty("cola_casa"); }
  finally { lock.releaseLock(); }
  if (!cola.length) return;
  const fs = filasV_(HOJA_RCC_V, ENC_RCC_V.length), hoy = Utilities.formatDate(new Date(), ZONA_V, "yyyy-MM-dd");
  cola.forEach(folio => {
    const r = fs.find(f => String(f[0]) === folio); if (!r) return;
    try { avisoCasaUno_(r, fs, hoy); } catch (e) { Logger.log("aviso casa " + folio + ": " + e); }
  });
}
function avisoCasaUno_(r, fs, hoy) {
  const folio = String(r[0]), dia = diaV_(r[2]), depto = String(r[3]), correo = String(r[4]), nombre = String(r[7] || ""), personas = Number(r[8]) || 0, horario = String(r[9] || ""), motivo = String(r[10] || "");
  const renta = Number(cfgV_().casa_club_renta) || 1000, gar = garantiaCC_(personas);
  let adeudo = 0; try { adeudo = cuentaDeptoV_(deptoValidoV_(depto) || depto).debe; } catch (_) {}
  const liga = e => (sitioV_() ? sitioV_() + "/casa-admin.html" : ScriptApp.getService().getUrl()) + "?accion=resolverCasa&folio=" + folio + "&e=" + e + "&t=" + firmaV_(folio + "|" + e);
  const boton = (e, txt, color) => '<a href="' + liga(e) + '" style="display:inline-block;margin:6px 8px 6px 0;padding:14px 22px;border-radius:999px;background:' + color + ';color:#fff;text-decoration:none;font-weight:700;font-size:16px">' + txt + "</a>";
  const fechaL = Utilities.formatDate(new Date(dia + "T12:00:00"), ZONA_V, "dd/MM/yyyy"), otras = fs.filter(f => activaV_(f) && diaV_(f[2]) >= hoy && String(f[0]) !== folio).length;
  admonV_().forEach(a => MailApp.sendEmail(a, "🏠 Casa club: depto " + depto + " pide el " + fechaL + " (" + folio + ")",
    nombre + " (depto " + depto + ") pide la casa club el " + dia + " para " + personas + " personas. Confirmar: " + liga("Confirmada") + "  ·  Rechazar: " + liga("Rechazada"),
    { name: REMITENTE_V, htmlBody: '<div style="font-family:system-ui,sans-serif;max-width:520px"><p style="font-size:13px;color:#3d6b5a;font-weight:700;letter-spacing:.1em;text-transform:uppercase;margin:0">Casa club · ' + folio + '</p><h2 style="margin:6px 0 4px">Depto ' + depto + " pide el " + fechaL + '</h2><p style="color:#52514e;margin:0 0 10px"><b>' + nombre + "</b> · " + correo + "<br>" + personas + " personas · " + horario + (motivo ? " · " + motivo : "") + "<br>Renta $" + renta.toLocaleString("es-MX") + (gar ? " + garantía $" + gar.toLocaleString("es-MX") : " (sin garantía, menos de 10 personas)") + "</p>" +
      (adeudo > 0.5 ? '<p style="background:#fff3cd;color:#5a4300;border-radius:10px;padding:8px 12px;margin:0 0 12px">⚠️ El depto tiene adeudo de <b>$' + Math.round(adeudo).toLocaleString("es-MX") + "</b>. El reglamento pide estar al corriente para usar la casa club.</p>" : '<p style="color:#2e7d32;margin:0 0 12px">✓ El depto está al corriente.</p>') +
      boton("Confirmada", "✅ Confirmar", "#2e7d32") + boton("Rechazada", "❌ Rechazar", "#b3261e") + '<p style="color:#898781;font-size:13px;margin-top:16px">Un toque basta: se anota y al residente le llega el aviso. Recuerda la solicitud firmada que pide el reglamento. ' + (otras ? "Hay " + otras + " fecha(s) más apartadas." : "") + "</p></div>" }));
}
function cancelarCasaV_(d) {
  const folio = String(d.folio || "").trim().toUpperCase(), correo = String(d.correo || "").trim().toLowerCase();
  const h = datosV_().getSheetByName(HOJA_RCC_V), fs = filasV_(HOJA_RCC_V, ENC_RCC_V.length), i = fs.findIndex(f => String(f[0]).toUpperCase() === folio && String(f[4]).toLowerCase() === correo);
  if (!h || i < 0) return { ok: false, error: "no encontrado" };
  h.getRange(i + 2, 6).setValue("Cancelada"); olvidarCasa_();
  admonV_().forEach(a => MailApp.sendEmail(a, "Casa club cancelada " + folio, "Depto " + fs[i][3] + " canceló la casa club del " + diaV_(fs[i][2]) + ". La fecha quedó libre.", { name: REMITENTE_V }));
  return { ok: true };
}
/* Cada 30 minutos: si la Administración cambió el Estatus, avisa al residente (una sola vez por estatus). */
function avisosCasa() {
  if (PropertiesService.getScriptProperties().getProperty("cola_casa")) avisarAdmonCasa();
  const props = PropertiesService.getScriptProperties();
  filasV_(HOJA_RCC_V, ENC_RCC_V.length).forEach(f => {
    const folio = String(f[0]), est = String(f[5] || ""), k = "aviso_" + folio;
    if (!folio || !/confirmada|rechazada/i.test(est) || props.getProperty(k) === est || !correoOkV_(f[4])) return;
    MailApp.sendEmail(String(f[4]), "Casa club " + folio + ": " + est.toLowerCase(), "Tu solicitud de la casa club para el " + diaV_(f[2]) + " quedó " + est.toLowerCase() + "." + (f[6] ? "\n\nNota de la Administración: " + f[6] : "") + (/confirmada/i.test(est) ? "\n\nRecuerda: renta y garantía (según el número de personas) antes del evento, la solicitud firmada y entregar el espacio limpio, con la basura en bolsas negras." : ""), { name: REMITENTE_V });
    props.setProperty(k, est);
  });
}

/* ------------------------------- semáforo ------------------------------- */
function salud_() {
  const ss = hoja_(), puntos = [], hoyId = Utilities.formatDate(new Date(), ZONA_V, "yyyy-MM"), dia = Number(Utilities.formatDate(new Date(), ZONA_V, "d"));
  const hs = hojasMesL_(ss).filter(h => !h.hoja.isSheetHidden()), meses = hs.map(h => Object.assign(leerMes_(h), { _hoja: h.hoja.getName() }));
  const mal = t => puntos.push({ nivel: "rojo", texto: t }), ojo = t => puntos.push({ nivel: "amarillo", texto: t });
  const ant = (() => { const [y, m] = hoyId.split("-").map(Number); return m === 1 ? (y - 1) + "-12" : y + "-" + ("0" + (m - 1)).slice(-2); })();
  const mAnt = meses.find(m => m.id === ant);
  if (!mAnt) mal("No hay pestaña del mes anterior (" + ant + ").");
  else if (!mAnt.capturado && dia >= 5) mal("El mes anterior (" + mAnt._hoja + ") no tiene cobros ni gastos capturados.");
  const firma = m => JSON.stringify([m.pagosPorUnidad, m.detalle]);
  meses.forEach((m, i) => {
    if (i && m.capturado && meses[i - 1].capturado && firma(m) === firma(meses[i - 1])) mal("«" + m._hoja + "» tiene exactamente los mismos cobros y gastos que «" + meses[i - 1]._hoja + "»: parece copiada sin limpiar.");
    if (i && meses[i - 1].capturado && Math.abs(m.saldoIni - meses[i - 1].saldoFin) > 1 && m.id <= hoyId) ojo("El saldo inicial de «" + m._hoja + "» ($" + Math.round(m.saldoIni).toLocaleString("es-MX") + ") no es el saldo final de «" + meses[i - 1]._hoja + "» ($" + Math.round(meses[i - 1].saldoFin).toLocaleString("es-MX") + ").");
    if (m.id > hoyId && m.capturado) ojo("«" + m._hoja + "» es un mes futuro con pagos: cuentan como adelanto, está bien si fue a propósito.");
  });
  if (mAnt && mAnt.capturado) {
    const sin = mAnt.detalle.fijos.concat(mAnt.detalle.variables, mAnt.detalle.agua || []).filter(x => !x[3]).map(x => [x[0] + (x[1] ? " · " + x[1] : "")]);
    if (sin.length) ojo(sin.length + " gasto(s) de " + mAnt._hoja + " sin liga de comprobante: " + sin.slice(0, 4).map(x => x[0]).join(", ") + (sin.length > 4 ? "…" : "") + ".");
    if (mAnt.cobranza.pct < 70) ojo("Cobranza de " + mAnt._hoja + ": " + mAnt.cobranza.pagaron + " de " + mAnt.unidades + " departamentos pagaron.");
  }
  const hoy = Utilities.formatDate(new Date(), ZONA_V, "yyyy-MM-dd"), viejas = filasV_(HOJA_RCC_V, ENC_RCC_V.length).filter(f => f[0] && /por confirmar|^$/i.test(String(f[5] || "")) && diaV_(f[2]) >= hoy && (Date.now() - new Date(f[1]).getTime()) > 2 * 864e5);
  if (viejas.length) ojo(viejas.length + " reserva(s) de casa club llevan más de 2 días por confirmar: " + viejas.map(f => f[0] + " (" + diaV_(f[2]) + ")").join(", ") + ".");
  const cc = correosCuenta_(); puntos.push({ nivel: "info", texto: "Correos registrados: " + cc.con + " de " + cc.total + " departamentos." });
  return { ok: !puntos.some(p => p.nivel === "rojo"), puntos: puntos };
}
function revisar() {
  const s = salud_(); Logger.log(s.puntos.map(p => (p.nivel === "rojo" ? "🔴 " : p.nivel === "amarillo" ? "🟡 " : "ℹ️ ") + p.texto).join("\n"));
  MailApp.sendEmail(Session.getEffectiveUser().getEmail(), "Semáforo de la hoja · Lahia", textoSalud_(s), { name: REMITENTE_V });
  return s;
}
function textoSalud_(s) { const p = s.puntos.filter(x => x.nivel !== "info"); return (p.length ? p.map(x => (x.nivel === "rojo" ? "🔴 " : "🟡 ") + x.texto).join("\n") : "🟢 Todo cuadra.") + "\n" + s.puntos.filter(x => x.nivel === "info").map(x => "ℹ️ " + x.texto).join("\n"); }

/* ------------------------------- reporte mensual ------------------------------- */
const $V = v => (v < 0 ? "−$" : "$") + Math.round(Math.abs(v)).toLocaleString("es-MX");
function datosReporte_(id) {
  const d = armarFinanzas_(), m = d.meses.find(x => x.id === id);
  if (!m || !m.detalle) return null;
  const ing = m.ingresos.manto + m.ingresos.agua, egr = m.egresos.fijos + m.egresos.variables + (m.egresos.agua || 0);
  const gastos = m.detalle.fijos.concat(m.detalle.variables, m.detalle.agua || []).map(g => [g[0] + (g[1] ? " · " + g[1] : ""), g[2]]).sort((a, b) => b[1] - a[1]);
  return { m: m, ing: ing, egr: egr, gastos: gastos, mes: m.nombre + " " + m.anio, proyectos: d.proyectos || [] };
}
function textoWaV_(k) {
  const m = k.m, l = ["🏢 *Lahia · cuentas de " + k.mes + "*", "", "💰 Saldo al cierre: *" + $V(m.saldoFin) + "*", "⬆️ Entró: " + $V(k.ing) + "  ·  ⬇️ Salió: " + $V(k.egr),
    "✅ Pagaron su cuota: " + m.cobranza.pagaron + " de " + m.unidades];
  if (m.mora && m.mora.acumulada > 0.5) l.push("⏳ Cuotas atrasadas: " + $V(m.mora.acumulada) + " (" + m.mora.unidades + " deptos)");
  if (k.gastos.length) l.push("", "En qué se fue:", ...k.gastos.slice(0, 4).map(g => "• " + g[0] + ": " + $V(g[1])));
  l.push("", "Detalle y comprobantes en el sitio (Finanzas, con la clave de residentes)" + (sitioV_() ? ": " + sitioV_() + "/finanzas.html" : "."), "_Cifras agregadas: no se identifica a nadie._");
  return l.join("\n");
}
function htmlReporteV_(k) {
  const m = k.m, fila = (a, b, c) => '<tr><td style="padding:8px 0;border-bottom:1px solid #e1e0d9">' + a + '</td><td style="padding:8px 0;border-bottom:1px solid #e1e0d9;text-align:right;font-weight:700;color:' + (c || "#0b0b0b") + '">' + b + "</td></tr>";
  return '<div style="font-family:system-ui,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;color:#0b0b0b">' +
    '<p style="margin:0;color:#3d6b5a;font-size:12px;letter-spacing:.12em;text-transform:uppercase;font-weight:700">Condominio Lahia</p>' +
    '<h1 style="font-size:24px;margin:4px 0 2px">Cuentas de ' + k.mes + '</h1><p style="margin:0 0 16px;color:#52514e">Cierre del mes · cifras agregadas</p>' +
    '<div style="background:#f3f3ee;border-radius:14px;padding:16px 18px;margin-bottom:14px"><div style="font-size:13px;color:#52514e">Saldo al cierre</div><div style="font-size:32px;font-weight:800">' + $V(m.saldoFin) + "</div></div>" +
    '<table style="width:100%;border-collapse:collapse;font-size:15px">' + fila("Entró (cuotas y derrama de agua)", $V(k.ing), "#006300") + fila("Salió (fijos, variables y pipas)", $V(k.egr), "#b3261e") +
    fila("Pagaron su cuota", m.cobranza.pagaron + " de " + m.unidades) + (m.mora && m.mora.acumulada > 0.5 ? fila("Cuotas atrasadas", $V(m.mora.acumulada) + " · " + m.mora.unidades + " deptos", "#b3261e") : "") + "</table>" +
    (k.gastos.length ? '<h2 style="font-size:16px;margin:18px 0 6px">En qué se fue</h2><table style="width:100%;border-collapse:collapse;font-size:14px">' + k.gastos.slice(0, 8).map(g => fila(g[0], $V(g[1]))).join("") + "</table>" : "") +
    (sitioV_() ? '<p style="margin:20px 0"><a href="' + sitioV_() + '/finanzas.html" style="display:inline-block;background:#3d6b5a;color:#fff;text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:700">Ver detalle y comprobantes</a></p>' : "") +
    '<p style="font-size:12px;color:#898781;margin-top:18px">Las cifras se publican siempre agregadas, sin identificar a nadie. Para dejar de recibir este correo, date de baja en la página «Recibe el reporte» del sitio.</p></div>';
}
function mesAnteriorV_() { const [y, m] = Utilities.formatDate(new Date(), ZONA_V, "yyyy-MM").split("-").map(Number); return m === 1 ? (y - 1) + "-12" : y + "-" + ("0" + (m - 1)).slice(-2); }
function bitacoraV_(mes, a, nota) { const h = hojaV_(HOJA_REP_V, ["Fecha", "Mes", "Enviado a", "Nota"]); h.getRange(h.getLastRow() + 1, 1, 1, 4).setValues([[new Date(), mes, a, nota]]); }

function envioMensual() {
  const id = mesAnteriorV_(), props = PropertiesService.getScriptProperties(), k = datosReporte_(id), s = salud_();
  const kit = (k ? "📲 Texto para el grupo de WhatsApp (cópialo tal cual):\n\n" + textoWaV_(k) + "\n\n" : "⚠️ El mes " + id + " no tiene datos: no se envió el reporte. Captúralo y corre envioAhora desde el editor.\n\n") + "🚦 Semáforo de la hoja (privado):\n" + textoSalud_(s);
  admonV_().forEach(a => MailApp.sendEmail(a, "Kit del mes · Lahia · " + (k ? k.mes : id), kit, { name: REMITENTE_V }));
  if (!k) { bitacoraV_(id, "", "Sin datos: no se envió"); return; }
  if (props.getProperty("enviado_" + id)) { bitacoraV_(id, "", "Ya se había enviado"); return; }
  if (!/^s[ií]/i.test(String(cfgV_().reporte_envio || ""))) { bitacoraV_(id, "", "Envío a residentes en pausa (Config → reporte_envio)"); return; }
  const dest = filasV_(HOJA_CORREOS_V, 4).filter(f => correoOkV_(f[2]) && !/^no/i.test(String(f[3]))).map(f => String(f[2]).trim().toLowerCase()).filter((x, i, a) => a.indexOf(x) === i);
  for (let i = 0; i < dest.length; i += 40) MailApp.sendEmail(Session.getEffectiveUser().getEmail(), "Cuentas de " + k.mes + " · Lahia", textoWaV_(k), { name: REMITENTE_V, bcc: dest.slice(i, i + 40).join(","), htmlBody: htmlReporteV_(k) });
  props.setProperty("enviado_" + id, new Date().toISOString());
  bitacoraV_(id, dest.length + " correos", "Enviado");
}
function envioAhora() { PropertiesService.getScriptProperties().deleteProperty("enviado_" + mesAnteriorV_()); envioMensual(); }
function reportePrueba() {
  const k = datosReporte_(mesAnteriorV_()); const yo = Session.getEffectiveUser().getEmail();
  if (!k) { MailApp.sendEmail(yo, "Prueba del reporte · Lahia", "El mes " + mesAnteriorV_() + " todavía no tiene datos.", { name: REMITENTE_V }); return; }
  MailApp.sendEmail(yo, "[Prueba] Cuentas de " + k.mes + " · Lahia", textoWaV_(k), { name: REMITENTE_V, htmlBody: htmlReporteV_(k) });
}

/* ------------------------------- instalación ------------------------------- */
function instalarVecinos() {
  const h = hojaV_(HOJA_CFG_V, ["Clave", "Valor", "Para qué"]);
  const tiene = k => filasV_(HOJA_CFG_V, 1).some(f => String(f[0]).trim() === k);
  [["reporte_envio", "no", "«sí» manda el reporte del día 10 a los correos registrados. En «no» solo llega el kit a la Administración."],
   ["reporte_copia", Session.getEffectiveUser().getEmail(), "Quién recibe el kit del mes, el semáforo, los PIN nuevos y los avisos de casa club (separa con comas). Pon aquí el correo de la Administración."],
   ["admin_whatsapp", DEF_V.admin_whatsapp, "WhatsApp de la Administración (10 dígitos): botón «¿No te cuadra?» de Mi cuenta."],
   ["admin_correo", DEF_V.admin_correo, "Correo de la Administración que ven los residentes."],
   ["sitio_url", DEF_V.sitio_url, "Dirección del sitio (sin / al final), para las ligas de los correos."],
   ["casa_club_renta", 1000, "Renta de la casa club (reglamento 2024)."]]
    .forEach(r => { if (!tiene(r[0])) h.getRange(h.getLastRow() + 1, 1, 1, 3).setValues([r]); });
  hojaV_(HOJA_CORREOS_V, ENC_CORREOS_V); hojaV_(HOJA_RCC_V, ENC_RCC_V); hojaV_(HOJA_REP_V, ["Fecha", "Mes", "Enviado a", "Nota"]); crearSaldosIniciales_();
  ScriptApp.getProjectTriggers().filter(t => ["envioMensual", "avisosCasa"].indexOf(t.getHandlerFunction()) >= 0).forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger("envioMensual").timeBased().onMonthDay(10).atHour(9).inTimezone(ZONA_V).create();
  ScriptApp.newTrigger("avisosCasa").timeBased().everyMinutes(30).create();
  if (typeof instalarCalentador === "function") instalarCalentador();
  Logger.log("Listo. Hoja privada del sitio: " + datosV_().getUrl() + " · envío del día 10 a las 9 h y avisos de casa club cada 30 min.");
}

/* El administrador toca «Confirmar» o «Rechazar» en el correo: la liga va firmada (no se puede inventar). */
function resolverCasaV_(p) {
  const folio = String(p.folio || "").toUpperCase(), e = p.e === "Confirmada" || p.e === "Rechazada" ? p.e : "";
  if (!e || String(p.t || "") !== firmaV_(folio + "|" + e)) return { ok: false, error: "liga" };
  const h = datosV_().getSheetByName(HOJA_RCC_V), fs = filasV_(HOJA_RCC_V, ENC_RCC_V.length), i = fs.findIndex(f => String(f[0]).toUpperCase() === folio);
  if (!h || i < 0) return { ok: false, error: "no encontrado" };
  const antes = String(fs[i][5] || "Por confirmar");
  if (/cancelada/i.test(antes)) return { ok: false, error: "cancelada", folio: folio, dia: diaV_(fs[i][2]), depto: String(fs[i][3]) };
  if (e === "Confirmada" && fs.some((f, k) => k !== i && /confirmada/i.test(String(f[5])) && diaV_(f[2]) === diaV_(fs[i][2]))) return { ok: false, error: "ocupado", folio: folio };
  h.getRange(i + 2, 6).setValue(e); olvidarCasa_();
  avisosCasa();                                  // el residente se entera al momento
  return { ok: true, folio: folio, estatus: e, antes: antes, dia: diaV_(fs[i][2]), depto: String(fs[i][3]) };
}

/* ------------------------------- Mi cuenta (PIN por departamento) -------------------------------
   Cada propietario crea su PIN una vez (con la clave de residentes). Se guarda cifrado en la pestaña
   «PIN (privado)»; nadie puede cambiar un PIN que ya existe: para reponerlo, la Administración borra
   ese renglón. Cada PIN nuevo le llega como aviso a la Administración. */
const HOJA_PIN_V = "PIN (privado)", ENC_PIN_V = ["Departamento", "PIN cifrado (no editar)", "Creado", "Correo"];
function hashPinV_(depto, pin) { return hexV_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, secretoV_() + "|" + String(depto).toUpperCase() + "|" + String(pin), Utilities.Charset.UTF_8)); }
function deptoValidoV_(depto) { const l = deptosV_(); const i = l.map(x => x.toLowerCase()).indexOf(String(depto || "").trim().toLowerCase()); return i >= 0 ? l[i] : (l.length ? "" : String(depto || "").trim()); }
function crearPinV_(d) {
  const depto = deptoValidoV_(d.depto), pin = String(d.pin || ""), correo = String(d.correo || "").trim().toLowerCase();
  if (!depto) return { ok: false, error: "departamento" };
  if (!/^\d{4,6}$/.test(pin)) return { ok: false, error: "pin" };
  if (/^(\d)\1+$/.test(pin) || "0123456789".indexOf(pin) >= 0) return { ok: false, error: "facil" };
  if (!claveOkV_(d.clave)) return { ok: false, error: "clave" };
  if (correo && !correoOkV_(correo)) return { ok: false, error: "correo" };
  const h = hojaV_(HOJA_PIN_V, ENC_PIN_V);
  if (filasV_(HOJA_PIN_V, 1).some(f => String(f[0]).toUpperCase() === depto.toUpperCase())) return { ok: false, error: "existe" };
  h.getRange(h.getLastRow() + 1, 1, 1, 4).setValues([[depto, hashPinV_(depto, pin), new Date(), correo]]);
  admonV_().forEach(a => MailApp.sendEmail(a, "Mi cuenta: depto " + depto + " creó su PIN", "El depto " + depto + " creó su PIN para ver su estado de cuenta en el sitio" + (correo ? " (correo: " + correo + ")" : "") + ".\n\nSi no fue el propietario, borra su renglón en la pestaña «" + HOJA_PIN_V + "» y el depto podrá crear uno nuevo.", { name: REMITENTE_V }));
  if (correo) MailApp.sendEmail(correo, "Tu PIN de Lahia quedó listo", "Ya puedes ver el estado de cuenta del depto " + depto + " en la página «Mi cuenta» del sitio" + (sitioV_() ? ": " + sitioV_() + "/micuenta.html" : "") + ".\n\nSi lo olvidas, pide a la Administración que lo reponga.", { name: REMITENTE_V });
  return Object.assign({ ok: true }, cuentaDeptoV_(depto));
}
function miCuentaV_(d) {
  const depto = deptoValidoV_(d.depto), c = CacheService.getScriptCache(), k = "pinmal_" + String(depto).toUpperCase(), malos = Number(c.get(k) || 0);
  if (!depto) return { ok: false, error: "departamento" };
  if (malos >= 6) return { ok: false, error: "espera" };
  const f = filasV_(HOJA_PIN_V, 2).find(x => String(x[0]).toUpperCase() === depto.toUpperCase());
  if (!f) return { ok: false, error: "sinpin" };
  if (String(f[1]) !== hashPinV_(depto, String(d.pin || ""))) { c.put(k, String(malos + 1), 3600); return { ok: false, error: "pinmal", quedan: 5 - malos }; }
  c.remove(k);
  return Object.assign({ ok: true }, cuentaDeptoV_(depto));
}
/* Estado de cuenta de UN depto, con la misma regla que la mora de Finanzas: todo lo pagado menos todas las
   cuotas transcurridas, sin reiniciar en enero; los meses futuros cuentan como adelanto. */
function cuentaDeptoV_(depto) {
  const hoyId = Utilities.formatDate(new Date(), ZONA_V, "yyyy-MM"), U = depto.toUpperCase(), busca = o => { const k = Object.keys(o || {}).find(x => x.toUpperCase() === U); return k ? Number(o[k]) || 0 : 0; };
  let meses = [], adelanto = 0, deudaAgua = 0, mesDeuda = "";
  matrizPagosV_().forEach(m => {
    if (!m.capturado && m.id !== hoyId) return;          // el mes en curso cuenta aunque aún no tenga capturas
    const pagado = busca(m.pagos), agua = busca(m.agua);
    if (m.id > hoyId) { adelanto += pagado; return; }
    if (m.capturado) { deudaAgua = busca(m.deudaAgua); mesDeuda = m.nombre + " " + m.anio; }   // la deuda de agua vigente es la del último mes capturado
    meses.push({ id: m.id, nombre: m.nombre + " " + m.anio, cuota: m.cuota, pagado: Math.round(pagado * 100) / 100, agua: Math.round(agua * 100) / 100 });
  });
  meses.sort((a, b) => a.id < b.id ? -1 : 1);
  const ini = saldosIniciales_(), k = Object.keys(ini).find(x => x.toUpperCase() === U);
  let saldo = k ? ini[k] : 0;
  const saldoInicial = Math.round(saldo * 100) / 100;
  let fuente = "", montoFuente = 0;
  meses.forEach(m => {
    const antes = saldo;
    saldo += m.pagado - m.cuota; m.saldo = Math.round(saldo * 100) / 100; m.enCurso = m.id === hoyId;
    if (m.pagado > m.cuota + 0.5 && saldo > 0.5) { fuente = m.nombre; montoFuente = m.pagado; }
    if (m.pagado < m.cuota - 0.5 && antes > 0.5) { m.cubiertoPor = fuente || "saldo a favor anterior"; m.montoCubre = montoFuente; }
    m.estado = saldo >= -0.5 ? (m.pagado >= m.cuota - 0.5 ? "pagado" : "cubierto") : saldo > -m.cuota + 0.5 ? "parcial" : "pendiente";
    m.falta = saldo < -0.5 ? Math.round(Math.min(m.cuota, -saldo) * 100) / 100 : 0;
  });
  saldo += adelanto;
  const debeManto = saldo < -0.5 ? Math.round(-saldo * 100) / 100 : 0, cfg = cfgV_();
  return { depto: depto, saldoInicial: saldoInicial, archivadoHasta: saldoInicial ? "inicio" : "", meses: meses, adelanto: Math.round(adelanto * 100) / 100,
    debeManto: debeManto, deudaAgua: Math.round(deudaAgua * 100) / 100, mesDeudaAgua: mesDeuda,
    debe: Math.round((debeManto + Math.max(0, deudaAgua)) * 100) / 100, aFavor: saldo > 0.5 ? Math.round(saldo * 100) / 100 : 0, cuota: meses.length ? meses[meses.length - 1].cuota : 2000,
    contacto: { tel: String(cfg.admin_whatsapp || "").replace(/\D/g, ""), correo: String(cfg.admin_correo || "") } };
}

/* Pestaña «Saldos iniciales» de la hoja privada: lo que cada depto debía (negativo) o tenía a favor (positivo)
   antes de la primera pestaña de meses. La usan la mora de Finanzas y «Mi cuenta». */
const HOJA_SALDOS_V = "Saldos iniciales";
function saldosIniciales_() {
  const c = CacheService.getScriptCache(), g = c.get("saldos_ini"); if (g) return JSON.parse(g);
  const out = {};
  filasV_(HOJA_SALDOS_V, 2).forEach(f => { const d = String(f[0] || "").trim(), v = num_(f[1]); if (d && v) out[d] = v; });
  try { c.put("saldos_ini", JSON.stringify(out), 300); } catch (_) {}
  return out;
}
function crearSaldosIniciales_() {
  const ss = datosV_(); if (ss.getSheetByName(HOJA_SALDOS_V)) return;
  const h = ss.insertSheet(HOJA_SALDOS_V), ds = deptosV_();
  h.getRange(1, 1, 1, 3).setValues([["Depto", "Saldo al iniciar 2026 (negativo = debía · positivo = a favor)", "Nota (privada)"]]).setFontWeight("bold"); h.setFrozenRows(1);
  if (ds.length) { h.getRange(2, 1, ds.length, 2).setValues(ds.map(d => [d, 0])); h.getRange(2, 2, ds.length, 1).setNumberFormat("$#,##0.00;-$#,##0.00"); }
}

/* Pagos de todos los deptos por mes (lo único que necesita «Mi cuenta»). Se guarda 2 minutos: así varias
   consultas seguidas no vuelven a leer las 12 pestañas. Un cambio en la hoja se ve a más tardar 2 min después. */
function matrizPagosV_(fresca) {
  const c = CacheService.getScriptCache(), g = fresca ? null : c.get("matriz_pagos"); if (g) return JSON.parse(g);
  const out = [];
  hojasMesL_(hoja_()).forEach(h => {
    const m = leerMes_(h), pagos = {}, agua = {}, deuda = {};
    m.pagosPorUnidad.forEach(p => { pagos[String(p[0]).trim()] = Number(p[1]) || 0; });
    (m.aguaPorUnidad || []).forEach(p => { agua[String(p[0]).trim()] = Number(p[1]) || 0; deuda[String(p[0]).trim()] = Number(p[2]) || 0; });
    out.push({ id: m.id, nombre: m.nombre, anio: m.anio, cuota: m.cuota, capturado: m.capturado, pagos: pagos, agua: agua, deudaAgua: deuda });
  });
  try { c.put("matriz_pagos", JSON.stringify(out), fresca ? 1500 : 120); } catch (_) {}
  return out;
}
/* Lo llama el calentador (cada 10 min): «Mi cuenta», la lista de deptos y el aviso de casa club ya no esperan a la hoja. */
function calentarVecinos_() {
  matrizPagosV_(true);
  try { CacheService.getScriptCache().remove("deptos_v"); deptosV_(); } catch (_) {}
}

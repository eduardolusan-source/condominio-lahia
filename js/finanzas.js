/* Sección financiera — Condominio Lahia.
   La pantalla la dibuja js/tablero.js (motor común con La Valetta y Las
   Misiones); este archivo pone la clave de acceso, consigue los datos y los
   traduce al formato del tablero. */
(function () {
  "use strict";

  /* ---------- Origen de datos en vivo ----------
     El Apps Script de apps-script/Code.gs lee la hoja de captura mensual de la
     administración y entrega las cifras AGREGADAS de cada mes. Pasos para
     publicarlo en apps-script/INSTALAR.md; pegar aquí la URL que termina en
     /exec. Con ella, un mes aparece en el sitio en cuanto su pestaña tiene
     datos: no hay que tocar este repositorio cada mes.
     Si se deja vacía o el script no responde, se muestra la copia de js/data.js.
     REGLA: lo que entrega el script lo puede leer cualquiera con la URL; la
     clave del sitio no lo protege. Por eso solo viajan agregados. */
  const API_URL = "";

  /* ---------- Portón de acceso ---------- */
  const KEY_HASH = "bcac371b54f59945a14aa49e2e408e5d6e4dbc59387f5d8cfc6b015d40d5bb02";
  const gate = document.getElementById("gate");
  const content = document.getElementById("content");

  async function sha256(text) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
  }

  document.getElementById("gateForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    const err = document.getElementById("gateError");
    if (!window.crypto || !crypto.subtle) { err.textContent = "Abre el sitio desde su dirección https para poder validar la clave."; return; }
    const val = document.getElementById("gateKey").value.trim();
    if ((await sha256(val)) === KEY_HASH) abrir();
    else {
      err.textContent = "Clave incorrecta. Solicítala a la administración.";
      document.getElementById("gateKey").value = "";
      document.getElementById("gateKey").focus();
    }
  });

  /* ---------- Del formato de la hoja al formato del tablero ---------- */
  const NOMBRES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const n = v => (typeof v === "number" && isFinite(v) ? v : Number(v) || 0);
  const items = lista => (lista || []).map(it => ({ concepto: it[0] || "", detalle: it[1] || "", monto: n(it[2]), liga: it[3] || "" }));
  const fmt = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 2 });

  function mes(o, vivo) {
    const num = parseInt(o.id.slice(5), 10);
    const nombre = o.nombre || NOMBRES[num - 1];
    const ing = o.ingresos || {}, egr = o.egresos || {}, det = o.detalle || {};
    const mr = o.mora || (o.morosidad ? { acumulada: o.morosidad.acumuladoManto, unidades: o.morosidad.unidadesManto, adelantos: 0, unidadesAdelanto: 0 } : null);
    const deuda = o.deudaAgua || (o.morosidad ? { monto: o.morosidad.aguaMes, unidades: o.morosidad.unidadesAgua } : null);
    const indicadores = [];
    if (o.derrama > 0) indicadores.push(["Derrama de agua por unidad", fmt.format(o.derrama)]);
    return {
      id: o.id, anio: parseInt(o.id.slice(0, 4), 10), nombre: nombre, corto: o.corto || nombre.slice(0, 3), vivo: !!vivo,
      saldoIni: n(o.saldoIni), saldoFin: n(o.saldoFin),
      ingresos: [{ nombre: "Cuotas de mantenimiento", monto: n(ing.manto) }, { nombre: "Derrama de agua", monto: n(ing.agua) }],
      grupos: [
        { clave: "fijos", nombre: "Gastos fijos", monto: n(egr.fijos), cuota: true, items: items(det.fijos) },
        { clave: "variables", nombre: "Gastos variables", monto: n(egr.variables), cuota: true, items: items(det.variables) },
        { clave: "agua", nombre: "Pipas de agua", monto: n(egr.agua), cuota: false, items: items(det.agua) }
      ],
      cobranza: { pagaron: n((o.cobranza || {}).pagaron), pct: n((o.cobranza || {}).pct) },
      mora: mr ? { acumulada: n(mr.acumulada), unidades: n(mr.unidades), adelantos: n(mr.adelantos), unidadesAdelanto: n(mr.unidadesAdelanto) } : null,
      agua: { cobrado: n(ing.agua), pagado: n(egr.agua) },
      deudaAgua: deuda ? { monto: n(deuda.monto), unidades: n(deuda.unidades) } : null,
      indicadores: indicadores
    };
  }

  function proyectos(lista) {
    return (lista || []).map(p => ({ nombre: p.nombre, estado: p.estado, monto: p.presupuesto || null, montoEtiqueta: p.presupuesto ? "presupuesto" : "", avance: p.avance || "", liga: p.liga || "" }));
  }

  function rangoTexto(meses) {
    if (!meses.length) return "";
    const a = meses[0], b = meses[meses.length - 1];
    return (a.nombre + " a " + b.nombre.toLowerCase() + " de " + b.anio).replace(/^(\w)/, c => c.toUpperCase());
  }

  function modeloLocal() {
    const meses = LAHIA.meses.map(m => mes(m, false));
    return { unidades: LAHIA.unidades, cuota: LAHIA.cuota, meses: meses, proyectos: proyectos(LAHIA.proyectos), fuente: { vivo: false, texto: rangoTexto(meses) } };
  }

  async function modeloVivo() {
    if (!API_URL) return null;
    const r = await fetch(API_URL + (API_URL.indexOf("?") >= 0 ? "&" : "?") + "t=" + Date.now(), { cache: "no-store", redirect: "follow" });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const j = await r.json();
    if (!j || !j.ok) throw new Error((j && j.error) || "respuesta sin datos");
    const meses = (j.meses || []).filter(m => /^\d{4}-\d{2}$/.test(String(m.id || ""))).map(m => mes(m, true)).sort((a, b) => a.id.localeCompare(b.id));
    if (!meses.length) throw new Error("el script no trae meses capturados");
    if (j.avisos && j.avisos.length) console.info("[Lahia] Avisos de la hoja:\n· " + j.avisos.join("\n· "));
    return {
      unidades: n(j.unidades) || LAHIA.unidades, cuota: n(j.cuota) || LAHIA.cuota, meses: meses,
      proyectos: j.proyectos && j.proyectos.length ? proyectos(j.proyectos) : proyectos(LAHIA.proyectos),
      fuente: { vivo: true, generado: j.generado, texto: rangoTexto(meses) }
    };
  }

  /* ---------- Tablero ---------- */
  const OPCIONES = {
    clave: "lahia",
    sexto: "agua",
    rubros: [
      { nombre: "Vigilancia", re: /vigilancia|servicios integrados/i },
      { nombre: "Limpieza", re: /limpieza|limpio|escoba|bolsa|mop|plumero/i },
      { nombre: "Administración y plataforma", re: /administraci|edificare|condovive|plataforma|papeler|office|bit[aá]cora|copias/i },
      { nombre: "Luz de áreas comunes", re: /\bluz\b|cfe|l[aá]mpara|foco|reflector|el[eé]ctric/i },
      { nombre: "Elevador", re: /elevador|schindler/i },
      { nombre: "Alberca", re: /alberca|baleros/i },
      { nombre: "Jardinería y basura", re: /jardin|poda|podadora|nikte|basura|recolecci|municipio/i }
    ],
    agua: {
      titulo: "El agua (pipas)",
      frase: "del costo de las pipas se cubrió con la derrama",
      cobro: "con la derrama de agua",
      gasto: "en pipas de agua",
      tile: "derrama vs. pipas",
      explica: "El agua llega en pipas y se paga con una derrama mensual según el consumo de cada depto, aparte de la cuota de mantenimiento.",
      nota: "Lo que la derrama no alcanza a cubrir lo pone la cuota de mantenimiento. En agosto de 2026 la administración no registró pagos de pipas."
    },
    textos: {
      titulo: "Las cuentas de Lahia",
      notaCuota: "sin contar el agua, que se paga aparte con la derrama",
      notaSaldo: "Lahia arrancó 2026 con saldo positivo y pasó varios meses en números rojos; en agosto volvió a terreno positivo.",
      notaProyectos: "Trabajos en evaluación o en curso, según la hoja de la administración.",
      privacidad: "Por disposición de la Ley de protección de datos personales, la morosidad se informa siempre agregada: montos y número de unidades, sin identificar ningún departamento.",
      acerca: "<h3>De dónde salen los datos</h3><p>De la hoja de captura mensual de la administración: una pestaña por mes con cobros, gastos fijos, variables y de agua, cada uno con su proveedor y, cuando existe, la liga al comprobante.</p>" +
        "<p>Cuando aparece <b>En vivo</b>, la página lee la hoja cada vez que se abre (puede tardar hasta cinco minutos en reflejar un cambio). Cuando dice <b>Copia guardada</b>, muestra la última copia publicada en el sitio.</p>" +
        "<p>Un mes aparece en cuanto su pestaña tiene cobros o gastos. Si una pestaña es una copia del mes anterior sin capturar, no se publica.</p>"
    }
  };

  let tablero = null;
  function abrir() {
    gate.hidden = true;
    content.hidden = false;
    try { sessionStorage.setItem("lahiaFin", "1"); } catch (_) { /* sin almacenamiento */ }
    if (tablero) return;
    tablero = Tablero.montar(document.getElementById("tablero"), OPCIONES);
    tablero.actualizar(modeloLocal());
    modeloVivo().then(m => { if (m) tablero.actualizar(m); })
      .catch(e => console.warn("[Lahia] El script de la hoja no respondió (" + e.message + "). Se muestra la copia de js/data.js."));
  }

  let guardado = null;
  try { guardado = sessionStorage.getItem("lahiaFin"); } catch (_) { /* sin almacenamiento */ }
  if (guardado === "1") abrir();
})();

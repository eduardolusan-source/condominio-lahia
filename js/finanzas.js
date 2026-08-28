/* Sección financiera — Condominio Lahia */
(function () {
  "use strict";

  /* ---------- Portón de acceso ---------- */
  const KEY_HASH = "bcac371b54f59945a14aa49e2e408e5d6e4dbc59387f5d8cfc6b015d40d5bb02";
  const gate = document.getElementById("gate");
  const content = document.getElementById("content");

  async function sha256(text) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
  }

  function unlock() {
    gate.hidden = true;
    content.hidden = false;
    sessionStorage.setItem("lahiaFin", "1");
    render();
  }

  document.getElementById("gateForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    const err = document.getElementById("gateError");
    if (!window.crypto || !crypto.subtle) {
      err.textContent = "Abre el sitio desde su dirección https para poder validar la clave.";
      return;
    }
    const val = document.getElementById("gateKey").value.trim();
    if ((await sha256(val)) === KEY_HASH) { unlock(); }
    else {
      err.textContent = "Clave incorrecta. Solicítala a la administración.";
      document.getElementById("gateKey").value = "";
      document.getElementById("gateKey").focus();
    }
  });

  /* ---------- Utilidades ---------- */
  const M = LAHIA.meses;
  const mxn = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
  const mxn2 = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 });
  const fmt = v => mxn.format(v);
  const fmt2 = v => mxn2.format(v);
  const kfmt = v => "$" + Math.round(v / 1000) + " mil";
  const ingresosDe = m => m.ingresos.manto + m.ingresos.agua;
  const egresosDe = m => m.egresos.fijos + m.egresos.variables + m.egresos.agua;
  const resultadoDe = m => ingresosDe(m) - egresosDe(m);
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

  const tip = document.getElementById("vizTip");
  function showTip(html, x, y) {
    tip.innerHTML = html;
    tip.style.display = "block";
    const w = tip.offsetWidth, sw = window.innerWidth;
    tip.style.left = Math.min(x + 14, sw - w - 10) + "px";
    tip.style.top = (y + 16) + "px";
  }
  function hideTip() { tip.style.display = "none"; }

  /* ---------- Datos del mes ---------- */
  let mesIdx = M.length - 1;

  function renderChips() {
    const box = document.getElementById("chips");
    box.innerHTML = "";
    M.forEach((m, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = m.nombre;
      b.className = i === mesIdx ? "on" : "";
      b.addEventListener("click", () => { mesIdx = i; renderMes(); renderChips(); });
      box.appendChild(b);
    });
  }

  function deltaTxt(actual, previo, menosEsMejor) {
    if (previo == null) return "";
    const d = actual - previo;
    const mejora = menosEsMejor ? d <= 0 : d >= 0;
    const cls = mejora ? "pos" : "neg";
    const flecha = d >= 0 ? "▲" : "▼";
    return '<div class="d"><span class="' + cls + '" style="font-weight:600">' + flecha + " " + fmt(Math.abs(d)) + "</span> vs. mes anterior</div>";
  }

  function renderMes() {
    const m = M[mesIdx];
    const prev = mesIdx > 0 ? M[mesIdx - 1] : null;
    const ing = ingresosDe(m), egr = egresosDe(m), res = resultadoDe(m);

    document.getElementById("statCards").innerHTML =
      '<div class="stat"><div class="k">Ingresos · ' + m.nombre + '</div><div class="v">' + fmt(ing) + "</div>" +
      deltaTxt(ing, prev && ingresosDe(prev)) + "</div>" +
      '<div class="stat"><div class="k">Egresos · ' + m.nombre + '</div><div class="v">' + fmt(egr) + "</div>" +
      deltaTxt(egr, prev && egresosDe(prev), true) + "</div>" +
      '<div class="stat"><div class="k">Resultado del mes</div><div class="v ' + (res >= 0 ? "pos" : "neg") + '">' + fmt2(res) + '</div><div class="d">ingresos menos egresos</div></div>' +
      '<div class="stat"><div class="k">Saldo al cierre</div><div class="v ' + (m.saldoFin >= 0 ? "pos" : "neg") + '">' + fmt2(m.saldoFin) + '</div><div class="d">inició el mes en ' + fmt2(m.saldoIni) + "</div></div>";

    document.getElementById("tIngresos").innerHTML =
      "<thead><tr><th>Concepto</th><th class='num'>Monto</th></tr></thead><tbody>" +
      "<tr><td>Cuotas de mantenimiento</td><td class='num'>" + fmt2(m.ingresos.manto) + "</td></tr>" +
      "<tr><td>Derrama de agua</td><td class='num'>" + fmt2(m.ingresos.agua) + "</td></tr>" +
      "<tr class='total'><td>Total de ingresos</td><td class='num'>" + fmt2(ing) + "</td></tr></tbody>";

    document.getElementById("tIndicadores").innerHTML =
      "<tbody>" +
      "<tr><td>Unidades que pagaron mantenimiento</td><td class='num'>" + m.cobranza.pagaron + " de " + LAHIA.unidades + "</td></tr>" +
      "<tr><td>Cobranza de mantenimiento</td><td class='num'>" + m.cobranza.pct + "%</td></tr>" +
      "<tr><td>Derrama de agua por unidad</td><td class='num'>" + fmt(m.derrama) + "</td></tr>" +
      "<tr><td>Resultado del agua (cobrado − pagado)</td><td class='num'>" + fmt2(m.resultadoAgua) + "</td></tr>" +
      "<tr><td>Costo de pipas del mes</td><td class='num'>" + fmt2(m.egresos.agua) + "</td></tr>" +
      "</tbody>";

    const secciones = [
      ["Gastos fijos (ordinarios)", m.detalle.fijos, m.egresos.fijos],
      ["Gastos variables", m.detalle.variables, m.egresos.variables],
      ["Gastos de agua (pipas y bombeo)", m.detalle.agua, m.egresos.agua]
    ];
    let rows = "<thead><tr><th>Proveedor</th><th>Concepto</th><th class='num'>Monto</th></tr></thead><tbody>";
    secciones.forEach(([titulo, items, subtotal]) => {
      rows += "<tr><td colspan='3' style='font-weight:700; color:var(--ink); padding-top:0.9rem'>" + titulo + "</td></tr>";
      if (!items.length) {
        rows += "<tr><td colspan='3' style='color:var(--muted); font-style:italic'>Desglose por proveedor pendiente de capturar.</td></tr>";
      }
      items.forEach(([prov, desc, monto]) => {
        rows += "<tr><td>" + esc(prov) + "</td><td>" + esc(desc) + "</td><td class='num'>" + fmt2(monto) + "</td></tr>";
      });
      rows += "<tr class='total'><td colspan='2'>Subtotal</td><td class='num'>" + fmt2(subtotal) + "</td></tr>";
    });
    rows += "<tr class='total'><td colspan='2' style='font-size:1.02em'>TOTAL DE EGRESOS</td><td class='num' style='font-size:1.02em'>" + fmt2(egresosDe(m)) + "</td></tr></tbody>";
    document.getElementById("tEgresos").innerHTML = rows;
    document.getElementById("egresosSub").textContent = m.nombre + " 2026";

    const mo = m.morosidad;
    document.getElementById("morosidadCards").innerHTML =
      '<div class="stat"><div class="k">Unidades con adeudo de mantenimiento</div><div class="v">' + mo.unidadesManto + ' <span style="font-size:0.9rem; font-weight:400; color:var(--muted)">de ' + LAHIA.unidades + '</span></div></div>' +
      '<div class="stat"><div class="k">Adeudo acumulado de mantenimiento (2026)</div><div class="v">' + fmt(mo.acumuladoManto) + "</div></div>" +
      '<div class="stat"><div class="k">Adeudos de agua del mes</div><div class="v">' + fmt(mo.aguaMes) + '</div><div class="d">' + mo.unidadesAgua + " unidad(es)</div></div>";
  }

  /* ---------- Gráfica: barras ingresos vs egresos ---------- */
  function chartBars() {
    const W = 760, H = 300, L = 52, R = 8, T = 14, B = 30;
    const pw = W - L - R, ph = H - T - B;
    const maxV = 120000;
    const y = v => T + ph - (v / maxV) * ph;
    const s1 = "var(--series-1)", s2 = "var(--series-2)";
    let g = "";
    for (let t = 0; t <= maxV; t += 30000) {
      g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(t) + '" y2="' + y(t) + '" stroke="var(--grid)" stroke-width="1"/>' +
        '<text x="' + (L - 8) + '" y="' + (y(t) + 4) + '" text-anchor="end" font-size="11" fill="var(--muted)">' + (t === 0 ? "0" : kfmt(t)) + "</text>";
    }
    const gw = pw / M.length, bw = Math.min(24, gw / 2 - 6);
    let bars = "", hits = "";
    M.forEach((m, i) => {
      const cx = L + gw * i + gw / 2;
      const ing = ingresosDe(m), egr = egresosDe(m);
      const x1 = cx - bw - 1, x2 = cx + 1;
      const r = 4;
      const bar = (x, v, color) => {
        const yy = y(v), hh = T + ph - yy;
        return '<path d="M' + x + " " + (yy + r) + " q0 -" + r + " " + r + " -" + r + " h" + (bw - 2 * r) + " q" + r + " 0 " + r + " " + r + " v" + (hh - r) + " h-" + bw + ' z" fill="' + color + '"/>';
      };
      bars += bar(x1, ing, s1) + bar(x2, egr, s2);
      bars += '<text x="' + cx + '" y="' + (H - 8) + '" text-anchor="middle" font-size="11.5" fill="var(--ink-2)">' + m.corto + "</text>";
      hits += '<rect data-i="' + i + '" x="' + (L + gw * i) + '" y="' + T + '" width="' + gw + '" height="' + ph + '" fill="transparent"/>';
    });
    const svg = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Ingresos y egresos por mes">' + g +
      '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(0) + '" y2="' + y(0) + '" stroke="var(--baseline)" stroke-width="1.5"/>' +
      bars + hits + "</svg>";
    const box = document.getElementById("chartBars");
    box.innerHTML = svg;
    box.querySelectorAll("rect[data-i]").forEach(rect => {
      rect.addEventListener("mousemove", e => {
        const m = M[+rect.dataset.i];
        showTip("<b>" + m.nombre + " 2026</b><br>Ingresos: <b>" + fmt(ingresosDe(m)) + "</b><br>Egresos: <b>" + fmt(egresosDe(m)) + "</b><br>Resultado: <b>" + fmt(resultadoDe(m)) + "</b>", e.clientX, e.clientY);
      });
      rect.addEventListener("mouseleave", hideTip);
    });
  }

  /* ---------- Gráfica: línea de saldo ---------- */
  function chartLine() {
    const W = 760, H = 260, L = 56, R = 60, T = 14, B = 30;
    const pw = W - L - R, ph = H - T - B;
    const minV = -40000, maxV = 10000;
    const y = v => T + (maxV - v) / (maxV - minV) * ph;
    const x = i => L + (pw / (M.length - 1)) * i;
    let g = "";
    for (let t = minV; t <= maxV; t += 10000) {
      const strong = t === 0;
      g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(t) + '" y2="' + y(t) + '" stroke="' + (strong ? "var(--baseline)" : "var(--grid)") + '" stroke-width="' + (strong ? 1.5 : 1) + '"' + (strong ? "" : "") + "/>" +
        '<text x="' + (L - 8) + '" y="' + (y(t) + 4) + '" text-anchor="end" font-size="11" fill="var(--muted)">' + (t === 0 ? "0" : kfmt(t)) + "</text>";
    }
    let path = "", dots = "", hits = "", labels = "";
    M.forEach((m, i) => {
      const px = x(i), py = y(m.saldoFin);
      path += (i === 0 ? "M" : "L") + px + " " + py + " ";
      dots += '<circle cx="' + px + '" cy="' + py + '" r="4" fill="var(--series-1)" stroke="var(--surface)" stroke-width="2"/>';
      hits += '<circle data-i="' + i + '" cx="' + px + '" cy="' + py + '" r="14" fill="transparent"/>';
      labels += '<text x="' + px + '" y="' + (H - 8) + '" text-anchor="middle" font-size="11.5" fill="var(--ink-2)">' + m.corto + "</text>";
    });
    const last = M[M.length - 1];
    const lastLbl = '<text x="' + (x(M.length - 1) + 10) + '" y="' + (y(last.saldoFin) + 4) + '" font-size="11.5" font-weight="700" fill="var(--ink)">' + fmt(last.saldoFin) + "</text>";
    const svg = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Saldo al cierre de cada mes">' + g +
      '<path d="' + path + '" fill="none" stroke="var(--series-1)" stroke-width="2" stroke-linejoin="round"/>' +
      dots + lastLbl + labels + hits + "</svg>";
    const box = document.getElementById("chartLine");
    box.innerHTML = svg;
    box.querySelectorAll("circle[data-i]").forEach(c => {
      c.addEventListener("mousemove", e => {
        const m = M[+c.dataset.i];
        showTip("<b>" + m.nombre + " 2026</b><br>Saldo al cierre: <b>" + fmt2(m.saldoFin) + "</b>", e.clientX, e.clientY);
      });
      c.addEventListener("mouseleave", hideTip);
    });
  }

  /* ---------- Métricas fijas ---------- */
  const prom = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
  const fijosProm = prom(M.map(m => m.egresos.fijos));
  const varProm = prom(M.map(m => m.egresos.variables));
  const aguaProm = prom(M.map(m => m.egresos.agua));
  const derramaProm = prom(M.map(m => m.ingresos.agua));
  const cobranzaProm = prom(M.map(m => m.cobranza.pct));
  const opProm = fijosProm + varProm;

  function renderFijas() {
    const porUnidad = opProm / LAHIA.unidades;
    document.getElementById("fixedCards").innerHTML =
      '<div class="stat"><div class="k">Unidades</div><div class="v">' + LAHIA.unidades + '</div><div class="d">' + LAHIA.composicion + "</div></div>" +
      '<div class="stat"><div class="k">Cuota de mantenimiento</div><div class="v">' + fmt(LAHIA.cuota) + '</div><div class="d">mensual por unidad · ingreso teórico ' + fmt(LAHIA.cuota * LAHIA.unidades) + "</div></div>" +
      '<div class="stat"><div class="k">Gasto operativo promedio</div><div class="v">' + fmt(opProm) + '</div><div class="d">fijos ' + fmt(fijosProm) + " + variables " + fmt(varProm) + "</div></div>" +
      '<div class="stat"><div class="k">Costo de tu cuota</div><div class="v">' + fmt(porUnidad) + '</div><div class="d">de cada cuota de $2,000, esto cuesta operar el condominio</div></div>' +
      '<div class="stat"><div class="k">Cobranza promedio 2026</div><div class="v">' + cobranzaProm.toFixed(1) + '%</div><div class="d">de las cuotas de mantenimiento</div></div>' +
      '<div class="stat"><div class="k">Agua: costo promedio</div><div class="v">' + fmt(aguaProm) + '</div><div class="d">≈ 29 pipas al mes</div></div>';
  }

  function chartFijos() {
    const items = [
      ["Vigilancia", 30000],
      ["Limpieza de áreas comunes", 14286],
      ["Administración", 12000],
      ["Luz de áreas comunes*", 5482],
      ["Elevador (Schindler)", 4233],
      ["Alberca (servicio semanal)", 2865],
      ["Condovive (plataforma)", 725],
      ["Telmex (caseta y casa club)", 501],
      ["Telcel (recarga)", 200]
    ];
    const total = items.reduce((a, b) => a + b[1], 0);
    const W = 560, rowH = 30, T = 6, L = 210, R = 78;
    const H = T + items.length * rowH + 26;
    const pw = W - L - R;
    const maxV = 30000;
    let rows = "";
    items.forEach(([label, v], i) => {
      const yy = T + i * rowH + 6;
      const bw2 = Math.max(2, (v / maxV) * pw);
      rows += '<text x="' + (L - 10) + '" y="' + (yy + 12) + '" text-anchor="end" font-size="11.5" fill="var(--ink-2)">' + label + "</text>" +
        '<rect data-i="' + i + '" x="' + L + '" y="' + yy + '" width="' + bw2 + '" height="16" rx="4" fill="var(--series-1)"/>' +
        '<text x="' + (L + bw2 + 8) + '" y="' + (yy + 12.5) + '" font-size="11.5" font-weight="600" fill="var(--ink)">' + fmt(v) + "</text>";
    });
    const note = '<text x="' + L + '" y="' + (H - 6) + '" font-size="10.5" fill="var(--muted)">*recibo bimestral de CFE, promedio mensual</text>';
    document.getElementById("chartFijos").innerHTML =
      '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Composición del gasto fijo mensual">' + rows + note + "</svg>";
    document.getElementById("chartFijos").querySelectorAll("rect[data-i]").forEach(r => {
      r.addEventListener("mousemove", e => {
        const it = items[+r.dataset.i];
        showTip("<b>" + it[0] + "</b><br>" + fmt(it[1]) + " · " + Math.round(it[1] / total * 100) + "% del gasto fijo", e.clientX, e.clientY);
      });
      r.addEventListener("mouseleave", hideTip);
    });
  }

  function renderAgua() {
    const cobertura = derramaProm / aguaProm * 100;
    const resAcum = M.reduce((a, m) => a + m.resultadoAgua, 0);
    document.getElementById("tAgua").innerHTML =
      "<tbody>" +
      "<tr><td>Costo promedio mensual de pipas</td><td class='num'>" + fmt(aguaProm) + "</td></tr>" +
      "<tr><td>Pipas surtidas (ene–jul)</td><td class='num'>201 (~29 al mes)</td></tr>" +
      "<tr><td>Costo promedio por pipa</td><td class='num'>" + fmt(202800 / 201) + "</td></tr>" +
      "<tr><td>Derrama promedio por unidad</td><td class='num'>" + fmt(prom(M.map(m => m.derrama))) + "</td></tr>" +
      "<tr><td>Cobertura de la derrama vs. costo</td><td class='num'>" + cobertura.toFixed(0) + "%</td></tr>" +
      "<tr><td>Resultado del agua acumulado 2026</td><td class='num'>" + fmt2(resAcum) + "</td></tr>" +
      "</tbody>";
  }

  function renderProyectos() {
    let rows = "<thead><tr><th>Proyecto</th><th>Estado</th><th class='num'>Presupuesto</th></tr></thead><tbody>";
    LAHIA.proyectos.forEach(p => {
      rows += "<tr><td>" + esc(p.nombre) + "</td><td>" + esc(p.estado) + "</td><td class='num'>" + (p.presupuesto ? fmt(p.presupuesto) : "por definir") + "</td></tr>";
    });
    document.getElementById("tProyectos").innerHTML = rows + "</tbody>";
  }

  /* ---------- Origen de datos en vivo (opcional) ----------
     Pega abajo la URL del CSV publicado de la hoja
     "Lahia · Resumen público para el sitio"
     (en la hoja: Archivo → Compartir → Publicar en la web → CSV).

     Con la URL puesta, el sitio lee los meses de la hoja en cada carga y ya no
     hace falta tocar este repositorio para publicar un mes nuevo. Si se deja
     vacía, o si la descarga falla, se usan los datos de js/data.js.

     REGLA: esa hoja NUNCA debe llevar datos por departamento. Lo que se
     publica es legible por cualquiera que abra la URL — la clave de acceso del
     sitio no protege nada de esto. Solo agregados. */
  const CSV_MESES_URL = "";

  /* Encabezados de la hoja → campos internos. No renombrar las columnas. */
  const COLS = {
    mesid: "id", nombre: "nombre", corto: "corto",
    saldoinicial: "saldoIni", saldofinal: "saldoFin",
    mantenimientocobrado: "manto", aguacobrada: "agua",
    gastosfijos: "fijos", gastosvariables: "variables", gastosdeagua: "gAgua",
    unidadesquepagaron: "pagaron", "%cobranza": "pct",
    derramaporunidad: "derrama", resultadoagua: "resultadoAgua",
    morososmanto: "morososManto", acumuladomorosidadmanto: "acumManto",
    morososagua: "morososAgua", adeudoaguadelmes: "adeudoAgua"
  };

  /* NFD separa el acento de la letra; el filtro siguiente lo descarta junto
     con espacios y signos, así "% cobranza" y "Saldo inicial" quedan como
     "%cobranza" y "saldoinicial". */
  const norm = s => String(s).toLowerCase().normalize("NFD").replace(/[^a-z0-9%]+/g, "");
  const num = v => {
    const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
    return isFinite(n) ? n : 0;
  };

  function parseCSV(texto) {
    const filas = [];
    let campo = "", fila = [], comillas = false;
    for (let i = 0; i < texto.length; i++) {
      const c = texto[i];
      if (comillas) {
        if (c === '"') {
          if (texto[i + 1] === '"') { campo += '"'; i++; } else comillas = false;
        } else campo += c;
      } else if (c === '"') comillas = true;
      else if (c === ",") { fila.push(campo); campo = ""; }
      else if (c === "\n") { fila.push(campo); filas.push(fila); fila = []; campo = ""; }
      else if (c !== "\r") campo += c;
    }
    if (campo !== "" || fila.length) { fila.push(campo); filas.push(fila); }
    return filas;
  }

  async function cargarHoja() {
    if (!CSV_MESES_URL) return false;
    const r = await fetch(CSV_MESES_URL, { cache: "no-store" });
    if (!r.ok) throw new Error("HTTP " + r.status);

    const filas = parseCSV(await r.text())
      .filter(f => f.some(c => String(c).trim() !== ""));
    if (filas.length < 2) throw new Error("la hoja no trae filas de datos");

    const cab = filas[0].map(h => COLS[norm(h)] || null);
    if (cab.indexOf("id") === -1) throw new Error("falta la columna 'Mes ID'");

    const nuevos = filas.slice(1)
      .map(f => {
        const o = {};
        cab.forEach((k, i) => { if (k) o[k] = f[i]; });
        return o;
      })
      .filter(o => /^\d{4}-\d{2}$/.test(String(o.id).trim()));
    if (!nuevos.length) throw new Error("ninguna fila con 'Mes ID' válido");

    /* El desglose por proveedor no viaja en la hoja: se conserva el que ya
       exista en data.js para ese mes, y los meses nuevos entran sin él. */
    const previos = {};
    LAHIA.meses.forEach(m => { previos[m.id] = m; });

    const armados = nuevos.map(o => {
      const id = String(o.id).trim();
      const antes = previos[id];
      return {
        id: id,
        nombre: String(o.nombre || "").trim() || (antes && antes.nombre) || id,
        corto: String(o.corto || "").trim() || (antes && antes.corto) || id.slice(5),
        saldoIni: num(o.saldoIni), saldoFin: num(o.saldoFin),
        ingresos: { manto: num(o.manto), agua: num(o.agua) },
        egresos: { fijos: num(o.fijos), variables: num(o.variables), agua: num(o.gAgua) },
        cobranza: { pagaron: num(o.pagaron), pct: num(o.pct) },
        derrama: num(o.derrama), resultadoAgua: num(o.resultadoAgua),
        morosidad: {
          unidadesManto: num(o.morososManto), acumuladoManto: num(o.acumManto),
          unidadesAgua: num(o.morososAgua), aguaMes: num(o.adeudoAgua)
        },
        detalle: (antes && antes.detalle) || { fijos: [], variables: [], agua: [] }
      };
    }).sort((a, b) => a.id.localeCompare(b.id));

    /* Se muta el arreglo en su lugar para no romper la referencia M. */
    LAHIA.meses.length = 0;
    armados.forEach(m => LAHIA.meses.push(m));
    return true;
  }

  /* ---------- Render general ---------- */
  let rendered = false;
  function render() {
    if (rendered) return;
    rendered = true;
    renderChips();
    renderMes();
    chartBars();
    chartLine();
    renderFijas();
    chartFijos();
    renderAgua();
    renderProyectos();
  }

  /* Se intenta la hoja publicada; si responde, se repinta con esos datos. */
  cargarHoja().then(ok => {
    if (!ok) return;
    mesIdx = M.length - 1;
    if (rendered) { rendered = false; render(); }
  }).catch(e => {
    console.warn("[Lahia] No se pudo leer la hoja publicada (" + e.message +
                 "). Se muestran los datos de js/data.js.");
  });

  if (sessionStorage.getItem("lahiaFin") === "1") { unlock(); }
})();

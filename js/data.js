/* Datos financieros — Condominio Lahia, enero–julio 2026.
   Fuente: Excel de captura mensual de cuentas.
   La morosidad se publica SIEMPRE agregada (sin identificar unidades) por
   requisito de la Ley de protección de datos personales. */
const LAHIA = {
  unidades: 40,
  composicion: "34 departamentos (A-01 a A-34) y 6 penthouses (PH-35 a PH-40)",
  cuota: 2000,
  meses: [
    {
      id: "2026-01", nombre: "Enero", corto: "Ene",
      saldoIni: 5565.12, saldoFin: -25084.64,
      ingresos: { manto: 80000, agua: 0 },
      egresos: { fijos: 73012.84, variables: 5636.92, agua: 32000 },
      cobranza: { pagaron: 40, pct: 100 }, derrama: 800, resultadoAgua: -32000,
      morosidad: { unidadesManto: 0, acumuladoManto: 0, unidadesAgua: 0, aguaMes: 0 },
      detalle: {
        fijos: [
          ["Servicios Integrados", "Vigilancia", 30000],
          ["Servicio de Limpieza", "Áreas comunes", 14000],
          ["CFE", "Luz de áreas comunes", 7500],
          ["Edificare Arquitectura", "Administración", 12000],
          ["Schindler, S.A. de C.V.", "Manto. elevador", 4232.84],
          ["Mantenimiento Alberca", "Servicio semanal", 3856],
          ["Plataforma", "Condovive", 725],
          ["Telmex", "Caseta y casa club", 499],
          ["Telcel", "Recarga", 200]
        ],
        variables: [
          ["Municipio", "Recolección de basura", 600],
          ["Ferretería Milenio III", "Artículos varios", 230],
          ["Universo de Limpieza", "Artículos de limpieza", 797.82],
          ["Costco", "3 despensas para personal del municipio (recolección)", 957],
          ["Amazon", "Lámparas", 539.10],
          ["Amazon", "Tijeras para podar", 625],
          ["Amazon", "Plumero", 269],
          ["Amazon", "Manguera y conectores", 566],
          ["Artículos de Limpieza", "Artículos de limpieza", 501],
          ["Supercopias", "Impresión de bitácoras para caseta", 235],
          ["Outlet Milenio III", "Artículos de limpieza", 317]
        ],
        agua: [
          ["María Cruz Ramírez H.", "Pago de 12 pipas de agua", 12000],
          ["María Cruz Ramírez H.", "Pago de 6 pipas de agua", 6000],
          ["María Cruz Ramírez H.", "Pago de 14 pipas de agua", 14000]
        ]
      }
    },
    {
      id: "2026-02", nombre: "Febrero", corto: "Feb",
      saldoIni: -25084.64, saldoFin: -33979.74,
      ingresos: { manto: 80000, agua: 21713 },
      egresos: { fijos: 75893.84, variables: 6714.26, agua: 28000 },
      cobranza: { pagaron: 40, pct: 100 }, derrama: 700, resultadoAgua: -6287,
      morosidad: { unidadesManto: 0, acumuladoManto: 0, unidadesAgua: 0, aguaMes: 0 },
      detalle: {
        fijos: [
          ["Servicios Integrados", "Vigilancia", 30000],
          ["Servicio de Limpieza", "Áreas comunes", 14000],
          ["CFE", "Luz de áreas comunes", 11152],
          ["Edificare Arquitectura", "Administración", 12000],
          ["Schindler, S.A. de C.V.", "Manto. elevador", 4232.84],
          ["Mantenimiento Alberca", "Servicio semanal", 3085],
          ["Plataforma", "Condovive", 725],
          ["Telmex", "Caseta y casa club", 499],
          ["Telcel", "Recarga", 200]
        ],
        variables: [
          ["Municipio", "Recolección de basura", 800],
          ["Nikte Jardines", "Servicio de jardinería", 4500],
          ["Office Depot", "Papelería", 1414.26]
        ],
        agua: [
          ["María Cruz Ramírez H.", "Pago de 14 pipas de agua", 14000],
          ["María Cruz Ramírez H.", "Pago de 14 pipas de agua", 14000]
        ]
      }
    },
    {
      id: "2026-03", nombre: "Marzo", corto: "Mar",
      saldoIni: -33979.74, saldoFin: -34302.55,
      ingresos: { manto: 78000, agua: 28417 },
      egresos: { fijos: 64741.84, variables: 11997.97, agua: 30000 },
      cobranza: { pagaron: 39, pct: 97.5 }, derrama: 750, resultadoAgua: -1583,
      morosidad: { unidadesManto: 1, acumuladoManto: 2000, unidadesAgua: 1, aguaMes: 2020 },
      detalle: {
        fijos: [
          ["Servicios Integrados", "Vigilancia", 30000],
          ["Servicio de Limpieza", "Áreas comunes", 14000],
          ["Edificare Arquitectura", "Administración", 12000],
          ["Schindler, S.A. de C.V.", "Manto. elevador", 4232.84],
          ["Mantenimiento Alberca", "Servicio semanal", 3085],
          ["Plataforma", "Condovive", 725],
          ["Telmex", "Caseta y casa club", 499],
          ["Telcel", "Recarga", 200]
        ],
        variables: [
          ["Municipio", "Recolección de basura", 1000],
          ["Asturiano", "Cargador para celular de caseta", 258],
          ["Agua", "Garrafones para caseta", 116],
          ["Nikte Jardines", "Servicio de jardinería", 4500],
          ["Mas Limpio", "Artículos de limpieza", 405],
          ["Grupo Jibe", "Artículos eléctricos (lámparas pasillos)", 777.62],
          ["Grupo Jibe", "Focos y reflectores", 3570.59],
          ["Adrián Elías Jiménez", "Instalación de lámparas y reflectores", 800],
          ["Albercas y Más", "Red para alberca", 570.76]
        ],
        agua: [
          ["María Cruz Ramírez H.", "Pago de 13 pipas de agua", 13000],
          ["María Cruz Ramírez H.", "Pago de 17 pipas de agua", 17000]
        ]
      }
    },
    {
      id: "2026-04", nombre: "Abril", corto: "Abr",
      saldoIni: -34302.55, saldoFin: -26780.39,
      ingresos: { manto: 78000, agua: 31963 },
      egresos: { fijos: 75729.84, variables: 1111, agua: 25600 },
      cobranza: { pagaron: 39, pct: 97.5 }, derrama: 640, resultadoAgua: 6363,
      morosidad: { unidadesManto: 1, acumuladoManto: 4000, unidadesAgua: 2, aguaMes: 2728 },
      detalle: {
        fijos: [
          ["Servicios Integrados", "Vigilancia", 30000],
          ["Servicio de Limpieza", "Áreas comunes", 14000],
          ["CFE", "Luz de áreas comunes", 10988],
          ["Edificare Arquitectura", "Administración", 12000],
          ["Schindler, S.A. de C.V.", "Manto. elevador", 4232.84],
          ["Mantenimiento Alberca", "Servicio semanal", 3085],
          ["Plataforma", "Condovive", 725],
          ["Telmex", "Caseta y casa club", 499],
          ["Telcel", "Recarga", 200]
        ],
        variables: [
          ["Municipio", "Recolección de basura", 1000],
          ["Fresko", "Insecticida", 111]
        ],
        agua: [
          ["María Cruz Ramírez H.", "Pago de 12 pipas de agua", 12000],
          ["María Cruz Ramírez H.", "Pago de 13 pipas de agua", 13600]
        ]
      }
    },
    {
      id: "2026-05", nombre: "Mayo", corto: "May",
      saldoIni: -26780.39, saldoFin: -24487.23,
      ingresos: { manto: 78000, agua: 29674 },
      egresos: { fijos: 63970.84, variables: 10210, agua: 31200 },
      cobranza: { pagaron: 39, pct: 97.5 }, derrama: 780, resultadoAgua: -1526,
      morosidad: { unidadesManto: 1, acumuladoManto: 6000, unidadesAgua: 2, aguaMes: 530 },
      detalle: {
        fijos: [
          ["Servicios Integrados", "Vigilancia", 30000],
          ["Servicio de Limpieza", "Áreas comunes", 14000],
          ["Edificare Arquitectura", "Administración", 12000],
          ["Schindler, S.A. de C.V.", "Manto. elevador", 4232.84],
          ["Mantenimiento Alberca", "Servicio semanal", 2314],
          ["Plataforma", "Condovive", 725],
          ["Telmex", "Caseta y casa club", 499],
          ["Telcel", "Recarga", 200]
        ],
        variables: [
          ["Municipio", "Recolección de basura", 1000],
          ["Artículos de Limpieza", "Bolsas negras y líquido", 294],
          ["Nikte Jardines", "Servicio de jardinería", 4500],
          ["Embobinado de Motores", "Cambio de baleros (bomba de alberca)", 4300],
          ["Agua", "Garrafones para caseta", 116]
        ],
        agua: [
          ["María Cruz Ramírez H.", "Pago de 14 pipas de agua", 14600],
          ["María Cruz Ramírez H.", "Pago de 14 pipas de agua", 14000],
          ["Luis Gerardo Hernández L.", "1 pipa de agua (20-05-26)", 1300],
          ["Luis Gerardo Hernández L.", "1 pipa de agua (27-05-26)", 1300]
        ]
      }
    },
    {
      id: "2026-06", nombre: "Junio", corto: "Jun",
      saldoIni: -24487.23, saldoFin: -24807.27,
      ingresos: { manto: 78000, agua: 29643.30 },
      egresos: { fijos: 72710.84, variables: 7252.50, agua: 28000 },
      cobranza: { pagaron: 39, pct: 97.5 }, derrama: 700, resultadoAgua: 1643.30,
      morosidad: { unidadesManto: 1, acumuladoManto: 8000, unidadesAgua: 0, aguaMes: 0 },
      detalle: {
        fijos: [
          ["Servicios Integrados", "Vigilancia", 30000],
          ["Servicio de Limpieza", "Áreas comunes", 14000],
          ["CFE", "Luz de áreas comunes", 8733],
          ["Edificare Arquitectura", "Administración", 12000],
          ["Schindler, S.A. de C.V.", "Manto. elevador", 4232.84],
          ["Mantenimiento Alberca", "Servicio semanal", 2314],
          ["Plataforma", "Condovive", 725],
          ["Telmex", "Caseta y casa club", 506],
          ["Telcel", "Recarga", 200]
        ],
        variables: [
          ["Municipio", "Recolección de basura", 1000],
          ["Nikte Jardines", "Servicio de jardinería", 4500],
          ["Mas Limpio", "Artículos de limpieza", 528.50],
          ["Office Depot", "Artículos de papelería", 1000],
          ["Mas Limpio", "Artículos de limpieza", 224]
        ],
        agua: [
          ["María Cruz Ramírez H.", "Pago de 14 pipas de agua", 14000],
          ["María Cruz Ramírez H.", "Pago de 14 pipas de agua", 14000]
        ]
      }
    },
    {
      id: "2026-07", nombre: "Julio", corto: "Jul",
      saldoIni: -24807.27, saldoFin: -19561.61,
      ingresos: { manto: 78000, agua: 28476 },
      egresos: { fijos: 65977.84, variables: 7252.50, agua: 28000 },
      cobranza: { pagaron: 39, pct: 97.5 }, derrama: 700, resultadoAgua: 476,
      morosidad: { unidadesManto: 1, acumuladoManto: 10000, unidadesAgua: 3, aguaMes: 1167 },
      detalle: {
        fijos: [
          ["Servicios Integrados", "Vigilancia", 30000],
          ["Servicio de Limpieza", "Áreas comunes", 16000],
          ["Edificare Arquitectura", "Administración", 12000],
          ["Schindler, S.A. de C.V.", "Manto. elevador", 4232.84],
          ["Mantenimiento Alberca", "Servicio semanal", 2314],
          ["Plataforma", "Condovive", 725],
          ["Telmex", "Caseta y casa club", 506],
          ["Telcel", "Recarga", 200]
        ],
        variables: [
          ["Municipio", "Recolección de basura", 1000],
          ["Nikte Jardines", "Servicio de jardinería", 4500],
          ["Mas Limpio", "Artículos de limpieza", 528.50],
          ["Office Depot", "Artículos de papelería", 1000],
          ["Mas Limpio", "Artículos de limpieza", 224]
        ],
        agua: [
          ["María Cruz Ramírez H.", "Pago de 14 pipas de agua", 14000],
          ["María Cruz Ramírez H.", "Pago de 14 pipas de agua", 14000]
        ]
      }
    }
  ],
  proyectos: [
    { nombre: "Mantenimiento mayor de bombas de agua", estado: "En evaluación", presupuesto: null }
  ]
};

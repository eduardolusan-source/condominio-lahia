# Condominio Lahia · sitio informativo

Sitio estático (GitHub Pages) para residentes: reglamento, áreas comunes, casa
club, asamblea y rendición de cuentas. Sin dependencias ni compilación.

## Finanzas (`finanzas.html`)

Protegida con clave (hash SHA-256 en `js/finanzas.js`). La pantalla la dibuja
`js/tablero.js` con `css/tablero.css`, el mismo motor que usan La Valetta y
Las Misiones (si se cambia en uno, copiarlo a los otros dos).

- La portada muestra **seis indicadores**: saldo en caja (con su tendencia),
  si alcanzó el último mes, quién pagó su cuota, cuotas atrasadas, cuánto de
  las pipas cubrió la derrama y en qué se van los $2,000 de la cuota.
- Todo lo demás vive en secciones a las que se entra con un toque: mes por
  mes, detalle de cada mes (`#mes-2026-08`), gráficas del año, en qué se gasta,
  morosidad, el agua, proyectos y cómo leer los datos. Cada sección tiene su
  dirección, así el botón "atrás" del celular funciona.
- Los rubros de "¿en qué se va tu cuota?" se definen en `OPCIONES.rubros` de
  `js/finanzas.js`.

### Datos en vivo desde la hoja de la administración

`apps-script/Code.gs` lee la hoja de captura mensual (hoy el Excel
"Lahia-Captura-Mensual (2) ARQ ANDRES.xlsx" en Drive) y entrega las cifras
**agregadas** de cada mes. Una vez publicado como aplicación web, su URL va en
`API_URL` de `js/finanzas.js` y el sitio se actualiza solo: un mes aparece en
cuanto su pestaña tiene datos. Pasos en `apps-script/INSTALAR.md`.

Mientras `API_URL` esté vacía o el script no responda, la página muestra la
copia de `js/data.js` (enero–agosto de 2026) y la etiqueta de arriba dice
"Copia guardada".

### Regla de privacidad

Nunca se publican cobros por departamento. La morosidad se calcula dentro del
script y solo salen sumas y número de unidades. Lo que entrega el script lo
puede leer cualquiera con su URL: la clave del sitio no lo protege.

## Vista local

```
python3 -m http.server 4176 --directory .
```

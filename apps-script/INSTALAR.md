# Finanzas en vivo · instalación

La hoja de captura mensual de la administración es la fuente de verdad. Un
script de Apps Script lee sus pestañas (ENERO, FEBRERO…) y entrega al sitio
las cifras **agregadas** de cada mes; `finanzas.html` las pide cada vez que
alguien la abre. Igual que en La Valetta: no hay que tocar el sitio cada mes.
En cuanto la administración llena la pestaña de un mes, ese mes aparece en la
página (a más tardar cinco minutos después).

## Qué hoja lee

`HOJA_ID` en `Code.gs` apunta a **Lahia-Captura-Mensual (2) ARQ ANDRES.xlsx**
(id `1GauI7liigjmLTVuW9mdcmQvFY6OLAbkm`), que es la que la administración
actualizó por última vez (28 de octubre de 2026, de enero a septiembre).

Ese archivo es un **Excel**, no una Hoja de Google. Apps Script no puede leer
un Excel directamente, así que el script saca una copia convertida en tu Drive
("Lahia · copia de lectura para el sitio (no editar)") y lee de ahí. La copia se
rehace sola cada vez que el Excel cambia y la anterior se va a la papelera. No
la edites: lo que cambies ahí se pierde.

**Mejor todavía:** pedirle a la administración que abra el Excel en Drive y lo
guarde como Hoja de Google (**Archivo → Guardar como Hojas de Google**), que
siga capturando en esa versión y que te la comparta (con ver basta). Luego
cambia `HOJA_ID` por el id de la hoja nueva (está en su dirección:
`docs.google.com/spreadsheets/d/ESTE_ID/edit`) y publica una versión nueva del
script (paso 5). Así no hace falta la copia y los cambios se ven más rápido.

> Si la administración sube un Excel **nuevo** en lugar de editar el mismo, su
> id cambia y el sitio se queda en el último mes que leyó. En ese caso hay que
> poner el id nuevo en `HOJA_ID`.

## 1. Pegar el script
1. Entrar a https://script.google.com/home con la cuenta que ve la hoja →
   **Nuevo proyecto**. Ponerle nombre: "Lahia · Finanzas".
2. Borrar lo que aparezca en `Código.gs` y pegar el contenido completo de
   `apps-script/Code.gs`. Guardar (icono de disquete).

## 2. Probarlo
1. Arriba, junto a "Ejecutar", elegir la función **probar** y pulsar **Ejecutar**.
2. La primera vez pide permisos: "Revisar permisos" → tu cuenta → "Avanzado" →
   "Ir a … (no seguro)" → Permitir. Es normal: el script es tuyo; pide ver tus
   archivos de Drive (para leer y convertir la hoja) y conectarse a servicios
   externos (la conversión usa la API de Drive).
3. El registro de ejecución muestra el JSON que verá el sitio: debe empezar con
   `"ok": true` y traer los meses de enero a agosto de 2026.
4. Para ver qué pestañas reconoce y qué leyó de cada una: función
   **diagnostico** → Ejecutar.

## 3. Publicar el servicio
1. Botón azul **Implementar → Nueva implementación**.
2. Engrane → tipo **Aplicación web**.
3. Descripción: "Finanzas Lahia". Ejecutar como: **Yo**. Quién tiene acceso:
   **Cualquier persona**. → **Implementar**.
4. Copiar la **URL de la aplicación web** (termina en `/exec`).

## 4. Conectar la página
En `js/finanzas.js`, pegar esa URL en `API_URL` (va vacía) y subir el sitio.

Para comprobar: abrir la URL del script en el navegador (debe responder un texto
que empieza con `{"ok":true,"servicio":"lahia-finanzas"…`) y luego
`finanzas.html` con la clave: la etiqueta de arriba debe decir **En vivo** con
punto verde. Si dice **Copia guardada**, revisar la consola del navegador.
Para forzar una lectura sin esperar los cinco minutos: agregar `?fresh=1` a la
URL del script.

## 5. Si cambias el script
**Implementar → Administrar implementaciones** → lápiz → Versión: **Nueva
versión** → Implementar. La URL no cambia.

## Lo que hay que saber de la hoja actual
- **Septiembre es una copia de agosto sin capturar**: mismas cifras y su saldo
  inicial (−$918.11) no es el saldo final de agosto ($45,713.40). El script la
  reconoce como copia y no la publica; en cuanto la administración capture
  septiembre, aparece sola. Lo mismo pasará con cualquier mes duplicado y sin
  llenar.
- La celda **Mes y año** de casi todas las pestañas dice mayo de 2026 (se quedó
  así al duplicar). No afecta: el mes se toma del nombre de la pestaña y de esa
  celda solo el año. Para 2027, nombrar las pestañas "ENERO 2027", etc.
- La pestaña **Captura Mensual** es la plantilla y se ignora.
- Los comprobantes se publican cuando la columna "Link a factura/nota (Drive)"
  trae una **liga** (vínculo insertado o URL). Hoy casi todas traen solo el
  nombre del archivo; con nombre no se puede enlazar.
- Los gastos capturados en MAYÚSCULAS se muestran en el sitio en tipo título
  (proveedores) y tipo oración (descripciones).
- Si el saldo inicial de un mes no coincide con el saldo final del anterior, el
  JSON lo dice en `avisos` (no se muestra a los vecinos).

## Qué sale y qué no sale del script
Salen solo **agregados**: saldos, totales de ingresos y egresos, número de
unidades que pagaron, mora acumulada y adelantos sumados, deuda de agua sumada
y el desglose de gastos por proveedor. **Nunca salen los cobros por
departamento**: la mora se calcula dentro del script (pagado en el año menos
cuotas transcurridas, unidad por unidad) y solo se publican las sumas y los
conteos. Cualquiera con la URL del script puede leer esos agregados; la clave
del sitio no los protege.

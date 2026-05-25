# BMTS Implementation Log

## 2026-05-25 - MVP Local 0.1

Se creo una primera aplicacion web local en `app/`.

### Implementado

- Servidor local sin dependencias externas (`app/server.js`).
- Base local JSON (`app/data/db.json`).
- Carpeta local de fotos (`app/data/uploads`).
- Interfaz web (`app/public/index.html`, `styles.css`, `app.js`).
- Cliente piloto Community Tree Service.
- Alta de vehiculo/unidad con foto obligatoria.
- Consulta vPIC/NHTSA por VIN desde el servidor.
- QR token unico por vehiculo y ruta local `/v/{qrToken}`.
- Historial vivo con eventos de partida de nacimiento y QR asignado.
- Ordenes de trabajo.
- Bloqueo SmogCheck si se intenta antes de la fecha permitida.
- Autorizacion admin con razon para excepciones.
- Estados de orden.
- Invoice basico por orden entregada.

### Verificacion

- `node --check server.js`: correcto.
- `node --check public/app.js`: correcto.
- Prueba temporal del servidor:
  - HTML: `200`
  - JS: `200`
  - API: `200`
- Calvin confirmo que el MVP cargo correctamente en navegador local en `http://localhost:4173/`.
- Se guardo captura real del MVP en `docs/remotion_captures/2026-05-25_mvp_local_loaded.png`.

### Limitaciones Conocidas

- El MVP ya fue validado localmente por Calvin. La primera captura real se guardo para Remotion.
- La imagen QR aun no se genera dentro de la app. El MVP crea el token/URL listo para conectar el generador propio de QR.
- La base es JSON local para validar flujo; PostgreSQL/Prisma queda para la siguiente etapa.
- Auth y roles aun no estan implementados como login real; la autorizacion admin esta modelada en el formulario.
- La foto demo existente es un placeholder; las siguientes pruebas deben usar fotos reales de vehiculos.

## 2026-05-25 - Habilidad Remotion

Se creo la habilidad local `skills/bmts-remotion-progress` para registrar avances del proyecto y preparar briefs de presentacion en Remotion.

### Incluye

- `SKILL.md` con flujo de captura y preparacion.
- `references/capture_schema.md` con el esquema de captura.
- `scripts/build_remotion_brief.py` para generar briefs Markdown.
- `docs/remotion_captures/2026-05-25_capture.json` como primera captura.
- `docs/remotion_briefs/2026-05-25_remotion_brief.md` como primer brief.

### Verificacion

- El script `build_remotion_brief.py` compila correctamente.
- Se genero el brief inicial correctamente.
- `quick_validate.py` no pudo ejecutarse con el Python empaquetado porque falta el modulo `yaml`.
- Se actualizo la captura inicial con una imagen real del MVP cargado localmente.

## 2026-05-25 - Integracion vPIC/NHTSA ampliada

Se conecto y verifico la consulta real de vPIC/NHTSA por VIN desde el MVP local.

### Implementado

- Endpoint local `GET /api/nhtsa/{vin}` conectado a `DecodeVinValuesExtended`.
- Boton `vPIC` en la partida de nacimiento para cargar datos tecnicos.
- Autollenado de ano, marca, modelo, carroceria y motor.
- Autollenado ampliado de combustible, GVWR, traccion, fabricante, tipo de vehiculo, planta y avisos de NHTSA.
- Persistencia de esos campos en `app/data/db.json` al crear vehiculos nuevos.
- Visualizacion de los datos tecnicos ampliados en la ficha del vehiculo.

### Verificacion

- `node --check server.js`: correcto.
- `node --check public/app.js`: correcto.
- Se probo el VIN demo `1FT8W3DT0NEE00000`.
- NHTSA devolvio datos de Ford F-350 2022, Diesel, GVWR Class 3, 4WD y tipo TRUCK.
- NHTSA devolvio aviso de check digit para el VIN demo; el MVP ahora muestra este aviso.

## 2026-05-25 - Captura y pegado de VIN

Se agrego una primera capa para reducir errores al cargar VIN.

### Implementado

- Boton `Pegar VIN` para leer texto desde el portapapeles del navegador.
- Normalizacion automatica del VIN:
  - convierte a mayusculas
  - elimina espacios y simbolos
  - elimina caracteres no validos `I`, `O`, `Q`
- Validacion visual `VIN pendiente`, `VIN incompleto` o `VIN listo para vPIC`.
- Bloqueo de creacion de partida si el VIN no tiene 17 caracteres validos.
- Campo `Foto del VIN` con vista previa.
- Guardado local opcional de la foto del VIN junto al registro del vehiculo.
- Campo `vinPhotoUrl` en la base local para vehiculos nuevos.
- Endpoint placeholder `POST /api/vin-photo/recognize` para conectar OCR real.

### Nota Tecnica

No se encontro motor OCR local instalado (`tesseract`, `pytesseract`, `easyocr`). Calvin aprobo usar PaddleOCR provisionalmente, dejando Google Vision como alternativa futura.

## 2026-05-25 - Decision OCR PaddleOCR

Se acepto PaddleOCR como recurso OCR provisional open source para leer VIN desde imagen.

### Implementado

- Documento `docs/ocr_strategy.md`.
- Adaptador `app/scripts/ocr_vin_paddle.py`.
- Endpoint `POST /api/vin-photo/recognize`.
- Boton `Leer VIN con PaddleOCR` en la pantalla de partida.
- Mensaje de fallback cuando PaddleOCR no esta instalado.
- Entorno local `app/.venv` con PaddleOCR instalado.
- Ajustes de cache local para Paddle/PaddleX.
- Scripts de arranque actualizados para usar `BMTS_PYTHON`.

### Verificacion

- `paddleocr 3.5.0` importado correctamente.
- `paddlepaddle 3.2.2` importado correctamente.
- Endpoint OCR probado en servidor temporal.
- Se detecto problema de permisos en la cache inicial `app/.paddlex`.
- Se creo cache limpia `app/.paddlex_runtime`.
- Prueba final con imagen sintetica leyo correctamente `1FT8W3DT0NEE00000`.

### Pendiente

- Evaluar Google Vision si PaddleOCR no alcanza precision suficiente en condiciones de luz muy difíciles.

### Diagnostico De Arranque

- Se encontro un proceso viejo escuchando en el puerto `4173` que seguia sirviendo una version anterior del backend.
- Sintoma: `/api/ocr/status` devolvia `404` y `/api/vin-photo/recognize` devolvia `501`.
- Se detuvo el proceso viejo y se verifico que la version nueva responde correctamente en `/api/ocr/status`.
- `start_bmts_mvp.bat` y `start_bmts_mvp.ps1` quedan preparados para cerrar el proceso viejo antes de iniciar.

## 2026-05-25 - Estabilización de OCR, Optimización de Imagen y Automatización de vPIC

Se optimizó la lectura de imágenes reales, se estabilizó el manejo de errores de red y se mejoró la experiencia de usuario (UX) en la app.

### Implementado

- **Resolución de PermissionError**: Se renombró la carpeta de caché anterior `.paddlex_runtime` a `.paddlex_runtime_old`, forzando al motor a crear una carpeta nueva con permisos de lectura y escritura para el usuario activo, lo que resolvió el error de carga de modelos.
- **Redimensionamiento Automático de Imagen (Downscaling)**: Se agregó soporte en `ocr_vin_paddle.py` usando `Pillow` para detectar si el lado largo de la imagen supera los 1500px y, en ese caso, escalarla y convertirla a un archivo JPEG optimizado de ~150KB. Esto solucionó la falta de detección de texto en fotos de alta resolución de smartphones (ej. 4000x1848) y optimizó el espacio de disco.
- **Corrección de Bug de Normalización**: Se resolvió un bug en el script Python que transformaba la palabra "VIN" en "VN", corrompiendo el código leído al inicio. Ahora se remueven de forma segura las etiquetas de VIN/ID separadas por palabras antes de normalizar.
- **Flujo de Respuesta de API Seguro**: Se modificó `server.js` para retornar `200 OK` con `ok: false` y un mensaje descriptivo en lugar de `501` si no se encuentra un VIN en la foto, evitando colgar el navegador.
- **Automatización de Consulta vPIC (UX)**: Se actualizó `app.js` para que los botones de "Leer VIN con PaddleOCR" y "Pegar VIN" disparen de forma automática la decodificación de vPIC/NHTSA si se obtiene un VIN de 17 caracteres, autocompletando la ficha del vehículo en un solo paso y mostrando un mensaje amigable si la detección falla.

### Verificacion

- El backend procesa correctamente la foto real del usuario de 4.19MB, detectando el VIN `MAJ3S2GEXKC255041` en unos 4 segundos.
- La consulta vPIC decodifica de forma inmediata los datos de un Ford Ecosport 2019 de manera automática.
- Respuestas sin VIN legible ahora muestran un aviso de ayuda en pantalla en lugar de provocar un error 501.

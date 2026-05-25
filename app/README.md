# BMTS MVP Local

Primera version funcional web-first para validar el flujo base de BMTS.

## Ejecutar

Desde esta carpeta:

```powershell
npm start
```

Luego abrir:

```text
http://localhost:4173
```

## Que Incluye

- Cliente piloto `Community Tree Service`.
- Alta de partida de nacimiento por vehiculo/unidad.
- Foto principal obligatoria guardada localmente en `data/uploads`.
- Datos tecnicos por VIN usando vPIC/NHTSA cuando hay conexion disponible.
- QR token/URL unico por vehiculo.
- Enlace `/v/{qrToken}` para simular escaneo de QR.
- Historial vivo de eventos.
- Ordenes de trabajo.
- Regla SmogCheck con bloqueo si se intenta antes de la fecha permitida.
- Autorizacion admin con razon para excepciones.
- Cambio de estados: recibido, revisando, en_trabajo, listo, entregado.
- Invoice basico por orden entregada.

## Base Local

Los datos se guardan en:

```text
app/data/db.json
```

Las fotos se guardan en:

```text
app/data/uploads
```

## Nota Sobre QR

El MVP ya crea y asigna un `qrToken` y un valor de escaneo local como `/v/{qrToken}`. La imagen QR final queda lista para conectarse al generador propio de BM360/Calvin.

## OCR VIN

PaddleOCR quedo instalado localmente en `app/.venv`.

Versiones fijadas:

```text
paddleocr==3.5.0
paddlepaddle==3.2.2
numpy==2.3.5
```

El arranque `start_bmts_mvp.bat` configura `BMTS_PYTHON` y las carpetas de cache locales para que el OCR no use carpetas globales de Windows.

El OCR propone un VIN, pero el usuario debe confirmarlo antes de consultar vPIC/NHTSA.

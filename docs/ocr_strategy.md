# BMTS OCR Strategy

Fecha: 2026-05-25
Estado: decision provisional

## Decision

BMTS usara PaddleOCR como recurso OCR provisional para leer VIN desde imagen/foto.

Google Vision queda como alternativa futura si:

- PaddleOCR no da suficiente precision en fotos reales de campo.
- El mantenimiento local se vuelve incomodo.
- Se prefiere delegar OCR a una API externa administrada.

## Por Que PaddleOCR

- Es open source.
- Es mas moderno que Tesseract para muchos casos de OCR en imagen real.
- Puede ejecutarse localmente, lo cual encaja con la estrategia local-first del MVP.
- Permite mantener fotos/VIN dentro del entorno BMTS sin enviar datos a terceros.

## Limitaciones

- Requiere instalacion local de dependencias de PaddleOCR.
- Puede necesitar ajustes segun calidad de foto, luz, angulo y suciedad del VIN.
- En equipos sin GPU puede ser mas pesado que Tesseract.

## Implementacion Preparada

Se agrego el adaptador:

```text
app/scripts/ocr_vin_paddle.py
```

Este script:

- intenta usar `paddleocr`,
- extrae texto de la imagen,
- limpia caracteres invalidos para VIN,
- busca un VIN de 17 caracteres,
- devuelve JSON con `vin`, `rawText` y `provider`.

## Estado De Instalacion

PaddleOCR fue instalado localmente en:

```text
app/.venv
```

Versiones actuales:

```text
paddleocr==3.5.0
paddlepaddle==3.2.2
numpy==2.3.5
```

Se bajo `paddlepaddle` de `3.3.1` a `3.2.2` porque `3.3.x` presento una falla conocida en Windows CPU/oneDNN durante inferencia.

Los modelos se descargan y cachean localmente en:

```text
app/.paddlex_runtime
app/.cache_runtime
app/.home_runtime
```

## Resultado De Prueba

El endpoint `POST /api/vin-photo/recognize` ya responde con PaddleOCR.

Despues de crear una cache limpia de modelos en `app/.paddlex_runtime`, PaddleOCR leyo correctamente el VIN sintetico `1FT8W3DT0NEE00000`.

El flujo sigue siendo asistido porque en fotos reales pueden aparecer reflejos, suciedad o caracteres confundidos:

1. OCR propone VIN.
2. Usuario revisa y confirma.
3. Luego se consulta vPIC/NHTSA.

## Flujo MVP

1. Usuario toma/sube foto del VIN.
2. MVP guarda la foto localmente.
3. OCR lee la imagen con PaddleOCR.
4. El VIN detectado se normaliza.
5. El usuario confirma el VIN.
6. Se consulta vPIC/NHTSA.

## Fallback

Si PaddleOCR no esta instalado o falla, el MVP debe permitir:

- pegar VIN desde portapapeles,
- escribir VIN manualmente,
- guardar foto del VIN como respaldo,
- conectar Google Vision en fase posterior.

# BMTS MVP - Primera version local

Fecha: 2026-05-25
Version: MVP Local 0.1
Audiencia: BMTS owners and office team

## Objetivo

Documentar visualmente el avance del proyecto BMTS para que el equipo entienda que se construyo, por que importa y que sigue.

## Resumen

Se construyo la primera app web local para validar partida de nacimiento, foto obligatoria, QR/token, historial, ordenes, bloqueo SmogCheck e invoice basico.

## Escenas Remotion Sugeridas

### 1. Contexto Del Problema

Mostrar el problema operativo: historial disperso, duplicados, papel y dificultad para cargar servicios rapidamente.

Texto en pantalla:

- BMTS necesita una memoria viva por vehiculo.
- El QR conecta el auto fisico con su historial digital.

### 2. Avance De Esta Version

Datos destacados:

- Cliente piloto: Community Tree Service
- Base local JSON para validar el flujo
- Foto obligatoria guardada localmente
- QR token/ruta local por vehiculo
- SmogCheck bloqueado antes de la fecha permitida
- MVP validado en navegador local por Calvin
- Consulta vPIC/NHTSA conectada para autollenar datos tecnicos
- Pegado, validacion y foto local del VIN agregados al flujo
- PaddleOCR aceptado como OCR provisional open source
- PaddleOCR instalado localmente y endpoint probado con VIN sintetico correcto

### 3. Demo Flow

- Crear partida de nacimiento con VIN, foto y datos tecnicos
- Consultar vPIC/NHTSA para autollenar informacion del vehiculo
- Pegar VIN o registrar foto del VIN como respaldo
- Leer VIN desde foto con PaddleOCR y confirmar el resultado
- Asignar QR unico al vehiculo
- Simular escaneo del QR para abrir ficha
- Intentar SmogCheck antes de tiempo
- Mostrar bloqueo y autorizacion admin
- Crear orden valida y generar invoice basico

### 4. Capturas Y Assets

- BMTS MVP dashboard: `C:/Users/no/Documents/BMTS planificacion y workflow/docs/remotion_captures/2026-05-25_mvp_local_loaded.png`
  Nota: Vista principal cargada localmente con Community Tree, unidad demo, ficha de vehiculo, QR/token y formulario de partida.

### 5. Decisiones Confirmadas

- MVP web-first
- Fotos locales durante MVP
- QR unico vinculado a base local
- vPIC/NHTSA como fuente tecnica por VIN
- PaddleOCR provisional para lectura de VIN por imagen con confirmacion humana
- QuickBooks queda para fase posterior

### 6. Limitaciones

- Imagen QR aun pendiente de conectar al generador propio
- Login y roles reales pendientes
- Base JSON local antes de PostgreSQL/Prisma
- La foto demo actual es un placeholder pequeño; reemplazar por foto real en pruebas BMTS

### 7. Siguientes Pasos

- Conectar generador propio de QR
- Capturar pantallas adicionales del flujo Historial, Servicio e Invoice
- Probar PaddleOCR con fotos reales del VIN
- Definir flujo real desde recepcion hasta cobro
- Preparar primer video Remotion de avance

## Notas De Narracion

- Explicar cada pantalla en lenguaje de taller, no lenguaje tecnico.
- Conectar cada funcion con un dolor real: evitar duplicados, guardar historial, acelerar servicio, preparar invoice.
- Mostrar QR como puente entre vehiculo fisico y sistema.

## Extracto De Memoria Del Proyecto

```text
el proyecto.
- Se genero la primera captura Remotion en `docs/remotion_captures/2026-05-25_capture.json`.
- Se genero el primer brief Remotion en `docs/remotion_briefs/2026-05-25_remotion_brief.md`.
- Calvin cargo correctamente el MVP en navegador local.
- Se guardo captura real del MVP cargado en `docs/remotion_captures/2026-05-25_mvp_local_loaded.png`.
- Observacion: la unidad demo usa una foto placeholder; reemplazar por una foto real al probar con BMTS.
- Se amplio la integracion vPIC/NHTSA para autollenar y guardar datos tecnicos adicionales: combustible, GVWR, traccion, fabricante, tipo de vehiculo, planta y avisos de NHTSA.
- Se agrego flujo para reducir errores de VIN: pegado desde portapapeles, normalizacion/validacion, foto del VIN y campo local `vinPhotoUrl`.
- Calvin aprobo PaddleOCR como OCR provisional open source para leer VIN desde imagen; Google Vision queda como alternativa futura.
- Se agrego adaptador `app/scripts/ocr_vin_paddle.py` y endpoint `POST /api/vin-photo/recognize`.
- PaddleOCR quedo instalado localmente en `app/.venv` con `paddleocr 3.5.0`, `paddlepaddle 3.2.2` y `numpy 2.3.5`.
- Se resolvio problema de permisos creando cache limpia `app/.paddlex_runtime`.
- Prueba OCR final leyo correctamente el VIN sintetico `1FT8W3DT0NEE00000`.
- Se mantiene confirmacion humana obligatoria antes de consultar vPIC/NHTSA.

## Habilidades De Agentes Confirmadas

El ZIP local confirma habilidades utiles para producto, diseno, Next.js, React Native, seguridad, accesibilidad, planes y debugging. Para BMTS, las prioritarias son:

- `intelligent_app_interpreter`
- `brainstorming`
- `writing-plans`
- `executing-plans`
- `nextjs-app-router-patterns`
- `react-state-management`
- `frontend-security-patterns`
- `error-handling-patterns`
- `accessibility-compliance`

```

## Extracto De Implementacion

```text
eles del navegador.
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

- Probar con fotos reales de VIN de BMTS.
- Evaluar Google Vision si PaddleOCR no alcanza precision suficiente.

```

# BMTS Memoria Viva

Ultima actualizacion: 2026-05-25

## Contexto Del Negocio

BMTS es un taller mecanico movil y de flotas en Hollister, CA, con aproximadamente 30 anos de experiencia acumulada. El negocio tiene clientes fieles y esta creciendo hacia cuentas comerciales/flotas.

El problema no es falta de conocimiento tecnico del taller. El problema es que ese conocimiento vive en la cabeza de Beto y en procesos dispersos: papel, llamadas, Mission One, O'Reilly, QuickBooks y seguimiento manual.

## Dolor Principal

- Servicios duplicados en unidades de flota.
- Informacion que llega tarde a oficina.
- Invoices que se retrasan o se olvidan.
- Dificultad para entrenar a otras personas porque el proceso no esta aterrizado.
- Falta de un historial unico por vehiculo/unidad.

## Decisiones Detectadas

- El sistema debe empezar por el flujo real: llega vehiculo/unidad, se valida, se trabaja, se cierra, se cobra.
- El cliente ideal inicial parece ser flota comercial, no necesariamente cliente particular.
- Community Tree Service aparece como caso fuerte por tener alrededor de 200 camiones.
- El sistema debe ayudar a documentar procesos, no solo registrar datos.
- Se prefiere avanzar por demos semanales y validacion con Beto/familia.

## Decisiones Confirmadas Por Calvin

- La primera demo debe priorizar la creacion de la "partida de nacimiento" del vehiculo, el historial en proceso de creacion y la prevencion de duplicados.
- El cliente piloto inicial sera Community Tree Service.
- La primera version sera web-first.
- La facturacion inicial sera por orden terminada.
- Debe quedar abierta la opcion de agrupar por flota en recepciones parciales, normalmente con menos de 10 ordenes por recepcion.
- QuickBooks puede esperar para una fase posterior, pero la integracion futura es segura.
- La partida de nacimiento usara vPIC/NHTSA con API JSON para cargar informacion tecnica por VIN.
- Cada registro de vehiculo/unidad debe incluir una foto principal obligatoria del auto.
- Para el MVP, las fotos se guardaran localmente.
- Cada vehiculo/unidad debe tener un QR unico vinculado a su informacion en la base de datos local.
- El QR se imprimira y adherira al auto para que los mecanicos puedan escanearlo en cada servicio.
- El MVP usara el generador propio de QR de Calvin/BM360 para crear y asignar codigos.
- SmogCheck es la prioridad de alertas: debe advertir y bloquear si se intenta antes de la fecha permitida por el sistema, cada 3 meses.
- El admin es quien puede autorizar continuidad ante un bloqueo.
- Estados iniciales aprobados: recibido, revisando, en trabajo, listo, entregado.
- Otros servicios con alerta: cambio de aceite, mantenimiento menor, cambio de partes, servicio de grua y asistencia en carretera.

## Conceptos Clave

- "Acta de nacimiento del vehiculo": historial completo por unidad.
- "GPS interno": estados visibles del avance del trabajo.
- "Luces de tablero": alertas preventivas o recomendaciones.
- "PMV/MVP": primera version util, no sistema completo.

## Supuestos Actuales

- La primera version sera web-first para oficina/admin.
- Campo/mecanico puede iniciar con una vista web movil antes de React Native.
- OCR de placa puede ser manual al inicio para no bloquear el MVP.
- QuickBooks queda fuera del MVP funcional, pero el modelo de datos debe prepararse para integracion futura.

## Pendientes Importantes

- Confirmar reglas reales de cumplimiento de emisiones en CA aplicables a BMTS.
- Confirmar roles reales de Beto, esposa, hija, mecanicos y clientes.
- Confirmar formato de invoice y reglas de precios/labor/partes.
- Observar proceso real de oficina/campo antes de congelar UX.

## Registro De Avance

### 2026-05-25

- Se revisaron documentos administrativos, tecnicos y transcripciones.
- Se creo documentacion base del proyecto.
- Se propuso MVP centrado en duplicados, ordenes, historial e invoice basico.
- No se inicio codigo funcional del sistema.
- Se reviso `habilidades-agentes-main.zip` y se documento un inventario de habilidades aplicables al MVP.
- Calvin confirmo prioridades iniciales: partida de nacimiento, historial/documentacion, duplicados, piloto Community Tree, web-first, invoice por orden y QuickBooks posterior.
- Calvin confirmo uso de vPIC/NHTSA, foto por vehiculo, prioridad SmogCheck con bloqueo por plazo, admin como autorizador y estados operativos iniciales.
- Calvin confirmo que la foto sera obligatoria y se guardara localmente en el MVP.
- Calvin agrego QR por vehiculo como control fisico/digital para abrir ficha, historial y carga de servicios.
- Se construyo `app/`, primera version funcional local del MVP.
- El MVP local incluye partida de nacimiento, foto obligatoria, QR token/ruta local, historial, ordenes, bloqueo SmogCheck e invoice basico.
- Queda pendiente conectar el generador propio para producir la imagen QR dentro de la app.
- Se creo la habilidad local `bmts-remotion-progress` para registrar capturas, datos y avances del proyecto.
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
- Se resolvio problema de permisos en la cache `.paddlex_runtime` renombrando la carpeta anterior con errores a `.paddlex_runtime_old` para forzar su regeneracion con permisos del usuario actual.
- Se implemento redimensionamiento (downscaling) automatico de imagenes mayores de 1500px usando `Pillow` en `ocr_vin_paddle.py` para resolver la falta de deteccion de texto en fotos de smartphones (ej. 4000x1848).
- Se resolvio el bug del limpiador de VIN que convertia la etiqueta "VIN" en "VN" y corrompia el codigo leido.
- Se corrigio el endpoint de OCR en `server.js` para retornar `200 OK` (en lugar de `501`) cuando el OCR corre con exito pero no se encuentra un VIN en la foto, mejorando el manejo de errores.
- Se automatizo el flujo de usuario en `app.js` de modo que al completarse la lectura de OCR o al pegar un VIN, si el codigo tiene 17 caracteres, se ejecuta automaticamente la consulta a vPIC/NHTSA para precargar la ficha del vehiculo.
- Se realizo prueba exitosa con la foto real del usuario, decodificando el VIN `MAJ3S2GEXKC255041` del Ford Ecosport 2019 de forma automatizada.

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

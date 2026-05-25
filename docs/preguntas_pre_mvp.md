# Preguntas Antes De Construir Codigo

Estas preguntas son la compuerta antes de empezar a desarrollar el MVP funcional.

## Prioridad De Negocio

1. [Respondida] La primera demo prioriza partida de nacimiento, historial/documentacion inicial y evitar duplicados.
2. [Respondida] El primer cliente piloto sera Community Tree Service.
3. [Respondida] La primera version sera web-first.

## Flujo Real

4. Cuales son los pasos exactos desde que llega una unidad hasta que se cobra?
5. Quien toca la informacion en cada paso: Beto, esposa, hija, mecanico, cliente?
6. Que datos son obligatorios antes de iniciar trabajo?
7. Que datos se pueden completar despues?

## Duplicados

8. [Respondida] Servicios con alerta: SmogCheck como prioridad, cambio de aceite, mantenimiento menor, cambio de partes, servicio de grua, asistencia en carretera, etc.
9. [Respondida parcial] SmogCheck se controla cada 3 meses y bloquea si no cumple el plazo correcto. Falta definir ventanas para otros servicios.
10. [Respondida] Si el sistema detecta duplicado bloqueante, solo el admin puede autorizar continuar.
11. Que razon debe guardarse cuando alguien decide continuar?

## Facturacion

12. [Respondida] El invoice sale por orden terminada; debe existir opcion posterior/parcial por flota cuando haya varias ordenes en una recepcion.
13. Que debe ver el cliente y que debe quedar solo interno?
14. Como manejan partes: costo, markup, proveedor, recibo, garantia?
15. [Respondida] QuickBooks puede esperar, pero debe contemplarse como integracion futura segura.

## Cumplimiento Y Recordatorios

16. Que regla exacta aplica para emisiones/CARB en las flotas que atiende BMTS?
17. Quieren recordatorio por SMS, WhatsApp, email o llamada/manual al principio?
18. Quien recibe los recordatorios: cliente, oficina, o ambos?

## Tecnologia Y Operacion

19. [Respondida] Primera version web-first.
20. Habra servidor local en la oficina desde el MVP o primero entorno cloud/dev?
21. Quien administrara usuarios y permisos?
22. Hay datos reales que podamos importar desde Mission One, QuickBooks o archivos actuales?

## Partida De Nacimiento

26. [Respondida] Se usara vPIC/NHTSA con API JSON para cargar informacion tecnica del vehiculo desde el VIN.
27. [Respondida] Cada registro debe permitir importar/subir una foto del vehiculo.
28. [Respondida] Para el MVP, la foto se guardara localmente.
29. [Respondida] La foto sera obligatoria para crear la partida de nacimiento, aunque puede cambiar despues.
35. [Respondida] Se agregara pegado de VIN desde portapapeles para evitar errores al digitar.
36. [Respondida parcial] Se agregara foto del VIN como respaldo local; lectura OCR automatica queda pendiente de proveedor/motor OCR.
37. Falta decidir proveedor OCR para leer VIN desde imagen: Google Vision, Tesseract local, Azure Vision u otro.

## QR De Vehiculo

30. [Respondida] Cada vehiculo/unidad debe tener un QR vinculado a su informacion en la base de datos local.
31. [Respondida] El QR se imprimira y se adherira al auto para que el mecanico lo escanee en cada servicio.
32. [Respondida] El MVP usara el generador de QR propio de Calvin/BM360 para creacion y asignacion.
33. Falta definir el formato del valor del QR: ID interno, URL local, token unico, o combinacion.
34. Falta definir flujo de reemplazo si un QR se dana, se pierde o se reasigna por error.

## Agentes E IA

23. Que agente aporta valor primero: contabilidad, cumplimiento, mantenimiento o documentacion?
24. Los agentes podran ejecutar acciones o solo sugerir hasta que Beto apruebe?
25. Que informacion no debe enviarse a APIs externas?

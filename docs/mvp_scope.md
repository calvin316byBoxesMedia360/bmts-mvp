# BMTS MVP Scope

Version: 0.1
Fecha: 2026-05-25

## Criterio Recomendado

El MVP debe enfocarse en el problema que ya cuesta dinero: trabajo duplicado, retraso de oficina, cobros olvidados y falta de historial confiable por unidad.

## MVP Propuesto

Prioridad confirmada para la primera demo:

1. Crear la "partida de nacimiento" del vehiculo/unidad.
2. Asignar un QR unico imprimible al vehiculo/unidad.
3. Construir historial desde el primer uso, aunque el proyecto empiece sin datos historicos completos.
4. Evitar duplicados antes de iniciar o registrar servicios.
5. Usar Community Tree Service como cliente piloto.
6. Entregar version web-first.

### Modulo 1: Base Operativa

- crear clientes
- crear flotas
- crear unidades por flota
- crear vehiculos con placa, VIN opcional, marca, modelo, ano y notas
- importar datos tecnicos desde vPIC/NHTSA usando VIN
- mostrar y guardar campos tecnicos vPIC/NHTSA: combustible, GVWR, traccion, fabricante, tipo de vehiculo, planta y avisos
- pegar VIN desde portapapeles para evitar errores de digitacion
- normalizar y validar VIN antes de consultar vPIC/NHTSA
- subir foto del VIN como respaldo/auditoria local
- subir o importar una foto principal obligatoria del vehiculo/unidad
- crear/asignar QR unico al vehiculo usando el generador propio
- buscar vehiculo por placa, VIN o numero de unidad
- buscar/abrir vehiculo al escanear QR

### Modulo 2: Ordenes de Trabajo

- crear orden desde oficina o campo
- seleccionar cliente, vehiculo y tipo de servicio
- registrar notas, partes y labor
- cambiar estado de la orden
- cerrar orden

### Modulo 3: Alerta de Duplicado

- al crear orden, revisar historial reciente
- mostrar alerta si existe servicio igual o similar dentro de la ventana configurada
- permitir cancelar o continuar con razon
- priorizar SmogCheck: bloquear si se intenta antes de los 3 meses o antes de la fecha asignada por el sistema
- permitir excepcion de bloqueo solo con autorizacion de admin
- incluir advertencias para cambio de aceite, mantenimiento menor, cambio de partes, servicio de grua, asistencia en carretera y otros servicios configurables

### Modulo 3.1: QR De Vehiculo

- generar o asignar un QR unico por vehiculo/unidad
- vincular el QR al ID del registro local
- permitir imprimir el QR para adherirlo al vehiculo
- escanear QR para abrir ficha, historial y nueva orden de servicio
- registrar en historial cuando se asigna, imprime o reemplaza un QR

### Modulo 4: Historial del Vehiculo

- vista cronologica de servicios
- ordenes previas
- invoices asociados
- notas importantes
- eventos de creacion y actualizacion de datos
- documentacion del proceso mientras el historial se construye

### Modulo 4.1: Partida De Nacimiento

- ficha maestra del vehiculo/unidad
- cliente/flota propietaria
- numero de unidad
- placa
- VIN opcional
- foto del VIN opcional para respaldo/auditoria
- marca, modelo y ano
- datos tecnicos importados desde vPIC/NHTSA
- datos de clasificacion tecnica para flotas: combustible, GVWR, traccion, fabricante, tipo y planta
- foto principal obligatoria del vehiculo
- QR unico asignado
- fecha de alta en BMTS
- notas de condicion inicial
- primer registro de recepcion o inspeccion

### Modulo 5: Invoice Basico

- generar vista de invoice desde orden cerrada
- separar vista interna y vista de cliente
- marcar estado: borrador, enviado, pagado, vencido
- facturar por orden terminada
- dejar preparada la opcion de agrupar ordenes por flota/recepcion parcial

## Stack Inicial Recomendado

Para moverse rapido y no sobredimensionar:

- Web admin: Next.js + TypeScript
- API: Next.js API routes o Fastify, segun se confirme si sera monorepo
- Base de datos: PostgreSQL + Prisma
- UI: Tailwind + componentes simples
- Auth inicial: usuarios y roles basicos

React Native, OCR, WebSocket, Twilio, Stripe, QuickBooks y agentes deben entrar por fases, despues de validar el flujo central. QuickBooks no entra en el MVP, pero se reservara estructura para integracion posterior.

Para el MVP, las fotos se guardaran localmente en el servidor/proyecto. Esta decision puede cambiar en fases posteriores hacia storage cloud o servidor dedicado.

## Estilo Visual y UI/UX Premium (BoxesMedia360)

El diseño de la aplicación y la papelería del taller se regirá por tres conceptos de alta fidelidad:
- **Opción A (Heavy-Duty Racing):** Estilo rudo deportivo con tipografías inclinadas Archivo/Barlow, franjas de taller y contraste de 12:1 óptimo para luz solar directa.
- **Opción B (Clean Tech & Mobility):** Estilo SaaS de vanguardia, grises oscuros, cristal degradado (glassmorphism) y acentos neon con brillos LED tenues.
- **Opción C (Truck Cockpit):** Skeuomorfismo de tablero de camiones Kenworth/Peterbilt, diales SVG, rejilla de luces testigo y números segmentados.

La producción física de las etiquetas QR integradas con el logo de BMTS se realizará en vinilo pesado mate UV de 3.5 mil con adhesivo acrílico permanente.

## Validacion Del MVP

El MVP se considera util si Beto y oficina pueden hacer esto en una demo:

1. Buscar una unidad de Community Tree.
2. Crear o revisar su partida de nacimiento con datos vPIC/NHTSA, foto y QR.
3. Simular escaneo del QR para abrir la ficha e iniciar servicio.
4. Intentar registrar un SmogCheck antes de la fecha permitida.
5. Ver alerta clara y bloqueo con autorizacion de admin.
6. Crear una orden valida.
7. Cambiar estados.
8. Cerrar orden.
9. Generar invoice basico.

## Riesgos Principales

- No tener reglas exactas de servicios y precios.
- Mezclar necesidades de taller, campo, contabilidad y SaaS antes de validar el flujo base.
- Depender demasiado pronto de integraciones externas.
- No observar el proceso real en campo/oficina antes de fijar pantallas finales.

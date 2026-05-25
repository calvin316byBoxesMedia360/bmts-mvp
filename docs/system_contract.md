# BMTS System Contract

Version: 0.1
Fecha: 2026-05-25
Estado: borrador de trabajo

## Proposito

Este contrato define que debe hacer el sistema BMTS en su primera etapa y que limites no deben romperse durante el desarrollo.

## Prioridad Confirmada Del MVP

La primera demo debe concentrarse en:

- partida de nacimiento del vehiculo/unidad
- QR unico imprimible/adherible vinculado al vehiculo
- historial vivo desde el primer registro
- prevencion de duplicados
- piloto con Community Tree Service
- version web-first
- invoice por orden terminada

## Usuarios Principales

- Administrador: Beto. Ve todo, decide precios, servicios, reportes y aprobaciones.
- Oficina: registra clientes, vehiculos, ordenes, estados e invoices.
- Contabilidad: revisa balances, invoices pendientes, pagos y posible sincronizacion con QuickBooks.
- Mecanico: trabaja desde campo o taller, consulta historial, crea o actualiza ordenes.
- Cliente: consulta estado del vehiculo y recibe recordatorios o invoices.

## Entidades Minimas

- Cliente: persona o empresa.
- Flota: agrupacion comercial de unidades.
- Unidad de flota: numero interno, vehiculo asociado y proximo servicio.
- Vehiculo: placa, VIN opcional, marca, modelo, ano, historial.
- Foto de vehiculo: imagen principal asociada a la partida de nacimiento o al registro de recepcion.
- QR de vehiculo: codigo unico vinculado al registro local del vehiculo/unidad.
- Orden de trabajo: estado, servicios, notas, mecanico, fechas.
- Linea de servicio: labor, partes, costo interno opcional, precio al cliente.
- Invoice: numero, cliente, orden, subtotal, impuestos, total, estado.
- Usuario: rol, acceso y permisos.
- Evento de historial: alta, cambio de datos, recepcion, servicio, cierre, invoice o nota relevante.

## Estados Operativos

Estados sugeridos para una orden:

- recibido
- revisando
- en_trabajo
- pruebas
- listo
- entregado
- cancelado

## Reglas Criticas

1. El sistema debe advertir antes de repetir un servicio reciente.
2. La oficina debe poder ver lo que el mecanico hizo sin esperar papel.
3. Una orden cerrada debe dejar lista la informacion para invoice.
4. El cliente no debe ver costos internos.
5. El historial del vehiculo debe funcionar como "acta de nacimiento".
6. La solucion debe poder operar local-first o con respaldo en nube.
7. Los roles deben limitar informacion sensible.
8. QuickBooks no es parte del MVP, pero el diseno debe permitir integrarlo despues.
9. La partida de nacimiento debe poder enriquecerse con datos tecnicos de vPIC/NHTSA cuando exista VIN.
10. Cada registro de vehiculo debe incluir una foto principal obligatoria del auto/unidad en el MVP.
11. Cada vehiculo/unidad debe poder tener un QR unico vinculado a su registro local.
12. El QR debe permitir al mecanico abrir rapidamente la ficha, historial y carga de nuevo servicio.

## Reglas de Duplicado

Borrador inicial:

- Comparar por vehiculo y tipo de servicio.
- Para SmogCheck, revisar una ventana de 3 meses y bloquear si el servicio se intenta antes de la fecha permitida por el sistema.
- Para otros servicios, mostrar advertencia configurable segun historial y tipo de servicio.
- Si hay coincidencia, mostrar alerta con fecha, servicio, mecanico y resultado anterior.
- Permitir continuar solo con autorizacion de admin y razon de excepcion cuando aplique.

Pendiente de confirmar:

- Ventana exacta por tipo de servicio.
- Si la regla aplica por placa, VIN, numero de unidad, o combinacion.
- La lista cerrada de servicios del MVP y sus ventanas exactas.

## Integraciones Planeadas

MVP:

- OCR manual o semiautomatico para placa, si el presupuesto/API aun no esta listo.
- vPIC/NHTSA por VIN cuando exista VIN disponible.
- Foto principal obligatoria guardada localmente para el MVP.
- Generacion/asignacion de QR usando el generador propio disponible para el MVP.
- PDF o registro de invoice basico.

Referencia tecnica: la API oficial vPIC de NHTSA permite consultar datos de vehiculos y especificaciones, incluyendo endpoints de decodificacion VIN con formato `json`.

Fases posteriores:

- Google Vision para lectura de placa.
- Twilio para SMS/WhatsApp.
- Stripe para pagos.
- Resend para email.
- QuickBooks para sincronizacion contable.
- Claude/agents para contabilidad, cumplimiento y mantenimiento.

## No Objetivos Del Primer MVP

- No construir white-label SaaS completo.
- No automatizar QuickBooks en la primera version.
- No depender de OCR perfecto para demostrar el flujo.
- No crear agentes autonomos antes de que existan datos confiables.

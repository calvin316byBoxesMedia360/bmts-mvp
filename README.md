# BMTS Planificacion y Workflow

Repositorio de trabajo para planificar, documentar y construir el MVP del sistema digital de Beto's Mobile & Truck Services (BMTS).

## Objetivo

Crear una plataforma operativa para reemplazar papel, hojas sueltas y herramientas desconectadas por un flujo unico para:

- clientes y flotas
- vehiculos y unidades
- ordenes de trabajo
- historial por vehiculo
- prevencion de servicios duplicados
- facturacion e invoices
- recordatorios de cumplimiento
- portal simple para clientes

## Estado Actual

Fecha de arranque documental: 2026-05-25.

Se revisaron estos materiales base:

- `BMTS_Admin_Guide.html`
- `BMTS_Tech_Stack.html`
- tres transcripciones DOCX de reuniones del 2026-05-18
- `habilidades-agentes-main.zip`

El repositorio externo de habilidades `calvin316byBoxesMedia360/habilidades-agentes` no estuvo accesible por GitHub desde esta sesion, pero el ZIP local permitio revisar el contenido.

## Lectura Ejecutiva

BMTS necesita empezar por un MVP muy operativo, no por una plataforma completa. La prioridad real detectada es evitar trabajo duplicado y perdida de cobros en flotas, especialmente cuando el mecanico trabaja en campo y la oficina se entera despues.

El primer producto debe demostrar:

1. Registrar cliente, flota, unidad y vehiculo.
2. Crear orden de trabajo desde oficina o campo.
3. Ver historial del vehiculo antes de iniciar trabajo.
4. Detectar duplicados por ventana de tiempo y tipo de servicio.
5. Cerrar orden y generar datos base de invoice.
6. Mantener memoria semanal del avance y decisiones.

## Documentos del Proyecto

- [Contrato del sistema](docs/system_contract.md)
- [Alcance MVP](docs/mvp_scope.md)
- [Memoria viva](docs/memoria.md)
- [Preguntas antes de construir](docs/preguntas_pre_mvp.md)
- [Inventario de habilidades de agentes](docs/agent_skills_inventory.md)
- [Registro de implementacion](docs/implementation_log.md)
- [Estrategia OCR](docs/ocr_strategy.md)
- [Captura Remotion inicial](docs/remotion_captures/2026-05-25_capture.json)
- [Brief Remotion inicial](docs/remotion_briefs/2026-05-25_remotion_brief.md)
- [Reporte HTML del proyecto](docs/project_report.html)

## Regla de Trabajo

Antes de escribir codigo funcional del sistema, deben resolverse las preguntas de `docs/preguntas_pre_mvp.md` o marcarse explicitamente como supuestos temporales.

## MVP Local

La primera aplicacion funcional vive en `app/`.

Para ejecutarla:

```powershell
cd app
npm start
```

Luego abrir `http://localhost:4173`.

Tambien se puede iniciar desde la raiz con:

```powershell
.\start_bmts_mvp.ps1
```

## Habilidad Del Proyecto

Se agrego una habilidad local para documentar avances y preparar presentaciones Remotion:

- [bmts-remotion-progress](skills/bmts-remotion-progress/SKILL.md)

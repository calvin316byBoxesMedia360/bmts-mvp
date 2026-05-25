import argparse
import json
from pathlib import Path


def read_text(path):
    path = Path(path)
    if not path.exists():
        return ""
    return path.read_text(encoding="utf-8", errors="ignore")


def bullet(items):
    if not items:
        return "- Pendiente"
    return "\n".join(f"- {item}" for item in items)


def screenshot_lines(items):
    if not items:
        return "- PENDING_SCREENSHOT: capturas aun no registradas"
    lines = []
    for item in items:
        label = item.get("label", "Screenshot")
        path = item.get("path", "PENDING_SCREENSHOT")
        description = item.get("description", "")
        lines.append(f"- {label}: `{path}`")
        if description:
            lines.append(f"  Nota: {description}")
    return "\n".join(lines)


def build_brief(capture, memoria, implementation):
    title = capture.get("title", "BMTS Progress Update")
    date = capture.get("date", "")
    version = capture.get("version", "")
    audience = capture.get("audience", "BMTS")
    summary = capture.get("summary", "")

    return f"""# {title}

Fecha: {date}
Version: {version}
Audiencia: {audience}

## Objetivo

Documentar visualmente el avance del proyecto BMTS para que el equipo entienda que se construyo, por que importa y que sigue.

## Resumen

{summary or "Pendiente de resumen."}

## Escenas Remotion Sugeridas

### 1. Contexto Del Problema

Mostrar el problema operativo: historial disperso, duplicados, papel y dificultad para cargar servicios rapidamente.

Texto en pantalla:

- BMTS necesita una memoria viva por vehiculo.
- El QR conecta el auto fisico con su historial digital.

### 2. Avance De Esta Version

Datos destacados:

{bullet(capture.get("data_highlights", []))}

### 3. Demo Flow

{bullet(capture.get("demo_flow", []))}

### 4. Capturas Y Assets

{screenshot_lines(capture.get("screenshots", []))}

### 5. Decisiones Confirmadas

{bullet(capture.get("decisions", []))}

### 6. Limitaciones

{bullet(capture.get("limitations", []))}

### 7. Siguientes Pasos

{bullet(capture.get("next_steps", []))}

## Notas De Narracion

- Explicar cada pantalla en lenguaje de taller, no lenguaje tecnico.
- Conectar cada funcion con un dolor real: evitar duplicados, guardar historial, acelerar servicio, preparar invoice.
- Mostrar QR como puente entre vehiculo fisico y sistema.

## Extracto De Memoria Del Proyecto

```text
{memoria[-1800:] if memoria else "Sin memoria disponible."}
```

## Extracto De Implementacion

```text
{implementation[-1800:] if implementation else "Sin implementation_log disponible."}
```
"""


def main():
    parser = argparse.ArgumentParser(description="Build a BMTS Remotion presentation brief from a capture manifest.")
    parser.add_argument("capture_json", help="Path to capture manifest JSON")
    parser.add_argument("--project-root", default=".", help="BMTS project root")
    parser.add_argument("--out", help="Output Markdown path")
    args = parser.parse_args()

    root = Path(args.project_root).resolve()
    capture_path = Path(args.capture_json).resolve()
    capture = json.loads(capture_path.read_text(encoding="utf-8"))

    memoria = read_text(root / "docs" / "memoria.md")
    implementation = read_text(root / "docs" / "implementation_log.md")
    brief = build_brief(capture, memoria, implementation)

    if args.out:
      out = Path(args.out).resolve()
    else:
      slug = capture.get("date", "undated")
      out = root / "docs" / "remotion_briefs" / f"{slug}_remotion_brief.md"

    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(brief, encoding="utf-8")
    print(out)


if __name__ == "__main__":
    main()

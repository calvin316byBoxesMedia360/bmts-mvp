# BMTS Remotion Capture Schema

Use this schema for files in `docs/remotion_captures/`.

```json
{
  "date": "2026-05-25",
  "version": "MVP Local 0.1",
  "title": "BMTS MVP progress update",
  "summary": "Short description of what changed.",
  "audience": "BMTS owners and office team",
  "screenshots": [
    {
      "label": "Dashboard",
      "path": "C:/absolute/path/to/screenshot.png",
      "description": "What the viewer should notice."
    }
  ],
  "data_highlights": [
    "1 client pilot: Community Tree Service",
    "1 demo vehicle with QR token"
  ],
  "decisions": [
    "Web-first MVP",
    "Local photo storage"
  ],
  "demo_flow": [
    "Create vehicle birth record",
    "Assign QR",
    "Open history",
    "Attempt blocked SmogCheck"
  ],
  "limitations": [
    "QR image generation pending"
  ],
  "next_steps": [
    "Connect BM360 QR generator"
  ]
}
```

Rules:

- Use absolute paths for screenshots and media.
- Keep `demo_flow` in the order the presentation should show.
- Use `PENDING_SCREENSHOT` as the path when a screenshot still needs to be captured.
- Do not include client-private data unless the presentation is explicitly internal.

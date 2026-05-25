---
name: bmts-remotion-progress
description: Capture BMTS project screenshots, milestone data, decisions, and app states, then prepare structured briefs for Remotion presentations. Use when documenting BMTS progress visually, creating update videos, collecting MVP screenshots/data, turning implementation logs into presentation scenes, or preparing assets for a Remotion deck/video.
---

# BMTS Remotion Progress

## Overview

Use this skill to turn BMTS project progress into a repeatable presentation package for Remotion: screenshots, captions, milestones, decisions, demo flow, and scene notes.

The goal is not to make the final video directly every time. The goal is to maintain clean source material so BMTS can understand how the system evolves.

## Workflow

1. Capture the current project state.
2. Register screenshots and relevant data in a capture manifest.
3. Summarize what changed since the last presentation.
4. Build a Remotion-ready brief with scenes, narration notes, on-screen text, and asset paths.
5. Save the brief under `docs/remotion_briefs/`.

## Capture Sources

Use these project files first:

- `docs/memoria.md` for decisions and context.
- `docs/implementation_log.md` for implementation milestones.
- `docs/mvp_scope.md` for current scope.
- `docs/project_report.html` for executive status.
- `app/data/db.json` for local MVP sample data.
- `app/data/uploads/` for vehicle photos.
- Browser screenshots of `http://localhost:4173` when the MVP is running.

## Capture Manifest

Keep capture records under:

```text
docs/remotion_captures/
```

Use `references/capture_schema.md` when creating or updating a manifest.

Recommended manifest filename:

```text
docs/remotion_captures/YYYY-MM-DD_capture.json
```

Each capture should include:

- date
- version label
- summary
- screenshots with absolute paths
- app data highlights
- decisions made
- demo flow steps
- known limitations

## Remotion Brief

Generate briefs under:

```text
docs/remotion_briefs/
```

Use `scripts/build_remotion_brief.py` to create a Markdown brief from a capture manifest and project docs.

Briefs should include:

- title
- audience
- objective
- scene list
- screenshot references
- suggested narration
- on-screen text
- data points to visualize
- next milestones

## Presentation Style

For BMTS, keep presentations practical and clear:

- Show the actual system, not abstract decoration.
- Explain business value in plain Spanish.
- Use short captions and concrete before/after examples.
- Highlight how each feature reduces duplicated work, missing history, or missed invoices.
- Include QR, vehicle photo, vPIC/NHTSA data, SmogCheck blocking, and history growth when relevant.

## When Screenshots Are Missing

If screenshots are unavailable, still create the brief and mark each missing visual as `PENDING_SCREENSHOT`. Do not invent screenshot paths.

## Quality Gate

Before finishing a presentation package:

- Confirm every referenced local asset path exists.
- Confirm the brief mentions the current MVP version/date.
- Confirm the scenes tell a simple story: problem, new capability, demo proof, next step.
- Record any missing captures as explicit pending items.

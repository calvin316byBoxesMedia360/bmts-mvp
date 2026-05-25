import json
import re
import sys
from pathlib import Path


VIN_RE = re.compile(r"[A-HJ-NPR-Z0-9]{17}")


def clean_vin(text):
    # Remove common prefixes/labels as words to prevent them from gluing into the VIN
    cleaned = re.sub(r"\b(VIN|I\.D\.|ID|IDENTIFICATION|NUMBER|NO)\b", "", text, flags=re.IGNORECASE)
    normalized = re.sub(r"[^A-Z0-9]", "", cleaned.upper())
    normalized = normalized.replace("I", "").replace("O", "").replace("Q", "")
    match = VIN_RE.search(normalized)
    return match.group(0) if match else ""


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"ok": False, "error": "Image path required"}))
        return 2

    image_path = Path(sys.argv[1])
    if not image_path.exists():
        print(json.dumps({"ok": False, "error": "Image not found"}))
        return 2

    # Resize image if it exceeds 1500px on any side to optimize PP-OCR detection
    try:
        from PIL import Image
        with Image.open(image_path) as img:
            width, height = img.size
            if max(width, height) > 1500:
                img.thumbnail((1500, 1500))
                img.convert("RGB").save(image_path, "JPEG", quality=85)
    except Exception as exc:
        pass

    try:
        from paddleocr import PaddleOCR
    except Exception as exc:
        print(json.dumps({
            "ok": False,
            "error": "PaddleOCR is not installed in this environment.",
            "detail": str(exc),
            "recommendedProvider": "PaddleOCR",
            "fallbackProvider": "Google Vision API"
        }))
        return 1

    # VIN photos are close-up text crops; skip document orientation/unwarping
    # models to keep inference lighter and avoid unnecessary cache permissions.
    ocr = PaddleOCR(
        use_doc_orientation_classify=False,
        use_doc_unwarping=False,
        use_textline_orientation=False,
        lang="en",
    )
    result = ocr.predict(str(image_path))
    texts = []
    for page in result or []:
        if isinstance(page, dict):
            for key in ("rec_texts", "texts"):
                values = page.get(key)
                if values:
                    texts.extend(str(value) for value in values)
        elif hasattr(page, "json"):
            data = page.json
            if callable(data):
                data = data()
            if isinstance(data, dict):
                values = data.get("rec_texts") or data.get("texts") or []
                texts.extend(str(value) for value in values)
        else:
            texts.append(str(page))

    raw_text = " ".join(texts)
    vin = clean_vin(raw_text)
    print(json.dumps({
        "ok": bool(vin),
        "vin": vin,
        "rawText": raw_text,
        "provider": "PaddleOCR"
    }))
    return 0 if vin else 3


if __name__ == "__main__":
    raise SystemExit(main())

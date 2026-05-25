const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawn } = require("node:child_process");

const PORT = Number(process.env.PORT || 4173);
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_DIR = path.join(ROOT, "data");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
const DB_FILE = path.join(DATA_DIR, "db.json");
const OCR_SCRIPT = path.join(ROOT, "scripts", "ocr_vin_paddle.py");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml"
};

async function ensureStorage() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  try {
    await fs.access(DB_FILE);
  } catch {
    await fs.writeFile(DB_FILE, JSON.stringify({
      clients: [{
        id: "client-community-tree",
        name: "Community Tree Service",
        type: "fleet",
        contactName: "",
        phone: "",
        email: ""
      }],
      vehicles: [],
      workOrders: [],
      invoices: [],
      historyEvents: []
    }, null, 2));
  }
}

async function readDb() {
  await ensureStorage();
  return JSON.parse(await fs.readFile(DB_FILE, "utf8"));
}

async function writeDb(db) {
  await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2));
}

function send(res, status, body, type = "application/json; charset=utf-8") {
  res.writeHead(status, { "content-type": type });
  res.end(typeof body === "string" ? body : JSON.stringify(body));
}

function notFound(res) {
  send(res, 404, { error: "No encontrado" });
}

function newId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function newQrToken() {
  return `bmts_${crypto.randomBytes(12).toString("hex")}`;
}

function toPublicUploadPath(fileName) {
  return `/uploads/${fileName}`;
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  return JSON.parse(raw);
}

function addHistory(db, vehicleId, type, title, detail = {}) {
  const event = {
    id: newId("event"),
    vehicleId,
    type,
    title,
    detail,
    createdAt: new Date().toISOString()
  };
  db.historyEvents.unshift(event);
  return event;
}

async function saveImage(dataUrl, fileStem, requiredMessage = "La imagen es obligatoria.") {
  if (!dataUrl) {
    if (requiredMessage) throw new Error(requiredMessage);
    return "";
  }
  if (!dataUrl.startsWith("data:image/")) {
    throw new Error("Formato de imagen no soportado.");
  }
  const match = dataUrl.match(/^data:(image\/(png|jpeg|jpg|webp));base64,(.+)$/);
  if (!match) throw new Error("Formato de imagen no soportado.");
  const ext = match[2] === "jpeg" ? "jpg" : match[2];
  const fileName = `${fileStem}.${ext}`;
  await fs.writeFile(path.join(UPLOAD_DIR, fileName), Buffer.from(match[3], "base64"));
  return toPublicUploadPath(fileName);
}

async function savePhoto(dataUrl, vehicleId) {
  return saveImage(dataUrl, vehicleId, "La foto principal es obligatoria.");
}

function getSmogBlock(vehicle, serviceType, requestedDate) {
  if (serviceType !== "SmogCheck") return null;
  const nextDue = vehicle.nextSmogCheckDue;
  if (!nextDue) return null;
  const requested = new Date(requestedDate || new Date().toISOString().slice(0, 10));
  const due = new Date(nextDue);
  if (requested < due) {
    return {
      blocked: true,
      message: `SmogCheck bloqueado. Proxima fecha permitida: ${nextDue}.`,
      nextAllowedDate: nextDue
    };
  }
  return null;
}

function nextSmogDate(dateString) {
  const date = new Date(dateString);
  date.setMonth(date.getMonth() + 3);
  return date.toISOString().slice(0, 10);
}

function runPaddleVinOcr(imagePath) {
  return new Promise((resolve) => {
    const python = process.env.BMTS_PYTHON || "python";
    const ocrCacheHome = process.env.BMTS_OCR_CACHE_HOME || path.join(ROOT, ".paddlex_runtime");
    const ocrHome = process.env.BMTS_OCR_HOME || path.join(ROOT, ".home_runtime");
    const ocrCache = process.env.BMTS_OCR_APP_CACHE || path.join(ROOT, ".cache_runtime");
    const child = spawn(python, [OCR_SCRIPT, imagePath], {
      windowsHide: true,
      env: {
        ...process.env,
        PADDLE_PDX_CACHE_HOME: ocrCacheHome,
        HF_HOME: path.join(ocrCache, "huggingface"),
        MODELSCOPE_CACHE: path.join(ocrCache, "modelscope"),
        HOME: ocrHome,
        USERPROFILE: ocrHome,
        FLAGS_use_mkldnn: process.env.FLAGS_use_mkldnn || "0",
        FLAGS_use_onednn: process.env.FLAGS_use_onednn || "0"
      }
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("close", (code) => {
      try {
        const parsed = JSON.parse(stdout || "{}");
        resolve({ code, ...parsed, stderr });
      } catch {
        resolve({ ok: false, code, error: "OCR response could not be parsed.", stdout, stderr });
      }
    });
  });
}

async function api(req, res, url) {
  const db = await readDb();

  if (req.method === "GET" && url.pathname === "/api/state") {
    send(res, 200, db);
    return;
  }

  if (req.method === "GET" && url.pathname.startsWith("/api/nhtsa/")) {
    const vin = decodeURIComponent(url.pathname.replace("/api/nhtsa/", "")).trim();
    if (!vin) {
      send(res, 400, { error: "VIN requerido" });
      return;
    }
    try {
      const endpoint = `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended/${encodeURIComponent(vin)}?format=json`;
      const response = await fetch(endpoint);
      const body = await response.json();
      send(res, 200, body);
    } catch (error) {
      send(res, 502, { error: "No se pudo consultar vPIC/NHTSA", detail: error.message });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/ocr/status") {
    send(res, 200, {
      provider: "PaddleOCR",
      python: process.env.BMTS_PYTHON || "python",
      cacheHome: process.env.BMTS_OCR_CACHE_HOME || path.join(ROOT, ".paddlex_runtime"),
      home: process.env.BMTS_OCR_HOME || path.join(ROOT, ".home_runtime"),
      status: "configured"
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/vin-photo/recognize") {
    const input = await readJson(req);
    if (!input.vinPhotoDataUrl) {
      send(res, 400, { error: "Foto del VIN requerida." });
      return;
    }
    let vinPhotoPath = "";
    try {
      const fileName = `vin_ocr_${crypto.randomUUID()}`;
      const publicPath = await saveImage(input.vinPhotoDataUrl, fileName, "Foto del VIN requerida.");
      vinPhotoPath = path.join(UPLOAD_DIR, path.basename(publicPath));
    } catch (error) {
      send(res, 400, { error: error.message });
      return;
    }

    const result = await runPaddleVinOcr(vinPhotoPath);
    if (result.code !== 0 && result.code !== 3) {
      send(res, 501, {
        error: result.error || "PaddleOCR no pudo ejecutarse.",
        provider: "PaddleOCR",
        fallbackProvider: "Google Vision API",
        detail: result.detail || result.stderr || "",
        nextStep: "Instalar PaddleOCR localmente o conectar Google Vision como fallback."
      });
      return;
    }
    send(res, 200, {
      ok: result.ok,
      vin: result.vin || "",
      rawText: result.rawText || "",
      provider: result.provider || "PaddleOCR",
      error: result.ok ? null : "No se detectó un VIN de 17 caracteres en la imagen."
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/vehicles") {
    const input = await readJson(req);
    const required = ["clientId", "unitNumber", "plate", "vin", "photoDataUrl"];
    const missing = required.filter((key) => !input[key]);
    if (missing.length) {
      send(res, 400, { error: `Faltan datos obligatorios: ${missing.join(", ")}` });
      return;
    }

    const vehicleId = newId("vehicle");
    let photoUrl;
    let vinPhotoUrl = "";
    try {
      photoUrl = await savePhoto(input.photoDataUrl, vehicleId);
      vinPhotoUrl = await saveImage(input.vinPhotoDataUrl, `${vehicleId}_vin`, "");
    } catch (error) {
      send(res, 400, { error: error.message });
      return;
    }

    const qrToken = input.qrToken || newQrToken();
    const vehicle = {
      id: vehicleId,
      clientId: input.clientId,
      unitNumber: input.unitNumber.trim(),
      plate: input.plate.trim().toUpperCase(),
      vin: input.vin.trim().toUpperCase(),
      make: input.make || "",
      model: input.model || "",
      year: input.year || "",
      bodyClass: input.bodyClass || "",
      engine: input.engine || "",
      manufacturer: input.manufacturer || "",
      vehicleType: input.vehicleType || "",
      fuelType: input.fuelType || "",
      gvwr: input.gvwr || "",
      driveType: input.driveType || "",
      plant: input.plant || "",
      nhtsaErrorText: input.nhtsaErrorText || "",
      notes: input.notes || "",
      photoUrl,
      vinPhotoUrl,
      qrToken,
      qrValue: `/v/${qrToken}`,
      nextSmogCheckDue: input.nextSmogCheckDue || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.vehicles.unshift(vehicle);
    addHistory(db, vehicle.id, "birth_record", "Partida de nacimiento creada", {
      unitNumber: vehicle.unitNumber,
      plate: vehicle.plate,
      vin: vehicle.vin,
      qrToken: vehicle.qrToken
    });
    addHistory(db, vehicle.id, "qr_assigned", "QR asignado al vehiculo", {
      qrValue: vehicle.qrValue
    });
    await writeDb(db);
    send(res, 201, { vehicle, db });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/work-orders") {
    const input = await readJson(req);
    const vehicle = db.vehicles.find((item) => item.id === input.vehicleId);
    if (!vehicle) {
      send(res, 404, { error: "Vehiculo no encontrado" });
      return;
    }

    const block = getSmogBlock(vehicle, input.serviceType, input.requestedDate);
    if (block && !input.adminOverride) {
      send(res, 409, {
        error: block.message,
        duplicatePolicy: block
      });
      return;
    }
    if (block && input.adminOverride && !input.overrideReason) {
      send(res, 400, { error: "La razon de autorizacion admin es obligatoria." });
      return;
    }

    const now = new Date().toISOString();
    const workOrder = {
      id: newId("wo"),
      vehicleId: vehicle.id,
      serviceType: input.serviceType,
      status: "recibido",
      requestedDate: input.requestedDate || now.slice(0, 10),
      notes: input.notes || "",
      labor: input.labor || "",
      parts: input.parts || "",
      adminOverride: Boolean(input.adminOverride),
      overrideReason: input.overrideReason || "",
      createdAt: now,
      updatedAt: now,
      completedAt: ""
    };

    db.workOrders.unshift(workOrder);
    addHistory(db, vehicle.id, "work_order_created", `Orden creada: ${workOrder.serviceType}`, {
      workOrderId: workOrder.id,
      status: workOrder.status,
      adminOverride: workOrder.adminOverride
    });
    await writeDb(db);
    send(res, 201, { workOrder, db });
    return;
  }

  const statusMatch = url.pathname.match(/^\/api\/work-orders\/([^/]+)\/status$/);
  if (req.method === "PATCH" && statusMatch) {
    const input = await readJson(req);
    const workOrder = db.workOrders.find((item) => item.id === statusMatch[1]);
    if (!workOrder) {
      send(res, 404, { error: "Orden no encontrada" });
      return;
    }
    workOrder.status = input.status;
    workOrder.updatedAt = new Date().toISOString();
    if (input.status === "entregado") {
      workOrder.completedAt = workOrder.updatedAt;
      const vehicle = db.vehicles.find((item) => item.id === workOrder.vehicleId);
      if (vehicle && workOrder.serviceType === "SmogCheck") {
        vehicle.nextSmogCheckDue = nextSmogDate(workOrder.completedAt);
        vehicle.updatedAt = workOrder.updatedAt;
      }
    }
    addHistory(db, workOrder.vehicleId, "status_changed", `Estado actualizado: ${input.status}`, {
      workOrderId: workOrder.id
    });
    await writeDb(db);
    send(res, 200, { workOrder, db });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/invoices") {
    const input = await readJson(req);
    const workOrder = db.workOrders.find((item) => item.id === input.workOrderId);
    if (!workOrder) {
      send(res, 404, { error: "Orden no encontrada" });
      return;
    }
    const invoice = {
      id: newId("inv"),
      invoiceNumber: `BMTS-${String(db.invoices.length + 1).padStart(4, "0")}`,
      workOrderId: workOrder.id,
      vehicleId: workOrder.vehicleId,
      status: "borrador",
      subtotal: Number(input.subtotal || 0),
      tax: Number(input.tax || 0),
      total: Number(input.total || 0),
      internalNotes: input.internalNotes || "",
      clientNotes: input.clientNotes || "",
      createdAt: new Date().toISOString()
    };
    db.invoices.unshift(invoice);
    addHistory(db, workOrder.vehicleId, "invoice_created", `Invoice creado: ${invoice.invoiceNumber}`, {
      invoiceId: invoice.id,
      total: invoice.total
    });
    await writeDb(db);
    send(res, 201, { invoice, db });
    return;
  }

  notFound(res);
}

async function serveStatic(req, res, url) {
  if (url.pathname.startsWith("/uploads/")) {
    const filePath = path.join(UPLOAD_DIR, path.basename(url.pathname));
    const ext = path.extname(filePath).toLowerCase();
    try {
      const file = await fs.readFile(filePath);
      res.writeHead(200, { "content-type": MIME[ext] || "application/octet-stream" });
      res.end(file);
    } catch {
      notFound(res);
    }
    return;
  }

  const requested = url.pathname === "/" || url.pathname.startsWith("/v/")
    ? "index.html"
    : url.pathname.slice(1);
  const filePath = path.normalize(path.join(PUBLIC_DIR, requested));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    notFound(res);
    return;
  }
  try {
    const ext = path.extname(filePath).toLowerCase();
    const file = await fs.readFile(filePath);
    res.writeHead(200, { "content-type": MIME[ext] || "application/octet-stream" });
    res.end(file);
  } catch {
    notFound(res);
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname.startsWith("/api/")) {
      await api(req, res, url);
      return;
    }
    await serveStatic(req, res, url);
  } catch (error) {
    send(res, 500, { error: "Error interno", detail: error.message });
  }
});

ensureStorage().then(() => {
  server.listen(PORT, () => {
    console.log(`BMTS MVP listo en http://localhost:${PORT}`);
  });
});

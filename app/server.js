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

const bcrypt = require("bcryptjs");

const sessions = {};

function parseCookies(req) {
  const list = {};
  const rc = req.headers.cookie;
  if (rc) {
    rc.split(';').forEach((cookie) => {
      const parts = cookie.split('=');
      list[parts.shift().trim()] = decodeURI(parts.join('='));
    });
  }
  return list;
}

async function ensureUsers(db) {
  if (!db.users) db.users = [];
  if (db.users.length === 0) {
    const adminPass = process.env.ADMIN_DEFAULT_PASS || "BetoBmts2026!";
    const mechPass = process.env.MECH_DEFAULT_PASS || "BmtsField2026!";
    const adminHash = await bcrypt.hash(adminPass, 10);
    const mechHash = await bcrypt.hash(mechPass, 10);
    db.users.push({
      id: newId("user"),
      username: process.env.ADMIN_DEFAULT_USER || "beto_admin",
      passwordHash: adminHash,
      role: "admin",
      name: "Beto (Administrador)",
      createdAt: new Date().toISOString()
    });
    db.users.push({
      id: newId("user"),
      username: process.env.MECH_DEFAULT_USER || "mechanic_hollister",
      passwordHash: mechHash,
      role: "mechanic",
      name: "Mecánico de Campo",
      createdAt: new Date().toISOString()
    });
    await writeDb(db);
    console.log("Usuarios por defecto sembrados.");
  }
}

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
      historyEvents: [],
      users: []
    }, null, 2));
  }
  const db = JSON.parse(await fs.readFile(DB_FILE, "utf8"));
  await ensureUsers(db);
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
  if (req.body) return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  req.body = JSON.parse(raw);
  return req.body;
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

async function getPythonExecutable() {
  if (process.env.BMTS_PYTHON) {
    return process.env.BMTS_PYTHON;
  }
  // Try Windows virtualenv
  const winVenv = path.join(ROOT, ".venv", "Scripts", "python.exe");
  try {
    await fs.access(winVenv);
    return winVenv;
  } catch {}
  // Try Linux/macOS virtualenv
  const nixVenv = path.join(ROOT, ".venv", "bin", "python");
  try {
    await fs.access(nixVenv);
    return nixVenv;
  } catch {}
  // Fallback to global python
  return "python";
}

async function runPaddleVinOcr(imagePath) {
  const python = await getPythonExecutable();
  return new Promise((resolve) => {
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
    child.on("error", (err) => {
      resolve({ ok: false, code: -1, error: `Failed to spawn Python process: ${err.message}`, stderr: err.stack });
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

  // 1. LOGIN API
  if (req.method === "POST" && url.pathname === "/api/auth/login") {
    const input = await readJson(req);
    if (!input.username || !input.password) {
      send(res, 400, { error: "Usuario y contraseña obligatorios." });
      return;
    }
    const user = db.users.find(u => u.username === input.username.trim());
    if (!user) {
      send(res, 401, { error: "Usuario o contraseña incorrectos." });
      return;
    }
    const match = await bcrypt.compare(input.password, user.passwordHash);
    if (!match) {
      send(res, 401, { error: "Usuario o contraseña incorrectos." });
      return;
    }
    
    const token = crypto.randomBytes(24).toString("hex");
    sessions[token] = {
      userId: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 Hours
    };
    
    res.writeHead(200, {
      "Set-Cookie": `bmts_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`,
      "Content-Type": "application/json; charset=utf-8"
    });
    res.end(JSON.stringify({ user: { username: user.username, role: user.role, name: user.name } }));
    return;
  }

  // 2. LOGOUT API
  if (req.method === "POST" && url.pathname === "/api/auth/logout") {
    const cookies = parseCookies(req);
    const token = cookies.bmts_session;
    if (token && sessions[token]) {
      delete sessions[token];
    }
    res.writeHead(200, {
      "Set-Cookie": "bmts_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0",
      "Content-Type": "application/json; charset=utf-8"
    });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // 3. GET SESSION STATUS
  if (req.method === "GET" && url.pathname === "/api/auth/session") {
    const cookies = parseCookies(req);
    const token = cookies.bmts_session;
    const session = token ? sessions[token] : null;
    if (!session || session.expiresAt < Date.now()) {
      if (token && session) delete sessions[token];
      send(res, 401, { error: "No autenticado" });
      return;
    }
    send(res, 200, { user: { username: session.username, role: session.role, name: session.name } });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/state") {
    send(res, 200, db);
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/simulate/fleet") {
    db.vehicles = [];
    db.workOrders = [];
    db.invoices = [];
    db.historyEvents = [];
    
    if (!db.clients || db.clients.length === 0) {
      db.clients = [{
        id: "client-community-tree",
        name: "Community Tree Service",
        type: "fleet",
        contactName: "",
        phone: "",
        email: ""
      }];
    }
    
    const client = db.clients[0];
    const clientId = client.id;
    
    const truckSpecs = [
      { unit: "CT-389", make: "Peterbilt", model: "389", year: "2021", body: "Heavy Duty Tractor", engine: "Cummins X15 15.0L", fuel: "Diesel", gvwr: "Class 8: 33,001 lb or more", drive: "6x4", plant: "DENTON, TEXAS, UNITED STATES", smogDue: "2026-08-15" },
      { unit: "CT-680", make: "Kenworth", model: "T680", year: "2022", body: "Heavy Duty Tractor", engine: "PACCAR MX-13 12.9L", fuel: "Diesel", gvwr: "Class 8: 33,001 lb or more", drive: "6x4", plant: "CHILLICOTHE, OHIO, UNITED STATES", smogDue: "2026-07-20" },
      { unit: "CT-550", make: "Ford", model: "F-550", year: "2020", body: "Chassis Cab", engine: "Power Stroke V8 6.7L", fuel: "Diesel", gvwr: "Class 5: 16,001 - 19,500 lb", drive: "4x4", plant: "KENTUCKY TRUCK, KENTUCKY, UNITED STATES", smogDue: "2026-05-10" },
      { unit: "CT-114", make: "Freightliner", model: "Cascadia", year: "2019", body: "Heavy Duty Tractor", engine: "Detroit DD15 14.8L", fuel: "Diesel", gvwr: "Class 8: 33,001 lb or more", drive: "6x4", plant: "CLEVELAND, NORTH CAROLINA, UNITED STATES", smogDue: "2026-09-01" },
      { unit: "CT-268", make: "Hino", model: "268", year: "2018", body: "Medium Duty Box", engine: "Hino J08E 7.7L", fuel: "Diesel", gvwr: "Class 6: 19,501 - 26,000 lb", drive: "4x2", plant: "WILLIAMSTOWN, WEST VIRGINIA, UNITED STATES", smogDue: "2026-06-15" },
      { unit: "CT-579", make: "Peterbilt", model: "579", year: "2023", body: "Heavy Duty Tractor", engine: "PACCAR MX-13 12.9L", fuel: "Diesel", gvwr: "Class 8: 33,001 lb or more", drive: "6x4", plant: "DENTON, TEXAS, UNITED STATES", smogDue: "2026-08-30" },
      { unit: "CT-750", make: "Ford", model: "F-750", year: "2021", body: "Dump Truck", engine: "Power Stroke V8 6.7L", fuel: "Diesel", gvwr: "Class 7: 26,001 - 33,000 lb", drive: "4x2", plant: "OHIO ASSEMBLY, OHIO, UNITED STATES", smogDue: "2026-06-01" },
      { unit: "CT-900", make: "Kenworth", model: "W900", year: "2017", body: "Heavy Duty Tractor", engine: "Cummins X15 15.0L", fuel: "Diesel", gvwr: "Class 8: 33,001 lb or more", drive: "6x4", plant: "CHILLICOTHE, OHIO, UNITED STATES", smogDue: "2026-05-25" },
      { unit: "CT-607", make: "International", model: "MV607", year: "2020", body: "Medium Duty Stake Bed", engine: "Cummins B6.7 6.7L", fuel: "Diesel", gvwr: "Class 6: 19,501 - 26,000 lb", drive: "4x2", plant: "SPRINGFIELD, OHIO, UNITED STATES", smogDue: "2026-07-05" },
      { unit: "CT-800", make: "Mack", model: "Anthem", year: "2022", body: "Heavy Duty Tractor", engine: "Mack MP8 13.0L", fuel: "Diesel", gvwr: "Class 8: 33,001 lb or more", drive: "6x4", plant: "MACUNGIE, PENNSYLVANIA, UNITED STATES", smogDue: "2026-09-15" },
      { unit: "CT-300", make: "Isuzu", model: "NRR", year: "2019", body: "Low Cab Forward Box", engine: "Isuzu 4HK1-TC 5.2L", fuel: "Diesel", gvwr: "Class 5: 16,001 - 19,500 lb", drive: "4x2", plant: "CHARLOTTE, NORTH CAROLINA, UNITED STATES", smogDue: "2026-06-10" },
      { unit: "CT-760", make: "Volvo", model: "VNL", year: "2021", body: "Heavy Duty Tractor", engine: "Volvo D13 12.8L", fuel: "Diesel", gvwr: "Class 8: 33,001 lb or more", drive: "6x4", plant: "DUBLIN, VIRGINIA, UNITED STATES", smogDue: "2026-10-01" },
      { unit: "CT-337", make: "Peterbilt", model: "337", year: "2018", body: "Service Utility Truck", engine: "PACCAR PX-7 6.7L", fuel: "Diesel", gvwr: "Class 7: 26,001 - 33,000 lb", drive: "4x2", plant: "STE-THERESE, QUEBEC, CANADA", smogDue: "2026-06-20" },
      { unit: "CT-450", make: "Ford", model: "F-450", year: "2020", body: "Flatbed", engine: "Power Stroke V8 6.7L", fuel: "Diesel", gvwr: "Class 4: 14,001 - 16,000 lb", drive: "4x4", plant: "KENTUCKY TRUCK, KENTUCKY, UNITED STATES", smogDue: "2026-07-15" },
      { unit: "CT-5500", make: "Ram", model: "5500", year: "2022", body: "Chassis Cab Flatbed", engine: "Cummins 6.7L I6 Turbo Diesel", fuel: "Diesel", gvwr: "Class 5: 16,001 - 19,500 lb", drive: "4x4", plant: "SALTILLO, MEXICO", smogDue: "2026-08-10" }
    ];
    
    for (let i = 0; i < truckSpecs.length; i++) {
      const spec = truckSpecs[i];
      const vehicleId = `vehicle_sim_${i + 1}`;
      const qrToken = `bmts_sim_qr_${i + 1}_${crypto.randomBytes(4).toString("hex")}`;
      
      const vehicle = {
        id: vehicleId,
        clientId: clientId,
        unitNumber: spec.unit,
        plate: `CA-${spec.unit.replace("-", "")}`,
        vin: `1XP${spec.make[0]}${spec.model[0]}49X${i}ND${String(100000 + i * 5000)}`,
        make: spec.make.toUpperCase(),
        model: spec.model,
        year: spec.year,
        bodyClass: spec.body,
        engine: spec.engine,
        manufacturer: `${spec.make.toUpperCase()} TRUCKS`,
        vehicleType: "TRUCK",
        fuelType: spec.fuel,
        gvwr: spec.gvwr,
        driveType: spec.drive,
        plant: spec.plant,
        nhtsaErrorText: "0 - VIN decoded clean. Check Digit is correct",
        notes: "Vehículo de la simulación de flota comercial.",
        photoUrl: "/uploads/vehicle_c1157f3f-64b8-43aa-aa0f-4dedee353171.png",
        vinPhotoUrl: "/uploads/vehicle_c1157f3f-64b8-43aa-aa0f-4dedee353171_vin.jpg",
        qrToken: qrToken,
        qrValue: `/v/${qrToken}`,
        nextSmogCheckDue: spec.smogDue,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      db.vehicles.push(vehicle);
      
      addHistory(db, vehicle.id, "birth_record", "Partida de nacimiento creada (Simulación)", {
        unitNumber: vehicle.unitNumber,
        plate: vehicle.plate,
        vin: vehicle.vin,
        qrToken: vehicle.qrToken
      });
      addHistory(db, vehicle.id, "qr_assigned", "QR asignado y pegado en la ventana", {
        qrValue: vehicle.qrValue
      });
      
      if (spec.unit === "CT-389") {
        const woId = `wo_sim_389_1`;
        const completedDate = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        db.workOrders.push({
          id: woId,
          vehicleId: vehicleId,
          serviceType: "SmogCheck",
          status: "entregado",
          requestedDate: completedDate,
          notes: "Inspección de Smog de rutina en Hollister, CA",
          labor: "2 horas de diagnóstico y test de gases",
          parts: "Ninguna",
          adminOverride: false,
          overrideReason: "",
          createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          completedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
        });
        
        db.invoices.push({
          id: `inv_sim_389`,
          invoiceNumber: "BMTS-SIM-0001",
          workOrderId: woId,
          vehicleId: vehicleId,
          status: "pagada",
          subtotal: 150,
          tax: 12,
          total: 162,
          internalNotes: "Pagado por cheque corporativo",
          clientNotes: "Gracias por su preferencia",
          createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
        });
        
        addHistory(db, vehicleId, "work_order_created", "Orden creada: SmogCheck", { workOrderId: woId, status: "recibido" });
        addHistory(db, vehicleId, "status_changed", "Estado actualizado: entregado", { workOrderId: woId });
        addHistory(db, vehicleId, "invoice_created", "Invoice creado: BMTS-SIM-0001", { invoiceId: `inv_sim_389`, total: 162 });
        
        vehicle.nextSmogCheckDue = nextSmogDate(completedDate);
      }
      
      if (spec.unit === "CT-680") {
        const woId = `wo_sim_680_1`;
        db.workOrders.push({
          id: woId,
          vehicleId: vehicleId,
          serviceType: "Cambio de aceite",
          status: "en_trabajo",
          requestedDate: new Date().toISOString().slice(0, 10),
          notes: "Servicio de lubricación de motor de servicio pesado y reemplazo de filtros.",
          labor: "Filtros de aceite y combustible nuevos",
          parts: "10 Galones de Aceite Premium 15W-40, Filtro de Aceite Baldwin",
          adminOverride: false,
          overrideReason: "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          completedAt: ""
        });
        
        addHistory(db, vehicleId, "work_order_created", "Orden creada: Cambio de aceite", { workOrderId: woId, status: "recibido" });
        addHistory(db, vehicleId, "status_changed", "Estado actualizado: en_trabajo", { workOrderId: woId });
      }
      
      if (spec.unit === "CT-550") {
        const woId = `wo_sim_550_1`;
        db.workOrders.push({
          id: woId,
          vehicleId: vehicleId,
          serviceType: "Asistencia en carretera",
          status: "listo",
          requestedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          notes: "El camión se quedó sin batería en CA-152. Se auxilió y recargó alternador.",
          labor: "2 horas de asistencia técnica y traslado a carretera",
          parts: "Batería Motorcraft Group 65, alternador reacondicionado",
          adminOverride: false,
          overrideReason: "",
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          completedAt: ""
        });
        
        addHistory(db, vehicleId, "work_order_created", "Orden creada: Asistencia en carretera", { workOrderId: woId, status: "recibido" });
        addHistory(db, vehicleId, "status_changed", "Estado actualizado: en_trabajo", { workOrderId: woId });
        addHistory(db, vehicleId, "status_changed", "Estado actualizado: listo", { workOrderId: woId });
      }
      
      if (spec.unit === "CT-114") {
        const woId1 = `wo_sim_114_1`;
        const woId2 = `wo_sim_114_2`;
        const date1 = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const date2 = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        
        db.workOrders.push({
          id: woId1,
          vehicleId: vehicleId,
          serviceType: "Cambio de aceite",
          status: "entregado",
          requestedDate: date1,
          notes: "Servicio de lubricación estándar",
          labor: "1.5 horas",
          parts: "Aceite 15W-40, filtro",
          adminOverride: false,
          overrideReason: "",
          createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          completedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
        });
        
        db.workOrders.push({
          id: woId2,
          vehicleId: vehicleId,
          serviceType: "Reemplazo de alternador",
          status: "entregado",
          requestedDate: date2,
          notes: "El alternador original falló.",
          labor: "3 horas",
          parts: "Alternador Delco Remy 39SI",
          adminOverride: false,
          overrideReason: "",
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
        });
        
        addHistory(db, vehicleId, "work_order_created", "Orden creada: Cambio de aceite", { workOrderId: woId1, status: "recibido" });
        addHistory(db, vehicleId, "status_changed", "Estado actualizado: entregado", { workOrderId: woId1 });
        addHistory(db, vehicleId, "work_order_created", "Orden creada: Reemplazo de alternador", { workOrderId: woId2, status: "recibido" });
        addHistory(db, vehicleId, "status_changed", "Estado actualizado: entregado", { workOrderId: woId2 });
      }
    }
    
    await writeDb(db);
    send(res, 200, { ok: true, message: "Flota de 15 camiones simulada con éxito." });
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
      send(res, 200, {
        ok: false,
        vin: "",
        provider: "PaddleOCR",
        error: "El lector OCR de VIN no está disponible en la nube (límite de memoria en hosting gratuito). Escribe o pega el VIN manualmente."
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

  if (req.method === "POST" && url.pathname === "/api/invoices/batch") {
    const input = await readJson(req);
    if (!input.workOrderIds || !input.workOrderIds.length) {
      send(res, 400, { error: "Se requiere al menos una orden de trabajo." });
      return;
    }
    const orders = db.workOrders.filter(item => input.workOrderIds.includes(item.id));
    if (orders.length !== input.workOrderIds.length) {
      send(res, 400, { error: "Una o más órdenes no existen." });
      return;
    }
    const firstOrder = orders[0];
    const invoice = {
      id: newId("inv"),
      invoiceNumber: `BMTS-BATCH-${String(db.invoices.length + 1).padStart(4, "0")}`,
      workOrderIds: input.workOrderIds,
      workOrderId: firstOrder.id,
      vehicleId: firstOrder.vehicleId,
      status: "borrador",
      subtotal: Number(input.subtotal || 0),
      tax: Number(input.tax || 0),
      total: Number(input.total || 0),
      internalNotes: input.internalNotes || "Factura de lote consolidada",
      clientNotes: input.clientNotes || "",
      createdAt: new Date().toISOString()
    };
    db.invoices.unshift(invoice);
    
    const distinctVehicleIds = [...new Set(orders.map(o => o.vehicleId))];
    for (const vId of distinctVehicleIds) {
      addHistory(db, vId, "invoice_created", `Invoice de lote creado: ${invoice.invoiceNumber}`, {
        invoiceId: invoice.id,
        total: invoice.total,
        batchCount: orders.length
      });
    }
    
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
    const headers = { "content-type": MIME[ext] || "application/octet-stream" };
    if (ext === ".html" || ext === ".js" || ext === ".css") {
      headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0";
      headers["Pragma"] = "no-cache";
      headers["Expires"] = "0";
    }
    res.writeHead(200, headers);
    res.end(file);
  } catch {
    notFound(res);
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    // 1. Bypass auth check for login endpoint and static files
    if (url.pathname === "/api/auth/login" || !url.pathname.startsWith("/api/")) {
      if (url.pathname.startsWith("/api/")) {
        await api(req, res, url);
        return;
      }
      await serveStatic(req, res, url);
      return;
    }
    
    // 2. Session verification for all other API endpoints
    const cookies = parseCookies(req);
    const token = cookies.bmts_session;
    const session = token ? sessions[token] : null;
    
    if (!session || session.expiresAt < Date.now()) {
      if (token && session) delete sessions[token];
      send(res, 401, { error: "No autenticado. Por favor inicia sesión." });
      return;
    }
    
    // Attach session metadata to request
    req.session = session;
    
    // 3. Admin-Only Endpoint Protection checks
    const isAdminOnlyRoute = 
      (req.method === "POST" && (url.pathname === "/api/invoices" || url.pathname === "/api/invoices/batch")) ||
      (req.method === "POST" && url.pathname === "/api/rules");
      
    if (isAdminOnlyRoute && req.session.role !== "admin") {
      send(res, 403, { error: "Acceso denegado. Se requieren permisos de Administrador." });
      return;
    }
    
    // 4. Role restrictions for order completion (patching status to "entregado")
    const statusMatch = url.pathname.match(/^\/api\/work-orders\/([^/]+)\/status$/);
    if (req.method === "PATCH" && statusMatch) {
      const input = await readJson(req);
      if (input.status === "entregado" && req.session.role !== "admin") {
        send(res, 403, { error: "Acceso denegado. Solo administradores pueden finalizar órdenes y facturar." });
        return;
      }
    }
    
    await api(req, res, url);
  } catch (error) {
    send(res, 500, { error: "Error interno", detail: error.message });
  }
});

ensureStorage().then(() => {
  server.listen(PORT, () => {
    console.log(`BMTS MVP listo en http://localhost:${PORT}`);
  });
});

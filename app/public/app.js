const state = {
  db: null,
  selectedVehicleId: "",
  routeQrToken: location.pathname.startsWith("/v/") ? location.pathname.replace("/v/", "") : ""
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const today = new Date().toISOString().slice(0, 10);
$("input[name='requestedDate']").value = today;

function setMessage(id, text, kind = "") {
  const node = $(id);
  node.textContent = text;
  node.className = `message ${kind}`.trim();
}

function normalizeVin(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .replace(/[IOQ]/g, "");
}

function updateVinValidation() {
  const input = $("#vehicleForm").vin;
  const clean = normalizeVin(input.value);
  if (input.value !== clean) input.value = clean;
  const node = $("#vinValidation");
  if (!clean) {
    node.textContent = "VIN pendiente";
    node.className = "vin-validation";
  } else if (clean.length === 17) {
    node.textContent = "VIN listo para vPIC";
    node.className = "vin-validation ok";
  } else {
    node.textContent = `VIN incompleto: ${clean.length}/17`;
    node.className = "vin-validation error";
  }
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "content-type": "application/json" },
    ...options
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error || "Error inesperado");
    error.data = data;
    throw error;
  }
  return data;
}

async function loadState() {
  state.db = await api("/api/state");
  if (state.routeQrToken) {
    const match = state.db.vehicles.find((vehicle) => vehicle.qrToken === state.routeQrToken);
    if (match) state.selectedVehicleId = match.id;
  }
  if (!state.selectedVehicleId && state.db.vehicles[0]) {
    state.selectedVehicleId = state.db.vehicles[0].id;
  }
  render();
}

function selectedVehicle() {
  return state.db?.vehicles.find((vehicle) => vehicle.id === state.selectedVehicleId);
}

function vehicleEvents(vehicleId) {
  return state.db.historyEvents.filter((event) => event.vehicleId === vehicleId);
}

function vehicleOrders(vehicleId) {
  return state.db.workOrders.filter((order) => order.vehicleId === vehicleId);
}

function vehicleInvoices(vehicleId) {
  return state.db.invoices.filter((invoice) => invoice.vehicleId === vehicleId);
}

function render() {
  renderVehicles();
  renderVehicleCard();
  renderHistory();
  renderOrders();
  renderInvoices();
  renderCompliance();
  renderBatchInvoicing();
}

function renderVehicles() {
  const list = $("#vehicleList");
  const search = $("#searchInput").value.trim().toLowerCase();
  const vehicles = state.db.vehicles.filter((vehicle) => {
    const blob = [vehicle.unitNumber, vehicle.plate, vehicle.vin, vehicle.qrToken, vehicle.make, vehicle.model].join(" ").toLowerCase();
    return blob.includes(search);
  });
  $("#vehicleCount").textContent = `${state.db.vehicles.length} unidades`;
  list.innerHTML = "";
  if (!vehicles.length) {
    list.innerHTML = `<p class="message">No hay unidades registradas todavia.</p>`;
    return;
  }
  for (const vehicle of vehicles) {
    const button = document.createElement("button");
    button.className = `vehicle-item ${vehicle.id === state.selectedVehicleId ? "active" : ""}`;
    button.innerHTML = `
      <strong>${vehicle.unitNumber || "Sin unidad"} · ${vehicle.plate}</strong>
      <span>${vehicle.year || ""} ${vehicle.make || ""} ${vehicle.model || ""}</span>
      <span>QR: ${vehicle.qrToken}</span>
    `;
    button.addEventListener("click", () => {
      state.selectedVehicleId = vehicle.id;
      render();
    });
    list.appendChild(button);
  }
}

function renderVehicleCard() {
  const card = $("#vehicleCard");
  const vehicle = selectedVehicle();
  if (!vehicle) {
    card.className = "panel vehicle-card empty";
    card.innerHTML = `<h2>Selecciona o crea una unidad</h2><p>La ficha mostrara foto, datos tecnicos, QR asignado y estado de SmogCheck.</p>`;
    return;
  }
  const template = $("#vehicleCardTemplate").content.cloneNode(true);
  $(".vehicle-photo", template).src = vehicle.photoUrl;
  $(".vehicle-photo", template).alt = `Foto de ${vehicle.unitNumber}`;
  $("h2", template).textContent = `${vehicle.unitNumber} · ${vehicle.plate}`;
  const dl = $("dl", template);
  const rows = [
      ["VIN", vehicle.vin],
      ["Foto VIN", vehicle.vinPhotoUrl ? "Guardada" : "No registrada"],
      ["Vehiculo", `${vehicle.year || ""} ${vehicle.make || ""} ${vehicle.model || ""}`.trim()],
      ["Carroceria", vehicle.bodyClass || "Pendiente"],
      ["Motor", vehicle.engine || "Pendiente"],
      ["Combustible", vehicle.fuelType || "Pendiente"],
      ["GVWR", vehicle.gvwr || "Pendiente"],
      ["Traccion", vehicle.driveType || "Pendiente"],
      ["Fabricante", vehicle.manufacturer || "Pendiente"],
      ["Tipo", vehicle.vehicleType || "Pendiente"],
      ["Planta", vehicle.plant || "Pendiente"],
      ["Proximo SmogCheck", vehicle.nextSmogCheckDue || "Sin fecha asignada"],
      ["Alta", new Date(vehicle.createdAt).toLocaleString()]
  ];
  dl.innerHTML = rows.map(([label, value]) => `<dt>${label}</dt><dd>${value || "Pendiente"}</dd>`).join("");
  const qrUrl = `${location.origin}${vehicle.qrValue}`;
  $("code", template).textContent = qrUrl;
  $("a", template).href = vehicle.qrValue;
  $("a", template).textContent = "Simular escaneo";
  card.className = "panel vehicle-card";
  card.innerHTML = "";
  card.appendChild(template);

  const scASection = $("#scenarioASection", card);
  if (scASection) {
    const scA = $("#toggleScenarioA").checked;
    scASection.style.display = scA ? "block" : "none";
    if (scA) {
      const select = $("#stickerLayoutSelect", card);
      const wrapper = $("#stickerPreviewWrapper", card);
      const downloadBtn = $("#downloadStickerBtn", card);
      
      const renderSticker = () => {
        const svgStr = generateStickerSVG(select.value, vehicle.unitNumber, vehicle.plate, vehicle.vin, vehicle.qrValue);
        wrapper.innerHTML = svgStr;
      };
      
      renderSticker();
      select.addEventListener("change", renderSticker);
      downloadBtn.addEventListener("click", () => {
        const svgStr = generateStickerSVG(select.value, vehicle.unitNumber, vehicle.plate, vehicle.vin, vehicle.qrValue).trim();
        const blob = new Blob([svgStr], {type: 'image/svg+xml'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `BMTS_Sticker_${vehicle.unitNumber || 'unit'}_${select.value}.svg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    }
  }
}

function renderHistory() {
  const vehicle = selectedVehicle();
  const list = $("#historyList");
  if (!vehicle) {
    $("#historyCount").textContent = "0 eventos";
    list.innerHTML = `<p class="message">Selecciona una unidad.</p>`;
    return;
  }
  const events = vehicleEvents(vehicle.id);
  $("#historyCount").textContent = `${events.length} eventos`;
  list.innerHTML = events.length ? "" : `<p class="message">Sin historial todavia.</p>`;
  for (const event of events) {
    const node = document.createElement("article");
    node.className = "event";
    node.innerHTML = `
      <strong>${event.title}</strong>
      <p>${event.type}</p>
      <time>${new Date(event.createdAt).toLocaleString()}</time>
    `;
    list.appendChild(node);
  }
}

function renderOrders() {
  const vehicle = selectedVehicle();
  const list = $("#orderList");
  const invoiceSelect = $("#invoiceForm select[name='workOrderId']");
  invoiceSelect.innerHTML = "";
  if (!vehicle) {
    $("#orderCount").textContent = "0";
    list.innerHTML = `<p class="message">Selecciona una unidad.</p>`;
    return;
  }
  const orders = vehicleOrders(vehicle.id);
  $("#orderCount").textContent = String(orders.length);
  list.innerHTML = orders.length ? "" : `<p class="message">Sin ordenes.</p>`;
  const completed = orders.filter((order) => order.status === "entregado");
  invoiceSelect.innerHTML = completed.map((order) => `<option value="${order.id}">${order.serviceType} · ${order.requestedDate}</option>`).join("");
  for (const order of orders) {
    const node = document.createElement("article");
    node.className = "order-card";
    node.innerHTML = `
      <strong>${order.serviceType}</strong>
      <p>Estado: <b>${order.status}</b></p>
      <small>${order.requestedDate}</small>
      ${order.adminOverride ? `<p class="message error">Excepcion admin: ${order.overrideReason}</p>` : ""}
      <div class="status-controls">
        ${["recibido", "revisando", "en_trabajo", "listo", "entregado"].map((status) => {
          const isActive = order.status === status;
          return `<button class="${isActive ? 'active' : ''}" data-status="${status}" data-id="${order.id}">${status}</button>`;
        }).join("")}
      </div>
    `;
    list.appendChild(node);
  }
  $$("[data-status]", list).forEach((button) => {
    button.addEventListener("click", async () => {
      const data = await api(`/api/work-orders/${button.dataset.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: button.dataset.status })
      });
      state.db = data.db;
      render();
    });
  });
}

function renderInvoices() {
  const vehicle = selectedVehicle();
  const list = $("#invoiceList");
  if (!vehicle) {
    $("#invoiceCount").textContent = "0";
    list.innerHTML = `<p class="message">Selecciona una unidad.</p>`;
    return;
  }
  const invoices = vehicleInvoices(vehicle.id);
  $("#invoiceCount").textContent = String(invoices.length);
  list.innerHTML = invoices.length ? "" : `<p class="message">Sin invoices.</p>`;
  for (const invoice of invoices) {
    const node = document.createElement("article");
    node.className = "order-card";
    node.innerHTML = `
      <strong>${invoice.invoiceNumber}</strong>
      <p>Total: $${invoice.total.toFixed(2)} · Estado: ${invoice.status}</p>
      <small>${new Date(invoice.createdAt).toLocaleString()}</small>
    `;
    list.appendChild(node);
  }
}

async function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function fillVehicleFormFromNhtsa(result) {
  const form = $("#vehicleForm");
  const row = result?.Results?.[0];
  if (!row) return false;
  form.year.value = row.ModelYear || "";
  form.make.value = row.Make || "";
  form.model.value = row.Model || "";
  form.bodyClass.value = row.BodyClass || "";
  form.engine.value = [row.EngineConfiguration, row.EngineCylinders ? `${row.EngineCylinders} cyl` : "", row.DisplacementL ? `${row.DisplacementL}L` : ""].filter(Boolean).join(" ");
  form.fuelType.value = row.FuelTypePrimary || "";
  form.gvwr.value = row.GVWR || "";
  form.driveType.value = row.DriveType || "";
  form.manufacturer.value = row.Manufacturer || "";
  form.vehicleType.value = row.VehicleType || "";
  form.plant.value = [row.PlantCity, row.PlantState, row.PlantCountry].filter(Boolean).join(", ");
  form.nhtsaErrorText.value = row.ErrorText || "";
  const summary = $("#nhtsaSummary");
  const hasWarning = row.ErrorCode && row.ErrorCode !== "0";
  summary.className = `nhtsa-summary ${hasWarning ? "warn" : "ok"}`;
  summary.textContent = hasWarning
    ? `vPIC/NHTSA cargo datos con aviso: ${row.ErrorText || "revisar VIN"}`
    : `vPIC/NHTSA cargo: ${row.ModelYear || ""} ${row.Make || ""} ${row.Model || ""} ${row.VehicleType || ""}`.trim();
  return true;
}

$("#decodeVinBtn").addEventListener("click", async () => {
  updateVinValidation();
  const vin = $("#vehicleForm").vin.value.trim();
  if (!vin) {
    setMessage("#vehicleFormMsg", "Escribe un VIN antes de consultar vPIC.", "error");
    return;
  }
  if (vin.length !== 17) {
    setMessage("#vehicleFormMsg", "El VIN debe tener 17 caracteres validos antes de consultar vPIC.", "error");
    return;
  }
  setMessage("#vehicleFormMsg", "Consultando vPIC/NHTSA...");
  try {
    const data = await api(`/api/nhtsa/${encodeURIComponent(vin)}`);
    fillVehicleFormFromNhtsa(data);
    setMessage("#vehicleFormMsg", "Datos tecnicos cargados desde vPIC/NHTSA.", "ok");
  } catch (error) {
    setMessage("#vehicleFormMsg", error.message, "error");
  }
});

$("#pasteVinBtn").addEventListener("click", async () => {
  try {
    const text = await navigator.clipboard.readText();
    $("#vehicleForm").vin.value = normalizeVin(text);
    updateVinValidation();
    if ($("#vehicleForm").vin.value.length === 17) {
      $("#decodeVinBtn").click();
    } else {
      setMessage("#vehicleFormMsg", "VIN pegado desde portapapeles.", "ok");
    }
  } catch {
    setMessage("#vehicleFormMsg", "No pude leer el portapapeles. Pega con Ctrl+V en el campo VIN.", "error");
  }
});

$("#vehicleForm").vin.addEventListener("input", updateVinValidation);

$("#vehicleForm").vinPhoto.addEventListener("change", async (event) => {
  const file = event.currentTarget.files[0];
  const preview = $("#vinPhotoPreview");
  if (!file) {
    preview.textContent = "Sin foto VIN";
    return;
  }
  const dataUrl = await fileToDataUrl(file);
  preview.innerHTML = `<img src="${dataUrl}" alt="Foto del VIN">`;
});

$("#readVinPhotoBtn").addEventListener("click", async () => {
  const form = $("#vehicleForm");
  const file = form.vinPhoto.files[0];
  if (!file) {
    setMessage("#vehicleFormMsg", "Primero carga una foto del VIN.", "error");
    return;
  }
  setMessage("#vehicleFormMsg", "Leyendo VIN con PaddleOCR...");
  try {
    const vinPhotoDataUrl = await fileToDataUrl(file);
    const result = await api("/api/vin-photo/recognize", {
      method: "POST",
      body: JSON.stringify({ vinPhotoDataUrl })
    });
    
    const scD = $("#toggleScenarioD").checked;
    if (scD) {
      $("#ocrCalibrationModal").style.display = "flex";
      $("#calibrationImage").src = vinPhotoDataUrl;
      $("#ocrRawText").value = result.rawText || (result.vin ? `VIN: ${result.vin}` : "No text detected");
      
      const proposedVin = normalizeVin(result.vin || result.rawText || "");
      $("#ocrProposedVin").value = proposedVin;
      
      const validateProposed = () => {
        const valNode = $("#ocrVinValidation");
        const clean = normalizeVin($("#ocrProposedVin").value);
        $("#ocrProposedVin").value = clean;
        if (clean.length === 17) {
          valNode.textContent = "VIN listo (17 caracteres)";
          valNode.className = "vin-validation ok";
        } else {
          valNode.textContent = `VIN incompleto: ${clean.length}/17`;
          valNode.className = "vin-validation error";
        }
      };
      
      $("#ocrProposedVin").oninput = validateProposed;
      validateProposed();
      
      $("#confirmOcrVinBtn").onclick = () => {
        const cleanVin = normalizeVin($("#ocrProposedVin").value);
        if (cleanVin.length !== 17) {
          alert("Por favor corrige el VIN para que tenga exactamente 17 caracteres.");
          return;
        }
        $("#ocrCalibrationModal").style.display = "none";
        form.vin.value = cleanVin;
        updateVinValidation();
        setMessage("#vehicleFormMsg", "VIN calibrado y confirmado.", "ok");
        $("#decodeVinBtn").click();
      };
      
      setMessage("#vehicleFormMsg", "OCR completado. Calibración requerida.", "ok");
    } else {
      if (result.ok && result.vin) {
        form.vin.value = normalizeVin(result.vin);
        updateVinValidation();
        setMessage("#vehicleFormMsg", `VIN detectado con ${result.provider}. Consultando vPIC...`, "ok");
        setTimeout(() => {
          $("#decodeVinBtn").click();
        }, 50);
      } else {
        setMessage("#vehicleFormMsg", result.error || "No se detectó un VIN de 17 caracteres en la foto. Intenta con otra foto o escribe el VIN manualmente.", "error");
      }
    }
  } catch (error) {
    setMessage("#vehicleFormMsg", `${error.message} Puedes pegar o escribir el VIN mientras conectamos OCR.`, "error");
  }
});

$("#vehicleForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const photo = form.photo.files[0];
  const vinPhoto = form.vinPhoto.files[0];
  updateVinValidation();
  if (form.vin.value.trim().length !== 17) {
    setMessage("#vehicleFormMsg", "El VIN debe tener 17 caracteres validos.", "error");
    return;
  }
  if (!photo) {
    setMessage("#vehicleFormMsg", "La foto principal es obligatoria.", "error");
    return;
  }
  setMessage("#vehicleFormMsg", "Creando partida...");
  try {
    const photoDataUrl = await fileToDataUrl(photo);
    const vinPhotoDataUrl = vinPhoto ? await fileToDataUrl(vinPhoto) : "";
    const data = await api("/api/vehicles", {
      method: "POST",
      body: JSON.stringify({
        clientId: "client-community-tree",
        unitNumber: form.unitNumber.value,
        plate: form.plate.value,
        vin: form.vin.value,
        year: form.year.value,
        make: form.make.value,
        model: form.model.value,
        bodyClass: form.bodyClass.value,
        engine: form.engine.value,
        manufacturer: form.manufacturer.value,
        vehicleType: form.vehicleType.value,
        fuelType: form.fuelType.value,
        gvwr: form.gvwr.value,
        driveType: form.driveType.value,
        plant: form.plant.value,
        nhtsaErrorText: form.nhtsaErrorText.value,
        nextSmogCheckDue: form.nextSmogCheckDue.value,
        notes: form.notes.value,
        photoDataUrl,
        vinPhotoDataUrl
      })
    });
    state.db = data.db;
    state.selectedVehicleId = data.vehicle.id;
    form.reset();
    $("#vinPhotoPreview").textContent = "Sin foto VIN";
    updateVinValidation();
    setMessage("#vehicleFormMsg", "Partida creada con QR asignado.", "ok");
    render();
  } catch (error) {
    setMessage("#vehicleFormMsg", error.message, "error");
  }
});

$("#orderForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const vehicle = selectedVehicle();
  if (!vehicle) {
    setMessage("#orderFormMsg", "Selecciona una unidad primero.", "error");
    return;
  }
  const form = event.currentTarget;
  
  const scB = $("#toggleScenarioB").checked;
  if (scB) {
    const rules = JSON.parse(localStorage.getItem("bmts_rules") || '{"smog":3, "oil":30, "roadside":7}');
    const orders = vehicleOrders(vehicle.id);
    const requested = new Date(form.requestedDate.value);
    let dupOrder = null;
    let windowText = "";
    
    for (const o of orders) {
      if (o.serviceType === form.serviceType.value) {
        const prevDate = new Date(o.requestedDate);
        const diffTime = Math.abs(requested - prevDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (o.serviceType === "Cambio de aceite" && diffDays <= rules.oil) {
          dupOrder = o;
          windowText = `${rules.oil} días`;
          break;
        } else if (o.serviceType === "Asistencia en carretera" && diffDays <= rules.roadside) {
          dupOrder = o;
          windowText = `${rules.roadside} días`;
          break;
        } else if (o.serviceType === "SmogCheck" && diffDays <= rules.smog * 30) {
          dupOrder = o;
          windowText = `${rules.smog} meses`;
          break;
        } else if (o.serviceType !== "Cambio de aceite" && o.serviceType !== "Asistencia en carretera" && o.serviceType !== "SmogCheck" && diffDays <= 15) {
          dupOrder = o;
          windowText = "15 días";
          break;
        }
      }
    }
    
    if (dupOrder) {
      if (!form.adminOverride.checked) {
        setMessage("#orderFormMsg", `Advertencia: Se detectó un servicio de ${form.serviceType.value} reciente (${dupOrder.requestedDate}) dentro del umbral de ${windowText}. Requiere autorización admin.`, "error");
        return;
      } else if (!form.overrideReason.value.trim()) {
        setMessage("#orderFormMsg", "Se requiere ingresar justificación de la excepción para continuar.", "error");
        return;
      }
    }
  }

  setMessage("#orderFormMsg", "Creando orden...");
  try {
    const data = await api("/api/work-orders", {
      method: "POST",
      body: JSON.stringify({
        vehicleId: vehicle.id,
        serviceType: form.serviceType.value,
        requestedDate: form.requestedDate.value,
        notes: form.notes.value,
        labor: form.labor.value,
        parts: form.parts.value,
        adminOverride: form.adminOverride.checked,
        overrideReason: form.overrideReason.value
      })
    });
    state.db = data.db;
    form.reset();
    form.requestedDate.value = today;
    setMessage("#orderFormMsg", "Orden creada.", "ok");
    render();
  } catch (error) {
    setMessage("#orderFormMsg", error.message, "error");
  }
});

$("#invoiceForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.workOrderId.value) {
    setMessage("#invoiceFormMsg", "Primero debe existir una orden entregada.", "error");
    return;
  }
  try {
    const data = await api("/api/invoices", {
      method: "POST",
      body: JSON.stringify({
        workOrderId: form.workOrderId.value,
        subtotal: form.subtotal.value,
        tax: form.tax.value,
        total: form.total.value,
        internalNotes: form.internalNotes.value,
        clientNotes: form.clientNotes.value
      })
    });
    state.db = data.db;
    form.reset();
    setMessage("#invoiceFormMsg", "Invoice creado.", "ok");
    render();
  } catch (error) {
    setMessage("#invoiceFormMsg", error.message, "error");
  }
});

$$(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    $$(".tab").forEach((item) => item.classList.remove("active"));
    $$(".view").forEach((item) => item.classList.remove("active"));
    tab.classList.add("active");
    $(`#${tab.dataset.view}View`).classList.add("active");
  });
});

$("#searchInput").addEventListener("input", renderVehicles);
$("#refreshBtn").addEventListener("click", loadState);
$("#printBtn").addEventListener("click", () => window.print());

// Sandbox functions
function onSandboxTogglesUpdated() {
  const scA = $("#toggleScenarioA").checked;
  const scB = $("#toggleScenarioB").checked;
  const scC = $("#toggleScenarioC").checked;
  const scD = $("#toggleScenarioD").checked;
  
  // A: Live Sticker QR Section
  const card = $("#vehicleCard");
  const scASection = $("#scenarioASection", card);
  if (scASection) {
    scASection.style.display = scA ? "block" : "none";
  }
  
  // B: Compliance Tab Switcher
  const compBtn = $("#complianceTabBtn");
  if (compBtn) {
    compBtn.style.display = scB ? "block" : "none";
    if (!scB && compBtn.classList.contains("active")) {
      compBtn.classList.remove("active");
      $("#complianceView").classList.remove("active");
      $(".tab[data-view='birth']").classList.add("active");
      $("#birthView").classList.add("active");
    }
  }
  
  // C: Batch Invoicing UI Elements
  const batchBar = $("#batchInvoiceActionContainer");
  if (batchBar) {
    batchBar.style.display = scC ? "block" : "none";
    if (!scC) {
      $("#batchInvoicePanel").style.display = "none";
      $("#invoiceForm").style.display = "grid";
    }
  }

  if (state.db) render();
}

function generateStickerSVG(layout, unitNumber, plate, vin, qrUrl) {
  const finalQrUrl = `${location.origin}${qrUrl}`;
  if (layout === "racing") {
    return `
      <svg viewBox="0 0 450 600" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" class="font-racing font-bold">
        <defs>
          <pattern id="diagonal-stripes" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="10" height="20" fill="#CCFF00"/>
            <rect x="10" width="10" height="20" fill="#000000"/>
          </pattern>
        </defs>
        <rect x="5" y="5" width="440" height="590" fill="#0D0D11" stroke="#CCFF00" stroke-width="4" rx="4"/>
        <rect x="5" y="5" width="440" height="24" fill="url(#diagonal-stripes)" />
        <rect x="5" y="571" width="440" height="24" fill="url(#diagonal-stripes)" />
        <g transform="translate(50, 60) skewX(-10)">
          <rect x="0" y="0" width="330" height="75" fill="#CCFF00" stroke="#000000" stroke-width="3" />
          <text x="165" y="52" font-family="'Archivo Black', sans-serif" font-size="36" font-weight="900" fill="#000000" text-anchor="middle">BMTS</text>
        </g>
        <text x="225" y="172" font-family="'Barlow Condensed', sans-serif" font-size="20" fill="#E2E8F0" text-anchor="middle" font-weight="800" letter-spacing="4">MOBILITY GROUP</text>
        <text x="225" y="194" font-family="monospace" font-size="11" fill="#71717A" text-anchor="middle">UNIT: ${unitNumber || "N/A"} · PLATE: ${plate || "N/A"}</text>
        <line x1="40" y1="215" x2="410" y2="215" stroke="#CCFF00" stroke-width="2" stroke-dasharray="10 5"/>
        <rect x="125" y="245" width="200" height="200" fill="#FFFFFF" stroke="#CCFF00" stroke-width="4" rx="4"/>
        <g transform="translate(145, 265) scale(3.6)">
          <rect x="0" y="0" width="10" height="10" fill="#000000"/> <rect x="2" y="2" width="6" height="6" fill="#FFFFFF"/> <rect x="3" y="3" width="4" height="4" fill="#000000"/>
          <rect x="30" y="0" width="10" height="10" fill="#000000"/> <rect x="32" y="2" width="6" height="6" fill="#FFFFFF"/> <rect x="33" y="3" width="4" height="4" fill="#000000"/>
          <rect x="0" y="30" width="10" height="10" fill="#000000"/> <rect x="2" y="2" width="6" height="6" fill="#FFFFFF"/> <rect x="3" y="3" width="4" height="4" fill="#000000"/>
          <rect x="12" y="1" width="4" height="3" fill="#000000"/>
          <rect x="18" y="3" width="6" height="2" fill="#000000"/>
          <rect x="26" y="1" width="2" height="7" fill="#000000"/>
          <rect x="3" y="14" width="8" height="6" fill="#000000"/>
          <rect x="15" y="14" width="12" height="12" fill="#000000"/>
          <rect x="30" y="15" width="4" height="4" fill="#000000"/>
          <rect x="11" y="28" width="8" height="4" fill="#000000"/>
          <rect x="23" y="23" width="13" height="13" fill="#000000"/>
          <rect x="17" y="17" width="8" height="8" fill="#CCFF00" stroke="#000000" stroke-width="1.5"/>
          <path d="M 21 19 L 23 23 L 19 23 Z" fill="#000000"/>
        </g>
        <text x="225" y="480" font-family="'Barlow Condensed', sans-serif" font-size="18" fill="#CCFF00" text-anchor="middle" font-weight="900" letter-spacing="1">ESCANEAR PARA ORDEN</text>
        <text x="225" y="502" font-family="'Barlow Condensed', sans-serif" font-size="12" fill="#FFFFFF" text-anchor="middle" font-weight="700">BMTS SYSTEMS STITCH</text>
        <rect x="35" y="525" width="380" height="30" fill="#000000" stroke="#27272A" stroke-width="1.5" rx="3"/>
        <text x="225" y="544" font-family="monospace" font-size="9" fill="#E2E8F0" text-anchor="middle">VIN: ${vin || "N/A"}</text>
      </svg>
    `;
  }
  if (layout === "tech") {
    return `
      <svg viewBox="0 0 450 600" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="saas-grid" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#1f2937" stroke-width="0.5"/>
          </pattern>
        </defs>
        <rect width="450" height="600" fill="#09090B"/>
        <rect width="450" height="600" fill="url(#saas-grid)"/>
        <rect x="25" y="25" width="400" height="550" fill="rgba(17, 24, 39, 0.75)" stroke="#374151" stroke-width="1.5" rx="16"/>
        <g transform="translate(0, 0)">
          <circle cx="225" cy="90" r="28" fill="#18181B" stroke="#D4FF33" stroke-width="1.5"/>
          <path d="M 215 90 L 235 90 M 225 80 L 225 100" stroke="#D4FF33" stroke-width="2" stroke-linecap="round"/>
          <circle cx="225" cy="90" r="12" fill="none" stroke="#D4FF33" stroke-width="1" stroke-dasharray="4 2"/>
          <text x="225" y="145" font-family="'Plus Jakarta Sans', sans-serif" font-size="28" font-weight="800" fill="#FFFFFF" text-anchor="middle" letter-spacing="-0.5">bmts mobility</text>
          <text x="225" y="165" font-family="'Plus Jakarta Sans', sans-serif" font-size="12" fill="#D4FF33" text-anchor="middle" font-weight="600" letter-spacing="2">INTEGRATED LOGISTICS</text>
        </g>
        <line x1="60" y1="195" x2="390" y2="195" stroke="#27272A" stroke-width="1"/>
        <g transform="translate(135, 220)">
          <rect width="180" height="180" fill="#FFFFFF" rx="12"/>
          <g transform="translate(15, 15) scale(3.6)">
            <rect x="0" y="0" width="10" height="10" fill="#09090b"/> <rect x="2" y="2" width="6" height="6" fill="#FFFFFF"/> <rect x="3" y="3" width="4" height="4" fill="#09090b"/>
            <rect x="30" y="0" width="10" height="10" fill="#09090b"/> <rect x="32" y="2" width="6" height="6" fill="#FFFFFF"/> <rect x="33" y="3" width="4" height="4" fill="#09090b"/>
            <rect x="0" y="30" width="10" height="10" fill="#09090b"/> <rect x="2" y="2" width="6" height="6" fill="#FFFFFF"/> <rect x="3" y="3" width="4" height="4" fill="#09090b"/>
            <rect x="12" y="2" width="4" height="4" fill="#09090b"/> <rect x="20" y="4" width="4" height="2" fill="#09090b"/> <rect x="26" y="2" width="2" height="6" fill="#09090b"/>
            <rect x="4" y="12" width="6" height="4" fill="#09090b"/> <rect x="14" y="12" width="10" height="10" fill="#09090b"/> <rect x="28" y="12" width="4" height="4" fill="#09090b"/>
            <rect x="12" y="26" width="6" height="4" fill="#09090b"/> <rect x="24" y="24" width="12" height="12" fill="#09090b"/> <rect x="4" y="26" width="4" height="4" fill="#09090b"/>
            <circle cx="20" cy="20" r="4" fill="#D4FF33"/>
          </g>
        </g>
        <text x="225" y="445" font-family="'Plus Jakarta Sans', sans-serif" font-size="14" fill="#A1A1AA" text-anchor="middle" font-weight="400">Scan unit: ${unitNumber || "N/A"}</text>
        <text x="225" y="468" font-family="'Plus Jakarta Sans', sans-serif" font-size="17" fill="#D4FF33" text-anchor="middle" font-weight="700" letter-spacing="0.5">STITCH DIGITAL VERIFICATION</text>
        <line x1="60" y1="500" x2="390" y2="500" stroke="#27272A" stroke-width="1"/>
        <text x="225" y="528" font-family="monospace" font-size="11" fill="#71717A" text-anchor="middle" letter-spacing="1">VIN: ${vin || "N/A"}</text>
        <text x="225" y="545" font-family="'Plus Jakarta Sans', sans-serif" font-size="9" fill="#52525B" text-anchor="middle">RELIABLE MOBILE FLEET MAINTENANCE</text>
      </svg>
    `;
  }
  if (layout === "cockpit") {
    return `
      <svg viewBox="0 0 450 600" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <rect width="450" height="600" fill="#121214" stroke="#4B5563" stroke-width="4"/>
        <rect x="15" y="15" width="420" height="570" fill="none" stroke="#2D3232" stroke-width="1.5" stroke-dasharray="8 4"/>
        <circle cx="30" cy="30" r="7" fill="#4B5563" stroke="#1F2937" stroke-width="2"/> <line x1="25" y1="30" x2="35" y2="30" stroke="#1F2937" stroke-width="1.5"/>
        <circle cx="420" cy="30" r="7" fill="#4B5563" stroke="#1F2937" stroke-width="2"/> <line x1="415" y1="30" x2="425" y2="30" stroke="#1F2937" stroke-width="1.5"/>
        <circle cx="30" cy="570" r="7" fill="#4B5563" stroke="#1F2937" stroke-width="2"/> <line x1="25" y1="570" x2="35" y2="570" stroke="#1F2937" stroke-width="1.5"/>
        <circle cx="420" cy="570" r="7" fill="#4B5563" stroke="#1F2937" stroke-width="2"/> <line x1="415" y1="570" x2="425" y2="570" stroke="#1F2937" stroke-width="1.5"/>
        <g transform="translate(60, 60)">
          <rect x="0" y="0" width="330" height="85" fill="#1A1A1E" stroke="#4B5563" stroke-width="2" rx="4"/>
          <text x="165" y="38" font-family="'Space Mono', monospace" font-size="22" font-weight="900" fill="#A3E635" text-anchor="middle" letter-spacing="2">BMTS MOBILITY</text>
          <text x="165" y="65" font-family="'Space Mono', monospace" font-size="12" fill="#E5E7EB" text-anchor="middle" font-weight="700" letter-spacing="1">UNIT: ${unitNumber || "N/A"}</text>
        </g>
        <line x1="50" y1="175" x2="400" y2="175" stroke="#374151" stroke-width="1.5"/>
        <g transform="translate(100, 195) scale(0.65)" stroke="#374151" stroke-width="2" fill="none">
          <circle cx="50" cy="50" r="40"/>
          <path d="M 20 80 A 40 40 0 1 1 80 80" stroke="#A3E635" stroke-width="4"/>
          <line x1="50" y1="50" x2="65" y2="25" stroke="#EF4444" stroke-width="3" stroke-linecap="round"/>
          <circle cx="50" cy="50" r="5" fill="#EF4444" stroke="none"/>
          <circle cx="280" cy="50" r="40"/>
          <path d="M 250 80 A 40 40 0 1 1 310 80" stroke="#A3E635" stroke-width="4"/>
          <line x1="280" y1="50" x2="295" y2="35" stroke="#A3E635" stroke-width="3" stroke-linecap="round"/>
          <circle cx="280" cy="50" r="5" fill="#A3E635" stroke="none"/>
        </g>
        <g transform="translate(135, 275)">
          <rect width="180" height="180" fill="#FFFFFF" stroke="#4B5563" stroke-width="3" rx="4"/>
          <g transform="translate(15, 15) scale(3.6)">
            <rect x="0" y="0" width="10" height="10" fill="#121214"/> <rect x="2" y="2" width="6" height="6" fill="#FFFFFF"/> <rect x="3" y="3" width="4" height="4" fill="#121214"/>
            <rect x="30" y="0" width="10" height="10" fill="#121214"/> <rect x="32" y="2" width="6" height="6" fill="#FFFFFF"/> <rect x="33" y="3" width="4" height="4" fill="#121214"/>
            <rect x="0" y="30" width="10" height="10" fill="#121214"/> <rect x="2" y="2" width="6" height="6" fill="#FFFFFF"/> <rect x="3" y="3" width="4" height="4" fill="#121214"/>
            <rect x="12" y="2" width="4" height="4" fill="#121214"/> <rect x="20" y="4" width="4" height="2" fill="#121214"/> <rect x="26" y="2" width="2" height="6" fill="#121214"/>
            <rect x="4" y="12" width="6" height="4" fill="#121214"/> <rect x="14" y="12" width="10" height="10" fill="#121214"/> <rect x="28" y="12" width="4" height="4" fill="#121214"/>
            <rect x="12" y="26" width="6" height="4" fill="#121214"/> <rect x="24" y="24" width="12" height="12" fill="#121214"/> <rect x="4" y="26" width="4" height="4" fill="#121214"/>
            <rect x="16" y="16" width="8" height="8" fill="#A3E635"/>
          </g>
        </g>
        <text x="225" y="490" font-family="'Space Mono', monospace" font-size="14" fill="#A3E635" text-anchor="middle" font-weight="700">[ SCAN PANEL TO CONNECT ]</text>
        <text x="225" y="512" font-family="'Space Mono', monospace" font-size="11" fill="#E5E7EB" text-anchor="middle">STITCH INTERFACE PROTOCOL v1.0</text>
        <line x1="50" y1="535" x2="400" y2="535" stroke="#374151" stroke-width="1.5"/>
        <text x="225" y="555" font-family="monospace" font-size="9" fill="#71717A" text-anchor="middle">VIN: ${vin || "N/A"}</text>
      </svg>
    `;
  }
  return "";
}

function renderCompliance() {
  if (!$("#toggleScenarioB").checked) return;
  const overrides = state.db.workOrders.filter(wo => wo.adminOverride);
  $("#overrideCount").textContent = String(overrides.length);
  
  const tbody = $("#overrideTable tbody");
  tbody.innerHTML = "";
  if (!overrides.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--muted); padding: 16px;">No hay eventos de autorización registrados.</td></tr>`;
    return;
  }
  
  for (const wo of overrides) {
    const vehicle = state.db.vehicles.find(v => v.id === wo.vehicleId);
    const unitPlate = vehicle ? `${vehicle.unitNumber} (${vehicle.plate})` : "N/A";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${unitPlate}</td>
      <td style="color: var(--brand); font-weight: bold;">${wo.serviceType}</td>
      <td>${new Date(wo.createdAt).toLocaleDateString()}</td>
      <td>Admin (Beto)</td>
      <td style="font-size: 11px; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${wo.overrideReason}">${wo.overrideReason || "Sin justificación"}</td>
    `;
    tbody.appendChild(tr);
  }
}

function renderBatchInvoicing() {
  if (!$("#toggleScenarioC").checked) return;
  const container = $("#unbilledOrdersContainer");
  container.innerHTML = "";
  
  const completedUnbilled = state.db.workOrders.filter(wo => {
    if (wo.status !== "entregado") return false;
    return !state.db.invoices.some(inv => inv.workOrderId === wo.id || (inv.workOrderIds && inv.workOrderIds.includes(wo.id)));
  });
  
  if (!completedUnbilled.length) {
    container.innerHTML = `<p class="message" style="padding: 10px; border: 1px dashed rgba(255,255,255,0.05); text-align: center; width: 100%;">No hay órdenes entregadas pendientes de facturar.</p>`;
    $("#batchSubtotal").value = "0.00";
    $("#batchTax").value = "0.00";
    $("#batchTotal").value = "0.00";
    return;
  }
  
  for (const wo of completedUnbilled) {
    const vehicle = state.db.vehicles.find(v => v.id === wo.vehicleId);
    const label = document.createElement("label");
    label.className = "check batch-order-item";
    label.style.padding = "10px";
    label.style.border = "1px solid rgba(255,255,255,0.05)";
    label.style.borderRadius = "8px";
    label.style.marginBottom = "8px";
    label.style.background = "rgba(6, 6, 8, 0.3)";
    label.style.cursor = "pointer";
    label.style.display = "flex";
    label.style.alignItems = "center";
    label.style.gap = "12px";
    
    let orderCost = 150.00;
    const partsCost = parseFloat((wo.parts || "").replace(/[^0-9.]/g, "")) || 0;
    const laborCost = parseFloat((wo.labor || "").replace(/[^0-9.]/g, "")) || 0;
    if (partsCost + laborCost > 0) {
      orderCost = partsCost + laborCost;
    }
    
    label.innerHTML = `
      <input type="checkbox" name="batchOrder" value="${wo.id}" data-cost="${orderCost}" style="width: 18px; height: 18px; accent-color: var(--brand);">
      <div style="flex: 1; display: flex; flex-direction: column;">
        <div style="display: flex; justify-content: space-between;">
          <strong style="color: #fff; font-size: 13px;">${wo.serviceType}</strong>
          <span style="color: var(--brand); font-weight: bold; font-family: monospace;">$${orderCost.toFixed(2)}</span>
        </div>
        <span style="font-size: 10px; color: var(--muted); font-family: monospace; margin-top: 2px;">
          ${vehicle ? `${vehicle.unitNumber} (${vehicle.plate})` : "Unidad"} · ${wo.requestedDate}
        </span>
      </div>
    `;
    
    label.querySelector("input").addEventListener("change", reCalculateBatchInvoice);
    container.appendChild(label);
  }
  reCalculateBatchInvoice();
}

function reCalculateBatchInvoice() {
  const checkboxes = $$("input[name='batchOrder']:checked", $("#unbilledOrdersContainer"));
  let subtotal = 0;
  checkboxes.forEach(cb => {
    subtotal += parseFloat(cb.dataset.cost || 0);
  });
  const tax = subtotal * 0.0825;
  const total = subtotal + tax;
  
  $("#batchSubtotal").value = subtotal.toFixed(2);
  $("#batchTax").value = tax.toFixed(2);
  $("#batchTotal").value = total.toFixed(2);
}

// Sandbox Listeners & Setup
$("#toggleScenarioA").addEventListener("change", onSandboxTogglesUpdated);
$("#toggleScenarioB").addEventListener("change", onSandboxTogglesUpdated);
$("#toggleScenarioC").addEventListener("change", onSandboxTogglesUpdated);
$("#toggleScenarioD").addEventListener("change", onSandboxTogglesUpdated);

// Batch invoicing panels
$("#batchInvoiceBtn").addEventListener("click", () => {
  $("#invoiceForm").style.display = "none";
  $("#batchInvoicePanel").style.display = "grid";
  renderBatchInvoicing();
});

$("#closeBatchPanelBtn").addEventListener("click", () => {
  $("#batchInvoicePanel").style.display = "none";
  $("#invoiceForm").style.display = "grid";
});

$("#closeOcrModalBtn").addEventListener("click", () => {
  $("#ocrCalibrationModal").style.display = "none";
  setMessage("#vehicleFormMsg", "Calibración cancelada.", "error");
});

$("#createBatchInvoiceBtn").addEventListener("click", async () => {
  const checkboxes = $$("input[name='batchOrder']:checked", $("#unbilledOrdersContainer"));
  if (!checkboxes.length) {
    setMessage("#batchInvoiceMsg", "Selecciona al menos una orden para facturar.", "error");
    return;
  }
  
  const workOrderIds = checkboxes.map(cb => cb.value);
  const subtotal = parseFloat($("#batchSubtotal").value);
  const tax = parseFloat($("#batchTax").value);
  const total = parseFloat($("#batchTotal").value);
  const clientNotes = $("#batchClientNotes").value;
  
  setMessage("#batchInvoiceMsg", "Creando factura consolidada...");
  try {
    const data = await api("/api/invoices/batch", {
      method: "POST",
      body: JSON.stringify({
        workOrderIds,
        subtotal,
        tax,
        total,
        clientNotes,
        internalNotes: `Factura agrupada para flotas de ${workOrderIds.length} órdenes.`
      })
    });
    state.db = data.db;
    $("#batchClientNotes").value = "";
    setMessage("#batchInvoiceMsg", "Factura de lote creada.", "ok");
    
    setTimeout(() => {
      $("#batchInvoicePanel").style.display = "none";
      $("#invoiceForm").style.display = "grid";
      setMessage("#batchInvoiceMsg", "");
      render();
    }, 1500);
  } catch (error) {
    setMessage("#batchInvoiceMsg", error.message, "error");
  }
});

// Load rules initial state
const rules = JSON.parse(localStorage.getItem("bmts_rules") || '{"smog":3, "oil":30, "roadside":7}');
$("#complianceForm").smogThreshold.value = rules.smog;
$("#complianceForm").oilThreshold.value = rules.oil;
$("#complianceForm").roadsideThreshold.value = rules.roadside;

$("#complianceForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const smog = parseInt(event.currentTarget.smogThreshold.value, 10) || 3;
  const oil = parseInt(event.currentTarget.oilThreshold.value, 10) || 30;
  const roadside = parseInt(event.currentTarget.roadsideThreshold.value, 10) || 7;
  
  localStorage.setItem("bmts_rules", JSON.stringify({ smog, oil, roadside }));
  setMessage("#complianceFormMsg", "Reglas de cumplimiento actualizadas.", "ok");
  
  setTimeout(() => {
    setMessage("#complianceFormMsg", "", "");
  }, 3000);
});

// Initial state updates
onSandboxTogglesUpdated();

loadState().catch((error) => {
  document.body.innerHTML = `<main class="panel"><h1>No se pudo cargar BMTS MVP</h1><p>${error.message}</p></main>`;
});

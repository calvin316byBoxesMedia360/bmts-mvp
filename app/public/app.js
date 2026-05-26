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
    if (result.ok && result.vin) {
      form.vin.value = normalizeVin(result.vin);
      updateVinValidation();
      setMessage("#vehicleFormMsg", `VIN detectado con ${result.provider}. Consultando vPIC...`, "ok");
      // Trigger decode automatically
      setTimeout(() => {
        $("#decodeVinBtn").click();
      }, 50);
    } else {
      setMessage("#vehicleFormMsg", result.error || "No se detectó un VIN de 17 caracteres en la foto. Intenta con otra foto o escribe el VIN manualmente.", "error");
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

loadState().catch((error) => {
  document.body.innerHTML = `<main class="panel"><h1>No se pudo cargar BMTS MVP</h1><p>${error.message}</p></main>`;
});

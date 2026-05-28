const http = require("node:http");
const bcrypt = require("bcryptjs");

console.log("=== VERIFICACIÓN DE SEGURIDAD Y AUTH ===");

async function testPasswordHashing() {
  console.log("1. Probando cifrado de contraseñas con bcryptjs...");
  const password = "BetoBmts2026!";
  const start = Date.now();
  const hash = await bcrypt.hash(password, 10);
  const duration = Date.now() - start;
  
  console.log(`- Contraseña: ${password}`);
  console.log(`- Hash generado: ${hash}`);
  console.log(`- Tiempo de hashing: ${duration}ms (objetivo: >100ms para evitar fuerza bruta)`);
  
  const matches = await bcrypt.compare(password, hash);
  console.log(`- Verificación: ${matches ? "ÉXITO (coincide)" : "FALLO"}`);
  
  const badMatches = await bcrypt.compare("ContraseñaIncorrecta", hash);
  console.log(`- Verificación incorrecta: ${!badMatches ? "ÉXITO (bloqueado)" : "FALLO"}`);
}

function testUnauthorizedRequest() {
  console.log("\n2. Probando protección de API (debe retornar 401 Unauthorized)...");
  
  const options = {
    hostname: "localhost",
    port: 4173,
    path: "/api/state",
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    }
  };

  const req = http.request(options, (res) => {
    console.log(`- Status Code: ${res.statusCode} (esperado: 401)`);
    let body = "";
    res.on("data", (chunk) => body += chunk);
    res.on("end", () => {
      try {
        const parsed = JSON.parse(body);
        console.log(`- Respuesta:`, parsed);
        if (res.statusCode === 401) {
          console.log("  >>> PRUEBA DE BLOQUEO DE API: EXITOSA ✅");
        } else {
          console.log("  >>> PRUEBA DE BLOQUEO DE API: FALLIDA ❌");
        }
      } catch {
        console.log("- No se pudo parsear el cuerpo:", body);
      }
    });
  });

  req.on("error", (e) => {
    console.log(`- Error de conexión (¿el servidor está apagado?): ${e.message}`);
    console.log("  Nota: Recuerda prender el servidor antes de correr la prueba de endpoints.");
  });

  req.end();
}

async function run() {
  await testPasswordHashing();
  testUnauthorizedRequest();
}

run();

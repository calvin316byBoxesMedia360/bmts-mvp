# Diseño de Autenticación Multi-rol y Seguridad

**Fecha:** 2026-05-28  
**Proyecto:** BMTS Mobility Group - MVP de Control de Flota  
**Autor:** Antigravity (AI Coding Assistant)  
**Estado:** Propuesto para Aprobación

---

## 1. Introducción y Objetivos
Este documento define el diseño arquitectónico y de seguridad para la autenticación de usuarios y el control de acceso basado en roles (RBAC) en el MVP de BMTS. El objetivo es restringir y asegurar las vistas operativas de oficina (Administrador) frente al personal de campo (Mecánicos), impidiendo accesos no autorizados y asegurando el almacenamiento cifrado y la persistencia de datos.

---

## 2. Roles y Matriz de Permisos

Definimos dos roles principales para la plataforma:

1.  **Administrador (`admin`):** Representa a Beto o al personal administrativo de la oficina. Control total.
2.  **Mecánico (`mechanic`):** Personal técnico en campo que opera desde dispositivos móviles. Acceso operativo limitado.

### Matriz de Acceso a Endpoints

| Ruta de API / Recurso | Método | Permiso Mecánico | Permiso Admin | Acción / Propósito |
| :--- | :--- | :---: | :---: | :--- |
| `/api/state` | GET | Sí | Sí | Leer el estado actual de vehículos y órdenes |
| `/api/vehicles` | POST | Sí | Sí | Registrar una nueva unidad (Partida de Nacimiento) |
| `/api/work-orders` | POST | Sí | Sí | Registrar una nueva orden de servicio (Check-in) |
| `/api/work-orders/:id/status` | PATCH | Sí* | Sí | Actualizar estado. *Mecánico limitado a estados operativos (recibido -> en trabajo -> listo). Solo admin puede marcar como "entregado" si involucra facturación.* |
| `/api/invoices` | POST | **No** (403) | Sí | Crear factura para una orden individual |
| `/api/invoices/batch` | POST | **No** (403) | Sí | Crear factura consolidada en lote |
| `/api/rules` | POST | **No** (403) | Sí | Guardar umbrales de SmogCheck u otros |
| `/api/auth/login` | POST | Sí | Sí | Autenticación inicial |
| `/api/auth/logout` | POST | Sí | Sí | Invalidación de sesión |

---

## 3. Seguridad y Almacenamiento de Credenciales

### Cifrado de Contraseñas
*   Utilizaremos la librería `bcryptjs` en el servidor para el hashing de contraseñas.
*   Las contraseñas **nunca** se guardarán en texto plano.
*   En la base de datos `db.json`, el esquema de usuarios será:
    ```json
    {
      "users": [
        {
          "id": "user_admin_uuid",
          "username": "beto_admin",
          "passwordHash": "$2a$10$XF8...",
          "role": "admin",
          "name": "Beto",
          "createdAt": "2026-05-28T16:00:00.000Z"
        }
      ]
    }
    ```

### Gestión de Sesiones y Cookies Seguras
*   El backend no guardará estados en el cliente. Usaremos una **Cookie de Sesión** firmada criptográficamente o un identificador de sesión seguro en el servidor.
*   La cookie se enviará con los siguientes flags de seguridad estrictos:
    *   `HttpOnly`: Bloquea el acceso a la cookie desde JavaScript. Previene inyecciones XSS para robar tokens de sesión.
    *   `Secure`: Exige que la cookie solo viaje sobre canales cifrados HTTPS (activo en Railway).
    *   `SameSite=Strict`: Impide el envío de la cookie en solicitudes cruzadas, anulando ataques de CSRF (falsificación de solicitudes en sitios cruzados).

### Copias de Respaldo y Recuperación (Estrategia DEV)
Como desarrollador y administrador, la seguridad de las copias de respaldo se gestionará bajo las siguientes reglas:
1.  **Backups del Archivo Físico (`db.json`):** Railway provee acceso al volumen persistente en `/app/data`. Las copias de respaldo se descargarán usando el CLI de Railway:
    `npx railway volume files download /app/data/db.json ./backup_db.json`
    Este archivo contiene los *hashes* seguros de las contraseñas, por lo que incluso si el backup se ve expuesto, las contraseñas reales siguen protegidas.
2.  **Auto-Sembrado de Emergencia (Seeding):** Si por alguna razón la base de datos se borra o corrompe, el servidor detectará la ausencia de usuarios e inicializará cuentas por defecto utilizando variables de entorno de Railway:
    *   `ADMIN_DEFAULT_USER` (por defecto: `beto_admin`)
    *   `ADMIN_DEFAULT_PASS` (por defecto una contraseña fuerte generada, ej: `BetoBmts2026!`)
    *   `MECH_DEFAULT_USER` (por defecto: `mechanic_hollister`)
    *   `MECH_DEFAULT_PASS` (por defecto: `BmtsField2026!`)
    Esto permite restaurar o forzar una contraseña administrativa desde el panel de control de Railway sin tocar código.

---

## 4. Diseño del Flujo de Interfaz (UI/UX)

1.  **Bloqueo de Pantalla Completa:** Si el usuario no está autenticado, la aplicación ocultará todo el panel principal y cargará un contenedor centralizado de Login de aspecto industrial ( Safety Lime + Charcoal Gray).
2.  **Visibilidad de Pestañas basada en Rol:**
    *   Al autenticarse como `mechanic`:
        *   Los botones de las pestañas `Invoice` y `Cumplimiento` en el panel principal se ocultan dinámicamente mediante manipulación segura del DOM (`style.display = "none"`).
        *   La sección de "Autorización admin" (override) y su justificación se deshabilitan.
    *   Al autenticarse como `admin`:
        *   Toda la interfaz y controles permanecen activos.
3.  **Botón de Logout:** Colocado en la barra superior derecha, al presionarse destruye la sesión en el servidor y borra la cookie local, recargando el estado a login.

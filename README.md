# Control de Finanzas 💸

Aplicación web para gestionar tus **ingresos**, **gastos** y **suscripciones** en un solo panel, con persistencia local en SQLite y valores en **pesos chilenos (CLP)**.

> Corta y clara: controla tu dinero sin pelearte con hojas de cálculo.

## Demo rápida

Al iniciar la app encontrarás:

- Panel de **resumen mensual** (ingresos, gastos, balance y neto tras suscripciones).
- Formulario para **registrar movimientos**.
- Formulario para **registrar suscripciones**.
- Listados con acciones de **editar, pausar/reactivar y eliminar**.

## Funcionalidades

- ✅ Resumen por mes con métricas clave.
- ✅ Registro de gastos e ingresos (categoría, fecha, método de pago, notas, recurrente).
- ✅ Gestión de suscripciones (mensual/trimestral/anual, próximo cobro, estado).
- ✅ Cálculo automático del costo mensual equivalente de suscripciones.
- ✅ Exportación de transacciones a CSV desde la API y la interfaz.
- ✅ Gráficas mensuales de tendencia y desglose de gastos.
- ✅ API REST para dashboard, transacciones y suscripciones.
- ✅ Base de datos SQLite configurable mediante `DATABASE_PATH`.

## Stack

- **Backend:** Node.js + Express
- **Base de datos:** SQLite
- **Frontend:** HTML + CSS + JavaScript vanilla

## Requisitos

- Node.js 20+

## Ejecutar en local

1. Instala dependencias

   `npm install`

2. Crea tu archivo de entorno a partir de la plantilla

   `cp .env.example .env`

3. Inicia el servidor

   `npm start`

4. Abre en tu navegador

   `http://localhost:3000`

Si no defines `DATABASE_PATH`, la información se guarda en `finance.db` dentro del proyecto.

## Seguridad (PR1)

Se incorporaron medidas base de hardening:

- `helmet` para cabeceras HTTP seguras y política CSP.
- `compression` para respuestas comprimidas.
- `express-rate-limit` aplicado a rutas `/api`.
- `x-powered-by` deshabilitado.
- Límite de payload JSON (`100kb`).
- Archivos estáticos servidos solo desde `public/`.
- Autenticación básica HTTP opcional para la app y la API.

Variables de entorno disponibles en `.env` (ver `.env.example`):

- `PORT` (por defecto `3000`)
- `ALLOWED_ORIGINS` (lista separada por comas para habilitar CORS explícito)
- `RATE_LIMIT_MAX` (máximo solicitudes por 15 min en `/api`)
- `TRUST_PROXY` (usa `1` detrás de reverse proxy)
- `BASIC_AUTH_USER` y `BASIC_AUTH_PASSWORD` (habilitan Basic Auth cuando ambos están definidos)
- `BASIC_AUTH_PIN` (PIN alternativo opcional para el login)
- `DATABASE_PATH` (ruta relativa o absoluta para la base SQLite; si se omite, usa `finance.db`)

Autenticación básica:

- Si defines `BASIC_AUTH_USER` y `BASIC_AUTH_PASSWORD`, la API queda protegida con Basic Auth.
- Si además defines `BASIC_AUTH_PIN`, el panel permite entrar con PIN como alternativa.
- `GET /health` permanece público para permitir chequeos de infraestructura.
- `GET /health` devuelve solo estado lógico de la app y de la base, sin exponer rutas internas del sistema.
- El frontend muestra una pantalla de acceso amigable; el usuario puede elegir contraseña o PIN, recordar su usuario y mostrar/ocultar la contraseña.
- Las credenciales se guardan en la sesión del navegador para llamar a la API.
- La respuesta incorrecta devuelve `401` con `WWW-Authenticate` para compatibilidad con clientes externos.

Comportamiento CORS (cuando `ALLOWED_ORIGINS` está definido):

- Requests **sin** header `Origin` (ej. cURL/server-to-server): permitidas.
- Requests con `Origin` permitido: permitidas y con header `Access-Control-Allow-Origin`.
- Requests con `Origin` no permitido: rechazadas con `403` y `{ "error": "Origen no permitido" }`.

## Endpoints principales

- `GET /health` devuelve el estado general y `db.ok`.
- `GET /api/dashboard?month=YYYY-MM`
- `GET /api/transactions?month=YYYY-MM`
- `GET /api/transactions/export?month=YYYY-MM`
- `POST /api/transactions`
- `PATCH /api/transactions/:id` (actualización parcial; requiere al menos un campo)
- `DELETE /api/transactions/:id`
- `GET /api/subscriptions`
- `POST /api/subscriptions`
- `PATCH /api/subscriptions/:id` (actualización parcial; requiere al menos un campo)
- `PATCH /api/subscriptions/:id/toggle`
- `DELETE /api/subscriptions/:id`

Notas del contrato de API:

- Si `month` no se envía, los endpoints que lo usan toman el mes actual.
- Si `month` se envía con formato inválido, la API responde `400`.
- Los `DELETE` devuelven `404` si el recurso no existe.
- La exportación CSV mitiga fórmula injection para abrir el archivo con mayor seguridad en Excel/Sheets.

## Roadmap sugerido

- [x] Exportar movimientos a CSV/Excel.
- [x] Gráficas mensuales (ingresos vs gastos).
- [ ] Presupuestos por categoría.
- [ ] Modo oscuro.

## Licencia

Uso personal / educativo. Puedes adaptarlo libremente a tus necesidades.

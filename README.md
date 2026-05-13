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
- ✅ API REST para dashboard, transacciones y suscripciones.
- ✅ Base de datos SQLite (`finance.db`).

## Stack

- **Backend:** Node.js + Express
- **Base de datos:** SQLite
- **Frontend:** HTML + CSS + JavaScript vanilla

## Requisitos

- Node.js 20+

## Ejecutar en local

1. Instala dependencias

   `npm install`

2. Inicia el servidor

   `npm start`

3. Abre en tu navegador

   `http://localhost:3000`

La información se guarda en `finance.db` dentro del proyecto.

## Seguridad (PR1)

Se incorporaron medidas base de hardening:

- `helmet` para cabeceras HTTP seguras y política CSP.
- `compression` para respuestas comprimidas.
- `express-rate-limit` aplicado a rutas `/api`.
- `x-powered-by` deshabilitado.
- Límite de payload JSON (`100kb`).
- Archivos estáticos servidos solo desde `public/`.

Variables de entorno disponibles en `.env`:

- `PORT` (por defecto `3000`)
- `ALLOWED_ORIGINS` (lista separada por comas para habilitar CORS explícito)
- `RATE_LIMIT_MAX` (máximo solicitudes por 15 min en `/api`)
- `TRUST_PROXY` (usa `1` detrás de reverse proxy)

Comportamiento CORS (cuando `ALLOWED_ORIGINS` está definido):

- Requests **sin** header `Origin` (ej. cURL/server-to-server): permitidas.
- Requests con `Origin` permitido: permitidas y con header `Access-Control-Allow-Origin`.
- Requests con `Origin` no permitido: rechazadas con `403` y `{ "error": "Origen no permitido" }`.

## Endpoints principales

- `GET /health`
- `GET /api/dashboard?month=YYYY-MM`
- `GET /api/transactions?month=YYYY-MM`
- `POST /api/transactions`
- `PATCH /api/transactions/:id`
- `DELETE /api/transactions/:id`
- `GET /api/subscriptions`
- `POST /api/subscriptions`
- `PATCH /api/subscriptions/:id`
- `PATCH /api/subscriptions/:id/toggle`
- `DELETE /api/subscriptions/:id`

## Roadmap sugerido

- [ ] Exportar movimientos a CSV/Excel.
- [ ] Gráficas mensuales (ingresos vs gastos).
- [ ] Presupuestos por categoría.
- [ ] Modo oscuro.

## Licencia

Uso personal / educativo. Puedes adaptarlo libremente a tus necesidades.

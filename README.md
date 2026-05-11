# Control de Finanzas 💸

Aplicación web para gestionar tus **ingresos**, **gastos** y **suscripciones** en un solo panel, con persistencia local en SQLite.

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

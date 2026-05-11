# Control de Finanzas

Aplicación web para registrar **ingresos**, **gastos** y **suscripciones** con persistencia en SQLite.

## Qué incluye

- Resumen mensual con balance, neto tras suscripciones y conteos.
- Registro de movimientos con fecha, categoría, método de pago y notas.
- Registro de suscripciones con ciclo, próximo cobro y estado activo/pausado.
- Edición y eliminación de registros desde la interfaz.

## Requisitos

- Node.js 20+

## Ejecutar en local

1. Instala dependencias:

   `npm install`

2. Inicia la aplicación:

   `npm start`

3. Abre `http://localhost:3000`.

Los datos quedan guardados en `finance.db` dentro del proyecto.

## Endpoint de salud

- `GET /health` para comprobaciones del hosting.

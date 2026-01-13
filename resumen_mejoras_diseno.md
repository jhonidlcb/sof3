# Resumen de Mejoras en el Diseño de Facturas (SoftwarePar)

Se han realizado mejoras significativas en la generación de PDFs para asegurar que tanto las facturas de etapas de proyecto como las facturas creadas manualmente tengan un diseño profesional, idéntico y cumplan con los requisitos legales de Paraguay (SIFEN/SET).

## Archivo Manipulado
Toda la lógica de diseño y generación de PDF se encuentra centralizada en:
- `server/routes.ts`

## Ubicación del Código de Diseño

### 1. Facturas de Etapas de Proyecto (Automáticas)
- **Líneas aproximadas:** 3125 - 3400
- **Endpoint:** `GET /api/client/stage-invoices/:stageId/download-resimple`
- **Características:** 
  - Generación automática al pagar una etapa.
  - Incluye número de etapa (ej. "1 de 4").
  - Snapshot de datos del cliente congelados al momento del pago.

### 2. Facturas Manuales
- **Líneas aproximadas:** 4494 - 4780
- **Endpoint:** `GET /api/admin/invoices/:id/download`
- **Características:**
  - Diseño actualizado para ser 100% idéntico al de etapas.
  - Corrección de la lógica de conversión de "Monto en Letras" para Guaraníes.
  - Inclusión de todos los campos: Timbrado, Vigencia, Método de Pago, y Aviso Legal.

## Mejoras Realizadas
1. **Paridad Visual:** Se ajustaron márgenes, colores (#1e3a8a para azul institucional), y grosores de línea para que ambos documentos sean indistinguibles.
2. **Monto en Letras:** Se implementó una función robusta `numeroALetras` que maneja correctamente millones, miles y centenas en español para la moneda local (PYG).
3. **Encabezado SIFEN:** Se añadió el texto "IVA General 10% / IRE SIMPLE" sobre el bloque del código CDC/QR, tal como aparece en las facturas del sistema.
4. **Detalles de Pago:** Se aseguró que las facturas manuales muestren el método de pago (ej. "Mango (TU FINANCIERA)") en lugar de valores genéricos.
5. **Formato de Fecha:** Se estandarizó el uso de `toLocaleString('es-PY', { hour12: true })` para mostrar la hora en formato AM/PM.
6. **Aviso Legal:** Se incluyó el pie de página sobre el plazo de 72 horas para solicitar modificaciones.

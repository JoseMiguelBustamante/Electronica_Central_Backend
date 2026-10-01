import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { extractStockApertura } from '../../../../scripts/extractStockApertura.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('extractStockApertura', () => {
  test('aggregates ENTRADA minus SALIDA quantities by product codigo', () => {
    const sample = `
INSERT INTO movimiento_inventario (id_movimiento, fecha_hora, tipo, cantidad, motivo, costo_unitario, id_producto, id_usuario, id_detalle_compra, id_detalle_venta) SELECT 'a', CURRENT_TIMESTAMP, 'ENTRADA', 10, 'COMPRA', 1, p.id_producto, 'u', 'd', NULL FROM producto p WHERE p.codigo = 'LDR' ON CONFLICT DO NOTHING;
INSERT INTO movimiento_inventario (id_movimiento, fecha_hora, tipo, cantidad, motivo, costo_unitario, id_producto, id_usuario, id_detalle_compra, id_detalle_venta) SELECT 'b', CURRENT_TIMESTAMP, 'SALIDA', 3, 'VENTA', 1, p.id_producto, 'u', NULL, 'v' FROM producto p WHERE p.codigo = 'LDR' ON CONFLICT DO NOTHING;
`;
    const items = extractStockApertura(sample, { LDR: 3 });
    expect(items).toEqual([{ codigo: 'LDR', cantidad: 7, precioExcel: 3 }]);
  });

  test('parses real datos SQL file without writing DB', () => {
    const sqlPath = resolve(__dirname, '../../../../../docs/datos_Electronica_CentralAZ.sql');
    const sqlText = readFileSync(sqlPath, 'utf8');
    const items = extractStockApertura(sqlText);
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((item) => typeof item.codigo === 'string' && Number.isFinite(item.cantidad))).toBe(true);
    const ldr = items.find((item) => item.codigo === 'LDR');
    expect(ldr).toBeTruthy();
    expect(ldr.cantidad).toBeGreaterThan(0);
  });
});

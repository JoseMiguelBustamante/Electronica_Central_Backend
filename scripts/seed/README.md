# Seed — Excel de negocio (fuente oficial)

Fuente: `docs/2026 INTEGRADOS y ARDUINO.xlsx` (hojas INTEGRADOS + MODULOS ARDUINO).

## Orden en DBeaver

1. `01_cleanup_demo_data.sql` — borra catálogo/ops/usuarios de prueba; **conserva** admin y soporte bootstrap.
2. `02_seed_from_excel.sql` — carga **1343** productos con precio y caja del Excel.

```bash
cd backend
npm run seed:excel:sql   # regenera ambos .sql desde el xlsx
```

Luego en DBeaver: Execute SQL Script de `01` y después `02`.

## Qué carga el Excel

| Campo | Origen |
|-------|--------|
| código / nombre | columna ITEM |
| descripción | DESCRIPCION (si existe) |
| precio_venta | PRECIO |
| ubicación | CAJA → `ubicacion.codigo` |
| categoría | hoja (Integrados / Modulos Arduino) |
| stock / costo | **0** (el Excel no trae existencias ni costo de compra) |

## Credenciales (tras bootstrap)

- Admin: `BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD` del `.env`
- Si no hay admin: `npm run bootstrap:security`

## Legacy (ya no usar para negocio)

| Archivo | Nota |
|---------|------|
| `seed_local_electronica_az.sql` | Demo desde `datos_*.sql` + costo ×0.65 |
| `npm run seed:local` | Idem, seed Node de prueba |

**No** ejecutes `docs/datos_Electronica_CentralAZ.sql` completo.

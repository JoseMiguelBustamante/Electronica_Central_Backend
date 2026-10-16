# Electrónica Central AZ — Backend

API Node.js/Express para catálogo, inventario, compras, ventas, pagos, entregas, solicitudes y reportes (BOB, `America/La_Paz`).

Repo: [Electronica_Central_Backend](https://github.com/JoseMiguelBustamante/Electronica_Central_Backend)

## Quick path

1. Copiar `.env.example` → `.env` y configurar `DATABASE_URL` + bootstrap admin/soporte.
2. Aplicar esquema: ejecutar `db/electronica_az_all_migrations.sql` en DBeaver/psql.
3. `npm run bootstrap:security`
4. (Opcional) Seed Excel: `scripts/seed/01_cleanup_demo_data.sql` → `02_seed_from_excel.sql`
5. `npm install && npm run dev` → `/health`, docs en `/api/docs`

Base ya existente: aplicar solo las migraciones nuevas de `scripts/migrations/` (la última es `015_ciclo1_ciclo2_gaps.sql`).

## Stack

- Node.js ≥22, Express 5, Zod, `pg`
- PostgreSQL (esquema `electronica_az`)
- OpenAPI/Swagger + Postman (`docs/`)
- Reportes: exceljs + pdfkit

## Estructura

```
.
├── src/                 # API (controllers, services, repositories, routes)
├── scripts/migrations/  # 001 … 015
├── scripts/seed/        # cleanup + seed desde Excel
├── db/                  # bundle SQL 001→015
├── docs/                # openapi, postman, Excel de catálogo
├── test/                # unit + integration (Vitest)
└── package.json
```

## Scripts útiles

| Comando | Uso |
|---------|-----|
| `npm run dev` | API en watch |
| `npm test` | Tests contra PostgreSQL (`.env`) |
| `npm run bootstrap:security` | Admin + roles/permisos |
| `npm run db:bundle` | Regenerar `db/electronica_az_all_migrations.sql` |
| `npm run seed:excel:sql` | Regenerar SQL de seed desde el Excel |

## Seed Excel

Fuente: `docs/2026 INTEGRADOS y ARDUINO.xlsx`

1. `scripts/seed/01_cleanup_demo_data.sql`
2. `scripts/seed/02_seed_from_excel.sql`

Detalle: `scripts/seed/README.md`.

## Docs de requisitos

- Perfil académico Ciclo 2: `docs/PerfilGrupo14_2doCiclo.docx`
- Verificación operacional vs Ciclo 2: `docs/ciclo-2-verificacion.md`

## Product images (storefront)

Photos are **not** in the database. Drop files named with the product code into `media/productos/`:

- File: `CODIGO.jpg` (example: `1200AP100.jpg`)
- Served at: `GET /media/productos/CODIGO.jpg`
- Optional env: `PRODUCT_IMAGES_DIR` (absolute path). Default: `./media/productos`
- On Dokploy, mount a host volume at `/app/media/productos` so images survive redeploys.

Details: `media/productos/README.md`.

## Checklist

- [ ] `.env` listo (no se sube a git)
- [ ] Migraciones aplicadas
- [ ] `bootstrap:security`
- [ ] Seed Excel (opcional pero requerido para catálogo de negocio)
- [ ] API arriba y login admin OK
- [ ] Revisar `docs/ciclo-2-verificacion.md`
- [ ] (Opcional) imágenes en `media/productos/<codigo>.jpg`

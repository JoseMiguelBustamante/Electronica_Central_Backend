# Documentación API — Postman y Swagger

## Swagger UI

Con la API en marcha (`npm run dev`):

- UI: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
- YAML: [http://localhost:3000/api/docs/openapi.yaml](http://localhost:3000/api/docs/openapi.yaml)
- JSON: [http://localhost:3000/api/docs/openapi.json](http://localhost:3000/api/docs/openapi.json)

Archivo fuente: `backend/docs/openapi.yaml` (generado).

## Seed local (recomendado antes de Postman)

```bash
cd backend
npm run bootstrap:security   # si aún no
npm run seed:local           # catálogo + apertura stock
npm run dev
```

Detalle: `backend/scripts/seed/README.md`.

## Postman — importar

1. Abre Postman → **Import**.
2. Importa:
   - `Electronica_Central_AZ.postman_collection.json`
   - `Electronica_Central_AZ.seeded.postman_environment.json` (tras `npm run seed:local`)
   - (opcional) `Electronica_Central_AZ.local.postman_environment.json` vacío
3. Selecciona el environment **Electrónica Central AZ — Seeded Local**.
4. Ejecuta **Auth → POST /api/auth/login** — guarda `adminToken`.
5. Los UUIDs (`idProducto`, `idCliente`, `idProveedor`, …) ya vienen del seed.

### Orden de prueba

**A) Smoke de todos los endpoints** — carpeta por carpeta (Health → Auth → Catálogo → … → Reportes).

**B) Flujo de negocio**

1. Login admin (y opcional vendedor: `vendedor@example.test` / `ClaveVendedorSegura123`)
2. Inventario / producto con stock (`idProducto`, ej. IRF540N)
3. Venta → confirmar → pagos → entrega
4. Reportes del día
5. Solicitud + atender (admin)

## Regenerar docs

```bash
cd backend
npm run docs:generate
```

## Notas al probar

### Cambio de contraseña

```json
{
  "contrasenaActual": "change-this-admin-password",
  "contrasenaNueva": "ClaveNuevaSegura123"
}
```

- `contrasenaNueva` mínimo **12** caracteres.
- Usa bootstrap `admin@example.test` (scrypt), no usuarios del dump SQL.

### Crear producto

- Orden: categoría → marca → unidad → ubicación → (opcional modelo de **esa** marca) → producto.
- `idModelo` debe coincidir con `idMarca`, o omítelo.
- Tras el seed, usa los IDs del environment seeded.

### Poblar datos

**No** ejecutes `docs/datos_Electronica_CentralAZ.sql` completo. Usa `npm run seed:local` (opción 3: catálogo + apertura con PRECIO×0.65).

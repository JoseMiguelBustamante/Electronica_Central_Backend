# Ciclo 2 — verificación vs perfil

Fuente de requisitos: `docs/PerfilGrupo14_2doCiclo.docx` (Grupo 14, UAGRM).  
Ambiente verificado: VPS local (`API :3001`, catálogo público vía Traefik en `http://187.127.19.244/`).  
Fecha de verificación: 2026-10-15.

## Quick path

1. Abrir el perfil académico en `docs/PerfilGrupo14_2doCiclo.docx`.
2. Revisar la tabla de estado abajo (CU del Ciclo 2).
3. Reprobar con los comandos de la sección Evidencia.

## Alcance Ciclo 2 (perfil)

| ID | Caso de uso | Prioridad |
|----|-------------|-----------|
| CU-9 | Gestionar compatibilidad de productos | Media |
| CU-11 | Gestionar inventario | Alta |
| CU-12 | Gestionar proveedores | Alta |
| CU-13 | Gestionar compras | Alta |
| CU-3 | Consultar bitácora | Baja |

## Estado actual

Verificado 2026-10-16 con tests de integración (`test/integration/ciclo1-ciclo2.flow.test.js`) sobre una base local migrada 001→015.

### Ciclo 1

| CU | Backend (API) | Frontend (UI) | Cumple |
|----|---------------|---------------|--------|
| CU-1 Iniciar sesión | `POST /api/auth/login` (cuenta ACTIVA, error genérico) + bitácora `INICIO_SESION` con IP | `/login` | OK |
| CU-2 Usuarios y roles | `GET/POST /api/usuarios`, `PATCH /api/usuarios/:id` (editar, rol ADMINISTRADOR/VENDEDOR, activar/desactivar) | `/usuarios` | OK |
| CU-4 Productos | `GET /api/productos` (incluye inactivos), `POST`, `PATCH /api/productos/:id` (edición completa, precio de compra, margen, reactivar) | `/productos` | OK |
| CU-5 Categorías | `GET/POST`, `PATCH/DELETE /api/categorias/:id` (409 si está en uso) | `/categorias` | OK |
| CU-6 Marcas | `GET/POST`, `PATCH/DELETE /api/marcas/:id` | `/marcas` | OK |
| CU-7 Modelos | `GET/POST`, `PATCH/DELETE /api/modelos/:id` (único por marca) | `/modelos` | OK |
| CU-8 Unidades | `GET/POST`, `PATCH/DELETE /api/unidades/:id` (abreviatura única) | `/unidades` | OK |
| CU-10 Buscar productos | `GET /api/catalogo/productos` (filtro por modelo usa COMPATIBILIDAD), detalle con compatibilidades | Catálogo público | OK* |

\* El catálogo público muestra disponibilidad, no el stock exacto ni la ubicación (decisión de seguridad); el vendedor los ve en `/inventario`.

### Ciclo 2

| CU | Backend (API) | Frontend (UI) | Cumple |
|----|---------------|---------------|--------|
| CU-9 Compatibilidad | `GET/POST/DELETE /api/productos/:id/compatibilidades` (409 si se repite) | `/compatibilidades` | OK |
| CU-11 Inventario | `GET /api/inventario`, ajustes ENTRADA/SALIDA, mínimo, movimientos | `/inventario` | OK |
| CU-12 Proveedores | `GET/POST/PATCH /api/proveedores` | `/proveedores` | OK |
| CU-13 Compras | `POST /api/compras` con `numeroComprobante` obligatorio y único (409), recibir → ENTRADA | `/compras` | OK |
| CU-3 Bitácora | `GET /api/bitacora?desde&hasta&usuario&accion&tabla`, guarda IP y tabla afectada | `/bitacora` | OK |

### Datos cargados (negocio Excel)

| Recurso | Cantidad | Nota |
|---------|----------|------|
| Productos | 1343 | Seed `02_seed_from_excel.sql` |
| Ubicaciones (caja) | 228 | Columna CAJA del Excel |
| Categorías | 2 | Integrados / Modulos Arduino |
| Existencias | 1343 | `stock_actual = 0` (el Excel no trae cantidades) |
| Usuarios | 2 | admin + soporte (bootstrap) |

## Gaps restantes

1. **Datos de demo:** el Excel no trae marcas ni modelos; cargar algunos para demostrar CU-7 y CU-9.
2. **Stack del perfil vs implementación:** el documento académico menciona Laravel/Vue; el sistema es **Node/Express + React/Vite + PostgreSQL**.
3. **Almacén (CU-4):** el perfil menciona "almacén"; se cubre con la ubicación física (caja / pasillo / estante).
4. **Pasarela QR real / HTTPS:** fuera del alcance de los ciclos 1 y 2.

## Evidencia (comandos)

```bash
# Health
curl -sS http://127.0.0.1:3001/health
curl -sS http://127.0.0.1:3001/ready

# Login
curl -sS -X POST http://127.0.0.1:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d "{\"identificador\":\"admin\",\"contrasena\":\"$ADMIN_PASSWORD\"}"

# Ciclo 2 (usar Bearer token del login)
curl -sS -H "Authorization: Bearer $TOKEN" 'http://127.0.0.1:3001/api/inventario?limite=1'
curl -sS -H "Authorization: Bearer $TOKEN" 'http://127.0.0.1:3001/api/inventario/alertas?limite=1'
curl -sS -H "Authorization: Bearer $TOKEN" 'http://127.0.0.1:3001/api/proveedores'
curl -sS -H "Authorization: Bearer $TOKEN" 'http://127.0.0.1:3001/api/compras'
curl -sS -H "Authorization: Bearer $TOKEN" 'http://127.0.0.1:3001/api/bitacora'
```

Catálogo público (sin login): `http://187.127.19.244/`

## Checklist

- [x] Perfil Ciclo 2 archivado en el repo (`docs/PerfilGrupo14_2doCiclo.docx`)
- [x] Migraciones + bootstrap + seed Excel aplicados
- [x] API Ciclo 2 responde (inventario, proveedores, compras, bitácora)
- [x] UI Ciclo 1 y 2 completa en el frontend
- [x] Migración `015_ciclo1_ciclo2_gaps.sql` (precio de compra, margen, comprobante, tabla en bitácora)
- [ ] Compatibilidades con datos de marca/modelo
- [ ] Contraseña del admin cambiada en producción

## Next step

Cargar marcas/modelos de demo y ensayar CU-9 y CU-10 de punta a punta.

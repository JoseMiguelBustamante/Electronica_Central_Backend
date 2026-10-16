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

| CU | Backend (API) | Frontend (UI) | Evidencia | Cumple |
|----|---------------|---------------|-----------|--------|
| CU-9 Compatibilidad | `POST/DELETE /api/productos/:id/compatibilidades` | `/compatibilidades` (+ Marcas/Modelos) | UI wired 2026-10-16; necesita marcas/modelos creados | OK (datos base a cargar) |
| CU-11 Inventario | `GET /api/inventario`, ajustes, mínimo | `/inventario` | UI wired 2026-10-16 | OK |
| CU-12 Proveedores | `GET/POST /api/proveedores` | `/proveedores` | UI wired 2026-10-16 | OK |
| CU-13 Compras | `GET/POST /api/compras`, recibir/cancelar | `/compras` | UI wired 2026-10-16 | OK |
| CU-3 Bitácora | `GET /api/bitacora` | `/bitacora` | Ya existía | OK |

### Datos cargados (negocio Excel)

| Recurso | Cantidad | Nota |
|---------|----------|------|
| Productos | 1343 | Seed `02_seed_from_excel.sql` |
| Ubicaciones (caja) | 228 | Columna CAJA del Excel |
| Categorías | 2 | Integrados / Modulos Arduino |
| Existencias | 1343 | `stock_actual = 0` (el Excel no trae cantidades) |
| Usuarios | 2 | admin + soporte (bootstrap) |

## Gaps restantes

1. **CU-9 usable:** crear marcas/modelos en UI antes de asociar compatibilidades (el Excel no las trae).
2. **Stock real:** Excel deja `stock_actual = 0`; usar ajustes de inventario o apertura para demo de disponibilidad.
3. **Stack del perfil vs implementación:** el documento académico menciona Laravel/Vue; el sistema es **Node/Express + React/Vite + PostgreSQL**.
4. **Pasarela QR real / HTTPS:** el UI permite método QR + referencia; integración externa y TLS del perfil siguen pendientes.

## Evidencia (comandos)

```bash
# Health
curl -sS http://127.0.0.1:3001/health
curl -sS http://127.0.0.1:3001/ready

# Login
curl -sS -X POST http://127.0.0.1:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"identificador":"admin","contrasena":"change-this-admin-password"}'

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
- [ ] UI Ciclo 2 completa en el frontend
- [ ] Compatibilidades con datos de marca/modelo
- [ ] Stock distinto de cero para demo de disponibilidad

## Next step

Implementar las pantallas de Inventario / Proveedores / Compras en el frontend y conectarlas a la API ya verificada.

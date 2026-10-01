import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { closeDatabase, query, withTransaction } from '../src/lib/database.js';
import { hashPassword } from '../src/utils/password.js';
import { extractStockApertura } from './extractStockApertura.js';
import { confirmOpeningService } from '../src/services/inventoryService.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '../..');
const sqlPath = resolve(root, 'docs/datos_Electronica_CentralAZ.sql');
const outDir = join(__dirname, 'seed');
const COST_FACTOR = 0.65;

const rewriteSchema = (sql) => sql
  .replace(/\bINSERT INTO categoria\b/gi, 'INSERT INTO electronica_az.categoria')
  .replace(/\bINSERT INTO marca\b/gi, 'INSERT INTO electronica_az.marca')
  .replace(/\bINSERT INTO modelo\b/gi, 'INSERT INTO electronica_az.modelo')
  .replace(/\bINSERT INTO unidad_medida\b/gi, 'INSERT INTO electronica_az.unidad_medida')
  .replace(/\bINSERT INTO ubicacion\b/gi, 'INSERT INTO electronica_az.ubicacion')
  .replace(/\bINSERT INTO producto\b/gi, 'INSERT INTO electronica_az.producto')
  .replace(/\bINSERT INTO proveedor\b/gi, 'INSERT INTO electronica_az.proveedor')
  .replace(/\bINSERT INTO compatibilidad\b/gi, 'INSERT INTO electronica_az.compatibilidad');

const collectStatements = (sqlText, table) => {
  const lines = sqlText.split(/\r?\n/);
  const out = [];
  for (const line of lines) {
    if (new RegExp(`^INSERT INTO ${table}\\b`, 'i').test(line.trim())) {
      out.push(line.trim().replace(/;$/, ''));
    }
  }
  return out;
};

const parseProductPrecios = (sqlText) => {
  const map = {};
  const re = /INSERT INTO producto[\s\S]*?VALUES\s*\(\s*'[^']+'\s*,\s*'([^']+)'\s*,\s*'[^']*'\s*,\s*(?:NULL|'[^']*')\s*,\s*([0-9]+(?:\.[0-9]+)?)/gi;
  for (const match of sqlText.matchAll(re)) {
    map[match[1]] = Number(match[2]);
  }
  return map;
};

const ensureExistencias = async () => {
  await query(`
    INSERT INTO electronica_az.existencia (id_producto, stock_actual, stock_minimo, costo_promedio)
    SELECT p.id_producto, 0, 3, 0
    FROM electronica_az.producto p
    WHERE NOT EXISTS (
      SELECT 1 FROM electronica_az.existencia e WHERE e.id_producto = p.id_producto
    )
  `);
};

const ensureVendor = async () => {
  const email = process.env.SEED_VENDOR_EMAIL || 'vendedor@example.test';
  const password = process.env.SEED_VENDOR_PASSWORD || 'ClaveVendedorSegura123';
  const username = process.env.SEED_VENDOR_USERNAME || 'vendedor.demo';

  const existing = await query(
    'SELECT id_usuario FROM electronica_az.usuario WHERE lower(correo) = lower($1)',
    [email],
  );
  if (existing.rows[0]) {
    return { idUsuario: existing.rows[0].id_usuario, email, password, created: false };
  }

  const hash = await hashPassword(password);
  const user = await withTransaction(async (client) => {
    const inserted = await client.query(
      `INSERT INTO electronica_az.usuario(nombre_usuario, correo, hash_contrasena)
       VALUES ($1, $2, $3)
       RETURNING id_usuario`,
      [username, email, hash],
    );
    const idUsuario = inserted.rows[0].id_usuario;
    await client.query(
      `INSERT INTO electronica_az.usuario_rol(id_usuario, id_rol)
       SELECT $1, id_rol FROM electronica_az.rol WHERE nombre = 'VENDEDOR'
       ON CONFLICT DO NOTHING`,
      [idUsuario],
    );
    return idUsuario;
  });

  return { idUsuario: user, email, password, created: true };
};

const ensureWalkInClient = async () => {
  const documento = 'CI-SEED-WALKIN';
  const existing = await query(
    'SELECT id_cliente, nombre FROM electronica_az.cliente WHERE documento = $1',
    [documento],
  );
  if (existing.rows[0]) return existing.rows[0];

  const created = await query(
    `INSERT INTO electronica_az.cliente(nombre, documento, telefono, correo)
     VALUES ($1, $2, $3, $4)
     RETURNING id_cliente, nombre`,
    ['Cliente Walk-in Seed', documento, '70000000', 'walkin.seed@example.test'],
  );
  return created.rows[0];
};

const runCatalogSeed = async (sqlText) => {
  const tables = [
    'categoria',
    'marca',
    'unidad_medida',
    'ubicacion',
    'modelo',
    'producto',
    'proveedor',
  ];

  let executed = 0;
  await withTransaction(async (client) => {
    for (const table of tables) {
      for (const statement of collectStatements(sqlText, table)) {
        const rewritten = rewriteSchema(statement);
        await client.query(rewritten);
        executed += 1;
      }
    }
  });

  await ensureExistencias();
  return executed;
};

const buildAperturaItems = async (sqlText, precioByCodigo) => {
  const extracted = extractStockApertura(sqlText, precioByCodigo);
  const products = await query(
    'SELECT id_producto, codigo, precio_venta FROM electronica_az.producto WHERE activo',
  );
  const byCodigo = new Map(products.rows.map((row) => [row.codigo.toLowerCase(), row]));

  const ok = [];
  const pendientes = [];

  for (const item of extracted) {
    const product = byCodigo.get(item.codigo.toLowerCase());
    if (!product) {
      pendientes.push({ ...item, reason: 'PRODUCTO_NO_EN_CATALOGO' });
      continue;
    }
    if (!(item.cantidad > 0)) {
      pendientes.push({ ...item, reason: 'CANTIDAD_CERO' });
      continue;
    }

    const precioExcel = item.precioExcel ?? Number(product.precio_venta);
    const costoUnitario = Number((precioExcel * COST_FACTOR).toFixed(4));
    ok.push({
      idProducto: product.id_producto,
      codigo: item.codigo,
      cantidad: item.cantidad,
      precioExcel,
      costoUnitario,
    });
  }

  return { ok, pendientes };
};

const main = async () => {
  mkdirSync(outDir, { recursive: true });
  const sqlText = readFileSync(sqlPath, 'utf8');

  process.stdout.write('Seeding catalog from datos SQL (no users/roles/ops)...\n');
  const statements = await runCatalogSeed(sqlText);
  process.stdout.write(`Catalog statements applied: ${statements}\n`);

  const precios = parseProductPrecios(sqlText);
  const preciosCsv = [
    'codigo,precioExcel',
    ...Object.entries(precios).map(([codigo, precio]) => `${codigo},${precio}`),
  ].join('\n');
  const preciosPath = join(outDir, 'precios-from-datos.csv');
  writeFileSync(preciosPath, `${preciosCsv}\n`, 'utf8');

  const vendor = await ensureVendor();
  const client = await ensureWalkInClient();

  const admin = await query(
    `SELECT u.id_usuario, u.correo
     FROM electronica_az.usuario u
     JOIN electronica_az.usuario_rol ur ON ur.id_usuario = u.id_usuario
     JOIN electronica_az.rol r ON r.id_rol = ur.id_rol
     WHERE r.nombre = 'ADMINISTRADOR'
     ORDER BY u.correo
     LIMIT 1`,
  );
  if (!admin.rows[0]) {
    throw new Error('No ADMINISTRADOR found. Run npm run bootstrap:security first.');
  }

  const { ok, pendientes } = await buildAperturaItems(sqlText, precios);
  writeFileSync(
    join(outDir, 'apertura-preview.json'),
    `${JSON.stringify({ items: ok, pendientes }, null, 2)}\n`,
    'utf8',
  );

  process.stdout.write(`Aperture candidates: ok=${ok.length} pendientes=${pendientes.length}\n`);

  if (ok.length) {
    const confirm = await confirmOpeningService(
      {
        claveIdempotencia: `seed-apertura-${new Date().toISOString().slice(0, 10)}`,
        items: ok.map((item) => ({
          idProducto: item.idProducto,
          cantidad: item.cantidad,
          costoUnitario: item.costoUnitario,
        })),
      },
      { id: admin.rows[0].id_usuario },
    );
    process.stdout.write(`Aperture confirm status: ${confirm.cached ? 'cached' : 'applied'}\n`);
  }

  const sampleProduct = await query(
    `SELECT p.id_producto, p.codigo, e.stock_actual, e.costo_promedio
     FROM electronica_az.producto p
     JOIN electronica_az.existencia e ON e.id_producto = p.id_producto
     WHERE e.stock_actual > 0
     ORDER BY e.stock_actual DESC
     LIMIT 5`,
  );
  const sampleCategoria = await query('SELECT id_categoria FROM electronica_az.categoria LIMIT 1');
  const sampleMarca = await query('SELECT id_marca FROM electronica_az.marca LIMIT 1');
  const sampleUnidad = await query('SELECT id_unidad_medida FROM electronica_az.unidad_medida LIMIT 1');
  const sampleUbicacion = await query('SELECT id_ubicacion FROM electronica_az.ubicacion LIMIT 1');
  const sampleModelo = await query('SELECT id_modelo FROM electronica_az.modelo LIMIT 1');
  const sampleProveedor = await query('SELECT id_proveedor FROM electronica_az.proveedor LIMIT 1');

  const ids = {
    adminEmail: process.env.BOOTSTRAP_ADMIN_EMAIL || admin.rows[0].correo,
    adminPassword: process.env.BOOTSTRAP_ADMIN_PASSWORD || 'change-this-admin-password',
    vendedorEmail: vendor.email,
    vendedorPassword: vendor.password,
    idCliente: client.id_cliente,
    idProducto: sampleProduct.rows[0]?.id_producto ?? null,
    idProductoCodigo: sampleProduct.rows[0]?.codigo ?? null,
    idCategoria: sampleCategoria.rows[0]?.id_categoria ?? null,
    idMarca: sampleMarca.rows[0]?.id_marca ?? null,
    idUnidadMedida: sampleUnidad.rows[0]?.id_unidad_medida ?? null,
    idUbicacion: sampleUbicacion.rows[0]?.id_ubicacion ?? null,
    idModelo: sampleModelo.rows[0]?.id_modelo ?? null,
    idProveedor: sampleProveedor.rows[0]?.id_proveedor ?? null,
    productosConStock: sampleProduct.rows,
    aperturaOk: ok.length,
    aperturaPendientes: pendientes.length,
  };

  writeFileSync(join(outDir, 'seed-ids.json'), `${JSON.stringify(ids, null, 2)}\n`, 'utf8');

  const envValues = [
    { key: 'baseUrl', value: 'http://localhost:3000' },
    { key: 'adminEmail', value: ids.adminEmail },
    { key: 'adminPassword', value: ids.adminPassword },
    { key: 'vendedorEmail', value: ids.vendedorEmail },
    { key: 'vendedorPassword', value: ids.vendedorPassword },
    { key: 'adminToken', value: '' },
    { key: 'vendedorToken', value: '' },
    { key: 'idCliente', value: ids.idCliente },
    { key: 'idProducto', value: ids.idProducto },
    { key: 'productoId', value: ids.idProducto },
    { key: 'id', value: ids.idProducto },
    { key: 'idCategoria', value: ids.idCategoria },
    { key: 'idMarca', value: ids.idMarca },
    { key: 'idUnidadMedida', value: ids.idUnidadMedida },
    { key: 'idUbicacion', value: ids.idUbicacion },
    { key: 'idModelo', value: ids.idModelo },
    { key: 'idProveedor', value: ids.idProveedor },
    { key: 'idVenta', value: '' },
    { key: 'idPago', value: '' },
    { key: 'idCompra', value: '' },
    { key: 'idSolicitud', value: '' },
    { key: 'idUsuario', value: vendor.idUsuario },
  ];

  writeFileSync(
    join(root, 'backend/docs/postman/Electronica_Central_AZ.seeded.postman_environment.json'),
    `${JSON.stringify({
      id: 'electronica-az-seeded',
      name: 'Electrónica Central AZ — Seeded Local',
      values: envValues.map((row) => ({ ...row, enabled: true })),
      _postman_variable_scope: 'environment',
    }, null, 2)}\n`,
    'utf8',
  );

  process.stdout.write(`Wrote ${join(outDir, 'seed-ids.json')}\n`);
  process.stdout.write('Wrote Postman environment: docs/postman/Electronica_Central_AZ.seeded.postman_environment.json\n');
  process.stdout.write('Done. Login as admin, then test Postman against seeded data.\n');
};

try {
  await main();
} finally {
  await closeDatabase();
}

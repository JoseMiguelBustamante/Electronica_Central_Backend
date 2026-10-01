import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { apiMeta, endpoints } from './apiEndpoints.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const docsDir = join(root, 'docs');
const postmanDir = join(docsDir, 'postman');
mkdirSync(postmanDir, { recursive: true });

const exampleBody = (schema) => {
  if (!schema?.properties) return {};
  const out = {};
  for (const [key, prop] of Object.entries(schema.properties)) {
    if (prop.example !== undefined) {
      out[key] = prop.example;
      continue;
    }
    if (prop.enum) {
      out[key] = prop.enum[0];
      continue;
    }
    switch (prop.type) {
      case 'string':
        out[key] = prop.format === 'uuid'
          ? `{{${key}}}`
          : prop.format === 'email'
            ? 'demo@example.test'
            : prop.format === 'date-time'
              ? new Date().toISOString()
              : key.includes('contrasena') || key.includes('Password')
                ? 'ClaveDePruebaSegura123'
                : key === 'claveIdempotencia'
                  ? 'idem-{{$timestamp}}'
                  : key === 'identificador'
                    ? '{{adminEmail}}'
                    : `ejemplo-${key}`;
        break;
      case 'number':
      case 'integer':
        out[key] = prop.default ?? 1;
        break;
      case 'boolean':
        out[key] = prop.default ?? true;
        break;
      case 'array':
        if (prop.items?.properties) {
          out[key] = [exampleBody(prop.items)];
        } else {
          out[key] = [];
        }
        break;
      default:
        out[key] = null;
    }
  }
  return out;
};

const buildOpenApi = () => {
  const paths = {};
  const tags = [...new Set(endpoints.flatMap((e) => e.tags))].map((name) => ({ name }));

  for (const ep of endpoints) {
    if (!paths[ep.path]) paths[ep.path] = {};
    const parameters = [];
    for (const name of ep.pathParams ?? []) {
      parameters.push({
        name,
        in: 'path',
        required: true,
        schema: { type: 'string', format: 'uuid' },
      });
    }
    if (ep.query) {
      for (const [name, schema] of Object.entries(ep.query)) {
        parameters.push({
          name,
          in: 'query',
          required: Boolean(schema.required),
          schema: { ...schema },
        });
      }
    }

    const operation = {
      operationId: ep.operationId,
      summary: ep.summary,
      tags: ep.tags,
      parameters: parameters.length ? parameters : undefined,
      responses: {
        200: { description: 'OK' },
        201: { description: 'Created' },
        400: { description: 'Validation error' },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden' },
        404: { description: 'Not found' },
        422: { description: 'Business rule' },
      },
    };

    if (ep.auth) {
      operation.security = [{ bearerAuth: [] }];
      if (typeof ep.auth === 'string') {
        operation.description = `Requiere permiso \`${ep.auth}\` (o roles Admin/Dev según seed).`;
      }
    } else {
      operation.security = [];
    }

    if (ep.body) {
      operation.requestBody = {
        required: ep.bodyRequired !== false,
        content: {
          'application/json': {
            schema: ep.body,
            example: exampleBody(ep.body),
          },
        },
      };
    }

    paths[ep.path][ep.method] = operation;
  }

  return {
    openapi: '3.0.3',
    info: {
      title: apiMeta.title,
      version: apiMeta.version,
      description: apiMeta.description,
    },
    servers: [{ url: apiMeta.serverUrl, description: 'Local' }],
    tags,
    paths,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  };
};

const postmanUrl = (path) => {
  const resolved = path.replace(/\{(\w+)\}/g, '{{$1}}');
  return `{{baseUrl}}${resolved}`;
};

const buildPostman = () => {
  const folders = new Map();
  for (const ep of endpoints) {
    const tag = ep.tags[0];
    if (!folders.has(tag)) folders.set(tag, []);
    const base = postmanUrl(ep.path);
    const queryPairs = ep.query
      ? Object.entries(ep.query)
        .filter(([, schema]) => schema.example != null || schema.default != null || schema.required)
        .map(([key, schema]) => `${key}=${encodeURIComponent(String(schema.example ?? schema.default ?? ''))}`)
      : [];
    const url = queryPairs.length ? `${base}?${queryPairs.join('&')}` : base;
    const item = {
      name: `${ep.method.toUpperCase()} ${ep.path}`,
      request: {
        method: ep.method.toUpperCase(),
        header: [{ key: 'Content-Type', value: 'application/json' }],
        url,
        description: ep.summary + (typeof ep.auth === 'string' ? ` | permiso: ${ep.auth}` : ''),
      },
      response: [],
    };

    if (ep.auth) {
      item.request.auth = {
        type: 'bearer',
        bearer: [{ key: 'token', value: '{{adminToken}}', type: 'string' }],
      };
    } else {
      item.request.auth = { type: 'noauth' };
    }

    if (ep.body) {
      item.request.body = {
        mode: 'raw',
        raw: JSON.stringify(exampleBody(ep.body), null, 2),
        options: { raw: { language: 'json' } },
      };
    }

    if (ep.operationId === 'authLogin') {
      item.event = [
        {
          listen: 'test',
          script: {
            type: 'text/javascript',
            exec: [
              'if (pm.response.code === 200) {',
              '  const json = pm.response.json();',
              '  const token = json?.data?.token;',
              '  if (token) {',
              '    pm.environment.set("adminToken", token);',
              '    pm.collectionVariables.set("adminToken", token);',
              '  }',
              '}',
            ],
          },
        },
      ];
      item.request.body.raw = JSON.stringify({
        identificador: '{{adminEmail}}',
        contrasena: '{{adminPassword}}',
      }, null, 2);
    }

    folders.get(tag).push(item);
  }

  // Extra: login vendedor helper
  folders.get('Auth').push({
    name: 'POST /api/auth/login (vendedor → vendedorToken)',
    event: [
      {
        listen: 'test',
        script: {
          type: 'text/javascript',
          exec: [
            'if (pm.response.code === 200) {',
            '  const token = pm.response.json()?.data?.token;',
            '  if (token) pm.environment.set("vendedorToken", token);',
            '}',
          ],
        },
      },
    ],
    request: {
      method: 'POST',
      header: [{ key: 'Content-Type', value: 'application/json' }],
      auth: { type: 'noauth' },
      body: {
        mode: 'raw',
        raw: JSON.stringify({
          identificador: '{{vendedorEmail}}',
          contrasena: '{{vendedorPassword}}',
        }, null, 2),
        options: { raw: { language: 'json' } },
      },
      url: postmanUrl('/api/auth/login'),
      description: 'Guarda {{vendedorToken}}. Crea el usuario vendedor antes o usa uno existente.',
    },
    response: [],
  });

  return {
    info: {
      name: 'Electrónica Central AZ — API',
      description: 'Colección generada desde scripts/apiEndpoints.mjs. 1) Importa collection + environment. 2) Ejecuta Auth → Login admin. 3) Reemplaza UUIDs de environment según respuestas.',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    auth: {
      type: 'bearer',
      bearer: [{ key: 'token', value: '{{adminToken}}', type: 'string' }],
    },
    variable: [
      { key: 'adminToken', value: '' },
      { key: 'vendedorToken', value: '' },
    ],
    item: [...folders.entries()].map(([name, items]) => ({ name, item: items })),
  };
};

const environment = {
  id: 'electronica-az-local',
  name: 'Electrónica Central AZ — Local',
  values: [
    { key: 'baseUrl', value: 'http://localhost:3000', enabled: true },
    { key: 'adminEmail', value: 'admin@example.test', enabled: true },
    { key: 'adminPassword', value: 'change-this-admin-password', enabled: true },
    { key: 'vendedorEmail', value: 'vendedor@example.test', enabled: true },
    { key: 'vendedorPassword', value: 'ClaveVendedorSegura123', enabled: true },
    { key: 'adminToken', value: '', enabled: true },
    { key: 'vendedorToken', value: '', enabled: true },
    { key: 'id', value: '00000000-0000-0000-0000-000000000001', enabled: true },
    { key: 'productoId', value: '00000000-0000-0000-0000-000000000001', enabled: true },
    { key: 'idProducto', value: '00000000-0000-0000-0000-000000000001', enabled: true },
    { key: 'idMarca', value: '00000000-0000-0000-0000-000000000010', enabled: true },
    { key: 'idCategoria', value: '00000000-0000-0000-0000-000000000011', enabled: true },
    { key: 'idUnidadMedida', value: '00000000-0000-0000-0000-000000000012', enabled: true },
    { key: 'idUbicacion', value: '00000000-0000-0000-0000-000000000013', enabled: true },
    { key: 'idModelo', value: '00000000-0000-0000-0000-000000000002', enabled: true },
    { key: 'idCliente', value: '00000000-0000-0000-0000-000000000003', enabled: true },
    { key: 'idProveedor', value: '00000000-0000-0000-0000-000000000004', enabled: true },
    { key: 'idVenta', value: '00000000-0000-0000-0000-000000000005', enabled: true },
    { key: 'idPago', value: '00000000-0000-0000-0000-000000000006', enabled: true },
    { key: 'idCompra', value: '00000000-0000-0000-0000-000000000007', enabled: true },
    { key: 'idSolicitud', value: '00000000-0000-0000-0000-000000000008', enabled: true },
    { key: 'idUsuario', value: '00000000-0000-0000-0000-000000000009', enabled: true },
  ],
  _postman_variable_scope: 'environment',
};

const openapi = buildOpenApi();
writeFileSync(join(docsDir, 'openapi.yaml'), YAML.stringify(openapi), 'utf8');
writeFileSync(
  join(postmanDir, 'Electronica_Central_AZ.postman_collection.json'),
  JSON.stringify(buildPostman(), null, 2),
  'utf8',
);
writeFileSync(
  join(postmanDir, 'Electronica_Central_AZ.local.postman_environment.json'),
  JSON.stringify(environment, null, 2),
  'utf8',
);

process.stdout.write(`Generated ${endpoints.length} endpoints → docs/openapi.yaml + postman/*\n`);

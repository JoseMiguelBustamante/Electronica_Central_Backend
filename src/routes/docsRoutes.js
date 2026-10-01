import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yaml';

const openapiPath = join(dirname(fileURLToPath(import.meta.url)), '../../docs/openapi.yaml');

export const createDocsRouter = () => {
  const document = YAML.parse(readFileSync(openapiPath, 'utf8'));
  const router = Router();

  router.get('/openapi.yaml', (_req, res) => {
    res.type('application/yaml').send(readFileSync(openapiPath, 'utf8'));
  });
  router.get('/openapi.json', (_req, res) => {
    res.json(document);
  });
  router.use('/', swaggerUi.serve, swaggerUi.setup(document, {
    customSiteTitle: 'Electrónica Central AZ — API Docs',
  }));

  return router;
};

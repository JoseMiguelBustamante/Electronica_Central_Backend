import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import express from 'express';
import healthRouter from './routes/healthRoutes.js';
import authRouter from './routes/authRoutes.js';
import catalogRouter from './routes/catalogRoutes.js';
import { createDocsRouter } from './routes/docsRoutes.js';
import inventoryRouter from './routes/inventoryRoutes.js';
import purchaseRouter from './routes/purchaseRoutes.js';
import paymentRouter from './routes/paymentRoutes.js';
import reportRouter from './routes/reportRoutes.js';
import requestRouter from './routes/requestRoutes.js';
import saleRouter from './routes/saleRoutes.js';
import supplierRouter from './routes/supplierRoutes.js';
import securityRouter from './routes/securityRoutes.js';
import { corsMiddleware } from './middlewares/corsMiddleware.js';
import { sendError } from './utils/sendError.js';

/** Folder of product photos named `<codigo>.jpg` (see media/productos/README.md). */
const productImagesDir =
  process.env.PRODUCT_IMAGES_DIR?.trim() || join(process.cwd(), 'media', 'productos');

export const createApp = () => {
  const app = express();

  mkdirSync(productImagesDir, { recursive: true });

  app.use(corsMiddleware);
  app.use(express.json());
  app.use(
    '/media/productos',
    express.static(productImagesDir, {
      fallthrough: false,
      maxAge: '7d',
      index: false,
    }),
  );
  app.use(healthRouter);
  app.use('/api/docs', createDocsRouter());
  app.use('/api/auth', authRouter);
  app.use('/api', catalogRouter);
  app.use('/api/inventario', inventoryRouter);
  app.use('/api/proveedores', supplierRouter);
  app.use('/api/compras', purchaseRouter);
  app.use('/api/ventas', saleRouter);
  app.use('/api/pagos', paymentRouter);
  app.use('/api/solicitudes', requestRouter);
  app.use('/api/reportes', reportRouter);
  app.use('/api', securityRouter);
  app.use((error, _req, res, next) => {
    void next;
    return sendError(res, error);
  });

  return app;
};

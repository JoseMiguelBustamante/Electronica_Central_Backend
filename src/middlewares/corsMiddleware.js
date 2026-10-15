import { env } from '../config/env.js';

const ALLOWED_METHODS = 'GET,POST,PATCH,DELETE,OPTIONS';
const ALLOWED_HEADERS = 'Authorization, Content-Type';

export const corsMiddleware = (req, res, next) => {
  if (req.headers.origin === env.FRONTEND_ORIGIN) {
    res.setHeader('Access-Control-Allow-Origin', env.FRONTEND_ORIGIN);
    res.setHeader('Access-Control-Allow-Headers', ALLOWED_HEADERS);
    res.setHeader('Access-Control-Allow-Methods', ALLOWED_METHODS);
    res.setHeader('Vary', 'Origin');
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  return next();
};

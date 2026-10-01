export const getHealthService = () => ({ status: 'ok' });

import { isDatabaseReady } from '../lib/database.js';

export const getReadinessService = async () => {
  const ready = await isDatabaseReady();
  return ready ? { status: 'ready' } : { status: 'not_ready', reason: 'database_unavailable' };
};

import { createApp } from './src/app.js';
import { env } from './src/config/env.js';
import { logger } from './src/lib/logger.js';

const app = createApp();



app.listen(env.PORT, () => {
  logger.info('server_started', { port: env.PORT });
});

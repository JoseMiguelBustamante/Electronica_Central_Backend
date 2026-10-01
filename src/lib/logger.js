const write = (level, event, context = {}) => {
  process.stdout.write(`${JSON.stringify({ level, event, ...context, timestamp: new Date().toISOString() })}\n`);
};

export const logger = {
  info: (event, context) => write('info', event, context),
  warn: (event, context) => write('warn', event, context),
  error: (event, context) => write('error', event, context),
};

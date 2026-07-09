import config from '@/config/env';

type Level = 'debug' | 'info' | 'warn' | 'error';
const isProd = config.server.env === 'production';

function emit(level: Level, message: string, meta?: Record<string, unknown>): void {
  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  if (isProd) {
    fn(JSON.stringify({ level, time: new Date().toISOString(), message, ...(meta ?? {}) }));
  } else {
    const extra = meta && Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    fn(`[${level.toUpperCase()}] ${message}${extra}`);
  }
}

export const logger = {
  debug: (m: string, meta?: Record<string, unknown>) => emit('debug', m, meta),
  info: (m: string, meta?: Record<string, unknown>) => emit('info', m, meta),
  warn: (m: string, meta?: Record<string, unknown>) => emit('warn', m, meta),
  error: (m: string, meta?: Record<string, unknown>) => emit('error', m, meta),
};

import pino from 'pino';

export const logger = pino({
	level: process.env.LOG_LEVEL || 'info',
});

export function createRequestLogger(requestId: string) {
	return logger.child({ requestId });
}

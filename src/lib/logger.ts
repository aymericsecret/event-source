import bunyan from 'bunyan';

type Logger = bunyan;

const logger: Logger = bunyan.createLogger({ name: "event-source "});

export {
	logger,
	Logger
};
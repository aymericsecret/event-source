import { logger } from './logger';

const start = async () => {
	logger.info('[App] Starting the app');
  
};

if (!module.parent) {
	start()
		.then(() => logger.info('[App] started'))
		.catch((err: Error) => {
			console.error('[App] Unknown error when starting app', err);
			process.exit(1);
		});
}
import { pool } from './lib/db';
import { logger } from './lib/logger';
import { WorkerEventStore } from './EventStore/WorkerEventStore';

const start = async () => {
	logger.info('[App] Starting the app');

	const workerStore = new WorkerEventStore('worker_store', pool);
	await workerStore.setNewLocation('1234', { lat: 1, lng: 9 }, new Date('2021-10-02 16:00:35.713'));
	
	await Promise.all([
		workerStore.setNewLocation('1234', { lat: 4, lng: 6 }, new Date('2021-10-02 16:20:35.713')),
		workerStore.setNewLocation('1234', { lat: 5, lng: 7 }, new Date('2021-10-02 16:30:35.713')),
		workerStore.setNewLocation('1234', { lat: 6, lng: 8 }, new Date('2021-10-02 16:40:35.713')),
		workerStore.setNewLocation('1234', { lat: 7, lng: 9 }, new Date('2021-10-02 16:50:35.713')),
		workerStore.forceLocation('1234')
	]);
	await workerStore.setNewLocation('1234', { lat: 8, lng: 10 }, new Date('2021-10-02 17:00:35.713'));
	
	await workerStore.getEvents('1234');
	await workerStore.getLastEvent('1234');
};

if (!module.parent) {
	start()
		.then(() => logger.info('[App] started'))
		.catch((err: Error) => {
			console.error('[App] Unknown error when starting app', err);
			process.exit(1);
		});
}
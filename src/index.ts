import { logger } from './lib/logger';
import { WorkerEventStore } from './Model/DB';

const start = async () => {
	logger.info('[App] Starting the app');

	const workerStore = new WorkerEventStore('worker_location_store');
	const event = workerStore.setNewLocation('1234', { lat: 1, lng: 9 });
	Promise.all([
		workerStore.setNewLocation('1234', { lat: 4, lng: 6 }),
		workerStore.setNewLocation('1234', { lat: 4, lng: 6 })
	]);
	workerStore.setNewLocation('1234', { lat: 4, lng: 6 });
	console.log('event', event);
	
	const events = workerStore.getEvents('1234');
	const lastEvent = workerStore.getLastEvent('1234');
	
	console.log('events', events);
	console.log('lastEvent', lastEvent);
};

if (!module.parent) {
	start()
		.then(() => logger.info('[App] started'))
		.catch((err: Error) => {
			console.error('[App] Unknown error when starting app', err);
			process.exit(1);
		});
}
import { workerData } from "worker_threads";

interface Location {
	lat: number;
	lng: number;
}

interface Worker {
	id: string;
	location: Location;
	locationDate: Date;
}

interface WorkerLocationStore {
	aggregateId: string;
	version: number;
	lat: number;
	lng: number;
	locationDate: Date;
	createdAt: Date;
}

interface DbData {
	aggregateId: string;
	version: number;
	[key: string]: any;
}

interface DB {
	name: string;
	data: DbData[],
}

interface WorkerDb {
	name: string;
	data: Worker[],
}
interface WorkerLocationStoreDb {
	name: string;
	data: WorkerLocationStore[],
}

const db: DB[] = [
	{
		name: workerData,
		data: []
	},
	{
		name: 'workerLocationStore',
		data: []
	}
];

const DB_NAMES = {
	WORKER: 'worker',
	WORKER_LOCATION_STORE: 'worker_location_store'
};

const workerLocationStoreDB: WorkerLocationStoreDb = {
	name: DB_NAMES.WORKER_LOCATION_STORE,
	// type: 'EVENT_STORE',
	data: [] 
};

db.push(workerLocationStoreDB);

abstract class EventStore {
	// eslint-disable-next-line @typescript-eslint/no-empty-function
	constructor() {}

	protected _getEventStore(eventStoreName: string): DB {
		const eventStore = db.find(({ name }) => name === eventStoreName);
		if(!eventStore) {
			throw new Error('Event store not found');
		}
		return eventStore;
	}

	protected _getLastVersion(eventStoreName: string, aggregateId: string) {
		const eventStore = this._getEventStore(eventStoreName);
		const aggregateEvent = eventStore.data.filter((store) => store.aggregateId === aggregateId);
		const lastEvent = aggregateEvent.sort((a, b) => b.version - a.version);
		console.log('HAH', lastEvent);
		const lastVersion = lastEvent.length ? lastEvent[0].version : 1; 
		return lastVersion;
	}

	protected _getNextVersion(eventStoreName: string, aggregateId: string) {
		const lastVersion = this._getLastVersion(eventStoreName, aggregateId);
		const nextVersion = lastVersion + 1; 
		return nextVersion;
	}

	protected _add(eventStoreName: string, aggregateId: string, data: any) {
		const nextVersion = this._getNextVersion(eventStoreName, aggregateId);
		const eventStore = this._getEventStore(eventStoreName);
		const newEvent = {
			aggregateId,
			version: nextVersion,
			...data,
			createdAt: new Date()
		};

		// In PG , could fail during push is a concurent action occures
		try {
			eventStore.data.push(newEvent);
		} catch(err) {
			// retry with next version
			// Maybe check the time of the first action, to see if it was done later !
		}
		return newEvent; 
	}

	public getLastEvent(eventStoreName: string, aggregateId: string) {
		const lastVersion = this._getLastVersion(eventStoreName, aggregateId);
		const eventStore = this._getEventStore(eventStoreName);
		
		const lastEvent = eventStore.data.find((event) => event.aggregateId === aggregateId && event.version === lastVersion);
		return lastEvent;
	}

	public getEvents(eventStoreName: string, aggregateId: string) {
		const eventStore = this._getEventStore(eventStoreName);
		
		const events = eventStore.data.filter((event) => event.aggregateId === aggregateId);
		return events;
	}

}

const WORKER_EVENT_TYPES = {
	LOCATION_UPDATED: 'locationUpdated',
	LOCATION_FORCED: 'locationForces',
} as const;
type WorkerEventTypeKeys = keyof typeof WORKER_EVENT_TYPES;
type WorkerEventTypeValues = typeof WORKER_EVENT_TYPES[WorkerEventTypeKeys];

class WorkerEventStore extends EventStore {
	public eventStoreName;

	constructor(eventStoreName: string) {
		super();
		this.eventStoreName = eventStoreName;
	}

	public async addEvent(eventType: WorkerEventTypeValues, aggregateId: string, dataToUpdate: any) {
		const nextVersion = this._getNextVersion(this.eventStoreName, aggregateId);
		const eventStore = this._getEventStore(this.eventStoreName);

		const newEvent = {
			aggregateId,
			version: nextVersion,
			eventType,
			...dataToUpdate,
			createdAt: new Date()
		};
		eventStore.data.push(newEvent);
		return newEvent; 
	}

	public async setNewLocation(workerId: Worker['id'], newLocation: Location) {
		const eventType = WORKER_EVENT_TYPES.LOCATION_UPDATED;
		return this.addEvent(eventType, workerId, newLocation);
	}

	public async forceLocation(workerId: Worker['id']) {
		const eventType = WORKER_EVENT_TYPES.LOCATION_FORCED;
		const updatedData = {
			forcedLocationAt :new Date()
		};
		return this.addEvent(eventType, workerId, updatedData);
	}

	public getEvents(aggregateId: string) {
		return super.getEvents(this.eventStoreName, aggregateId);
	}

	public getLastEvent(aggregateId: string) {
		return super.getLastEvent(this.eventStoreName, aggregateId);
	}
}


export { DB, WorkerEventStore };
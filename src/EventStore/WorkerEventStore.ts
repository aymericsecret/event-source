import { AbstractEventStore } from './AbstractEventStore';
import { DB } from '../lib/db';
import { logger } from '../lib/logger';

interface Location {
	lat: number;
	lng: number;
}

interface Worker {
	id: string;
	location: Location;
	locationDate: Date;
}

const WORKER_EVENT_TYPES = {
	LOCATION_UPDATED: 'locationUpdated',
	LOCATION_FORCED: 'locationForced',
} as const;
type WorkerEventTypeKeys = keyof typeof WORKER_EVENT_TYPES;
type WorkerEventTypeValues = typeof WORKER_EVENT_TYPES[WorkerEventTypeKeys];

class WorkerEventStore extends AbstractEventStore {
	constructor(eventStoreName: string, db: DB) {
		super(eventStoreName, db);
	}

	private _setNewLocationDuplicateHandler(workerId: Worker['id'], newLocation: Location, locationDate: Date) {
		return async (duplicateEvent: any) => {
			logger.info('[SET_NEW_LOCATION] Retry', { locationDate, duplicateLocationDate: duplicateEvent });
			if(!duplicateEvent.location_date || duplicateEvent.location_date < locationDate) {
				return this.setNewLocation(workerId, newLocation, locationDate);
			}
		};
	}

	private _setForcedLocationDuplicateHandler(workerId: Worker['id']) {
		return () => {
			return this.forceLocation(workerId);
		};
	}

	public async setNewLocation(workerId: Worker['id'], newLocation: Location, locationDate: Date) {
		const eventType = WORKER_EVENT_TYPES.LOCATION_UPDATED;
		return this._add(workerId, eventType, ['lat', 'lng', 'location_date'], [newLocation.lat, newLocation.lng, locationDate], this._setNewLocationDuplicateHandler(workerId, newLocation, locationDate));
	}

	public async forceLocation(workerId: Worker['id']) {
		const eventType = WORKER_EVENT_TYPES.LOCATION_FORCED;
		return this._add(workerId, eventType, ['forced_location_at'], [new Date], this._setForcedLocationDuplicateHandler(workerId));
	}

	public async getEvents(aggregateId: string) {
		return super.getEvents(aggregateId);
	}

	public async getLastEvent(aggregateId: string) {
		return super.getLastEvent(aggregateId);
	}
}

export { WorkerEventStore };
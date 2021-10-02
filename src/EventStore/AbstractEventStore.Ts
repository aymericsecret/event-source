import { DB } from '../lib/db';
import { logger } from '../lib/logger';

abstract class AbstractEventStore {
	private _db: DB;
	public eventStoreName: string;

	constructor(eventStoreName: string, db: DB) {
		this._db = db;
		this.eventStoreName = eventStoreName;	
	}

	protected async _getLastEvent(aggregateId: string): Promise<any | undefined> {
		const { rows: [lastEvent] } = await this._db.query(`
			SELECT version
			FROM ${this.eventStoreName} 
			WHERE 
				aggregate_id = $1 
			ORDER BY version DESC
			LIMIT 1;
		`, [aggregateId]);
		return lastEvent;
	}

	protected async _getNextVersion(aggregateId: string) {
		const lastEvent = await this._getLastEvent(aggregateId);
		const nextVersion = lastEvent ? Number(lastEvent.version) + 1 : 1; 
		return nextVersion;
	}

	protected async _add(aggregateId: string, eventType: string, fields: string[], values: any[], conflictHandler: (duplicateEvent: any) => void) {
		const nextVersion = await this._getNextVersion(aggregateId);

		try {
			const firstIndex = 4;
			const queryFields = fields.reduce((query: string, field) => query ? `${query}, ${field}` : field, '');
			const queryValues = values.reduce((query: string, _field, index) => query ? `${query}, $${firstIndex + index + 1}` : `$${firstIndex + index + 1}`, '');

			// Maybe add check on event_emit_date to make sure events are sequentials
			const query = `
				INSERT INTO ${this.eventStoreName} 
					(aggregate_id, version, event_type, created_at, ${queryFields})
				VALUES ($1, $2, $3, $4, ${queryValues})
				RETURNING *;
			`;

			const { rows: [insertedEvent] } = await this._db.query(query, [aggregateId, nextVersion, eventType, new Date(), ...values]);

			logger.info('[ADD_EVENT] New event inserted', insertedEvent);
			return insertedEvent; 
		} catch(err) {
			const duplicateQuery = `
			SELECT *
			FROM ${this.eventStoreName} 
			WHERE aggregate_id = $1 AND version = $2;
			`;
			const { rows: [duplicateEvent] } = await this._db.query(duplicateQuery, [aggregateId, nextVersion]);
			
			logger.warn('[ADD_EVENT] Error', { err, duplicateEvent });
			return await conflictHandler(duplicateEvent);
		}
	}

	public async getLastEvent(aggregateId: string) {
		const { rows: [lastEvent] } = await this._db.query(`
			SELECT *
			FROM ${this.eventStoreName} 
			WHERE 
				aggregate_id = $1 
			ORDER BY version DESC
			LIMIT 1;
		`, [aggregateId]);
		return lastEvent as any;
	}

	public async getEvents(aggregateId: string) {
		const { rows: [events] } = await this._db.query(`
			SELECT *
			FROM ${this.eventStoreName} 
			WHERE 
				aggregate_id = $1 
			ORDER BY version ASC;
		`, [aggregateId]);
		return events as any;
	}

}

export {
	AbstractEventStore
};
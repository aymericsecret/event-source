import pg from 'pg';
import { config } from '../config';
import { logger } from './logger';
import { name as packageName } from '../../package.json';

type DB = pg.Pool;

const { uri } = config.postgresql;

const formatConnectionString = (connectionString: string) => connectionString.replace('#', '%23');

const pool = new pg.Pool({
	connectionString: formatConnectionString(uri),
	// eslint-disable-next-line camelcase
	application_name: packageName,
});

pool.on('error', err => logger.error(err));

// use to directly check the db connection
pool
	.query('SELECT 1')
	.then(() => logger.info('[POSTGRES_CONNECTION_POOL] Connection initialized.'))
	.catch(e => logger.error('[POSTGRES_CONNECTION_POOL] Connection failed.', e));

export {
	pool, DB
};

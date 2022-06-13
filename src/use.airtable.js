import HttpError from './error.http';
import useURL from './use.url';
import { flattenRecord, useRecords } from './use.records';

const BASE_URL = 'https://api.airtable.com/v0';

export default ({ base, token, baseURL = BASE_URL } = {}) => {
	if (!base) throw new Error('Airtable base is required');
	if (!token) throw new Error('Airtable API token is required');

	const buildURL = useURL({ baseURL, base });

	const query = async (resource, options = {}) => {
		if (!resource) throw new Error('Airtable resource is required');
		const url = buildURL(resource, options);
		const headers = { Authorization: `Bearer ${token}` };
		const response = await fetch(url.toString(), { headers });
		const { status, statusText } = response;
		if (HttpError.isErrorCode(status)) throw new HttpError(status, statusText);
		return response.json();
	};

	const select = async (table, options = {}) => {
		if (!table) throw new Error('Airtable table is required');
		const response = await query(table, options);
		const records = useRecords(response.records, select, options);
		// Each method determines internally if action must be performed
		await records.persist(table, response.offset);
		await records.expand();
		records.flatten();
		return records.getAll();
	};

	const find = async (table, id, options = {}) => {
		if (!table) throw new Error('Airtable table is required');
		if (!id) throw new Error('Airtable record id is required');
		const record = await query(`${table}/${id}`, options);
		return flattenRecord(record);
	};

	return { query, select, find };
};

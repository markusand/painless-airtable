import HttpError from './error.http';
import useURL from './use.url';
import { flattenRecord, expandRecords, indexateRecords } from './use.records';

export const BASE_URL = 'https://api.airtable.com/v0';

export default ({ base, token, baseURL = BASE_URL } = {}) => {
	if (!base) throw new Error('Airtable base is required');
	if (!token) throw new Error('Airtable API token is required');

	const buildURL = useURL({ baseURL, base });

	const query = async (resource, options = {}) => {
		if (!resource) throw new Error('Airtable resource is required');
		const url = buildURL(resource, options);
		const headers = { Authorization: `Bearer ${token}` };
		const response = await fetch(url, { headers });
		const { status, statusText } = response;
		if (HttpError.isErrorCode(status)) {
			const errorMessage = `Error with resource '${resource}': ${status} ${statusText}`;
			throw new HttpError(status, errorMessage);
		}
		return response.json();
	};

	const select = async (table, options = {}) => {
		if (!table) throw new Error('Airtable table is required');
		const { persist, expand, index, flatten = true } = options;

		const { records, offset } = await query(table, options);

		// Retrieve more records (raw, do not apply any tansformation)
		if (persist && offset) {
			const forceRaw = { expand: false, flatten: false, index: false };
			const more = await select(table, { ...options, ...forceRaw, offset });
			records.push(...more);
		}

		if (expand) {
			const expanded = await expandRecords(records, expand, select);
			Object.assign(records, expanded);
		}

		if (flatten) Object.assign(records, records.map(flattenRecord));

		return index ? indexateRecords(records) : records;
	};

	const find = async (table, id, options = {}) => {
		if (!table) throw new Error('Airtable table is required');
		if (!id) throw new Error('Airtable record id is required');
		const record = await query(`${table}/${id}`, options);
		return flattenRecord(record);
	};

	return { query, select, find };
};

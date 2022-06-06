import HttpError from './error.http';
import createFormula from './formula';
import { flattenRecord, useRecords } from './use.records';

const BASE_URL = 'https://api.airtable.com/v0';

export default ({ base, token, baseURL = BASE_URL } = {}) => {
	if (!base) throw new Error('Airtable base is required');
	if (!token) throw new Error('Airtable API token is required');
	const CONFIG = { headers: { Authorization: `Bearer ${token}` } };

	const buildURL = (resource, options = {}) => {
		if (!resource) throw new Error('Airtable resource is required');
		const { base: overrideBase, fields = [], sort = {}, max, view, offset, where } = options;
		const url = new URL(`${baseURL}/${overrideBase || base}/${resource}`);

		// Add direct parameters (if required)
		if (view) url.searchParams.append('view', view);
		if (max) url.searchParams.append('maxRecords', max);
		if (offset) url.searchParams.append('offset', offset);

		// Serialize fields[] option
		fields.forEach(field => url.searchParams.append('fields[]', field));

		// Serialize sort options
		Object.entries(sort).forEach(([field, order], i) => {
			url.searchParams.append(`sort[${i}][field]`, field);
			url.searchParams.append(`sort[${i}][direction]`, order);
		});

		// Build filter formula
		const formula = createFormula(where);
		if (formula) url.searchParams.append('filterByFormula', formula);

		return url;
	};

	const query = async (resource, options = {}) => {
		if (!resource) throw new Error('Airtable resource is required');
		const url = buildURL(resource, options);
		const response = await fetch(url.toString(), CONFIG);
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

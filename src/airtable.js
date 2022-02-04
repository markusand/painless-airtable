import HttpError from './error.http';
import createFormula from './formula';

const BASE_URL = 'https://api.airtable.com/v0';

export default ({ base, token, baseURL = BASE_URL }) => {
	const CONFIG = { headers: { Authorization: `Bearer ${token}` } };

	const flattenRecord = record => ({
		_id: record.id,
		_created: record.createdTime,
		...record.fields,
	});

	const expandRecords = async (records, expand) => Promise.all(
		Object.entries(expand).map(async ([field, { table, options }]) => {
			const ids = [...new Set(records.flatMap(record => record[field]))];
			const byId = `OR(${ids.map(id => `RECORD_ID()='${id}'`).join(',')})`;
			// eslint-disable-next-line no-use-before-define
			const expanded = await select(`${table}?filterByFormula=${byId}`, {
				...options,
				index: true,
			});
			records.forEach(record => { record[field] = record[field]?.map(id => expanded[id]); });
		}),
	);

	const buildURL = (resource, options) => {
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
		const url = buildURL(resource, options);
		const response = await fetch(url.toString(), CONFIG);
		const { status, statusText } = response;
		if (HttpError.isErrorCode(status)) throw new HttpError(status, statusText);
		return response.json();
	};

	const select = async (table, options = {}) => {
		const { index, persist, expand } = options;
		const { records = [], offset } = await query(table, options);
		const current = index ? records.reduce((acc, record) => {
			acc[record.id] = flattenRecord(record);
			return acc;
		}, {}) : records.map(flattenRecord);
		if (expand) await expandRecords(current, expand);
		const next = offset && persist ? await select(table, { ...options, offset }) : [];
		return index ? { ...current, ...next } : [...current, ...next];
	};

	const find = async (table, id, options = {}) => {
		const record = await query(`${table}/${id}`, options);
		return flattenRecord(record);
	};

	return { query, select, find };
};

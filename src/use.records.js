export const flattenRecord = record => ({
	_id: record.id,
	_created: record.createdTime,
	...record.fields,
});

export const indexateRecords = records => records.reduce((acc, record) => {
	const id = record._id || record.id; // eslint-disable-line no-underscore-dangle
	acc[id] = record;
	return acc;
}, {});

export const expandRecords = async (records, expand, select) => {
	// Recollect all unique record IDs for each field and query them to the API
	const expandable = Object.fromEntries(await Promise.all(
		Object.entries(expand).map(async ([field, { table, options = {} }]) => {
			const ids = records.flatMap(record => record.fields[field]).filter(Boolean);
			const unique = [...new Set(ids)].map(id => `RECORD_ID()='${id}'`).join(',');
			const url = `${table}?filterByFormula=OR(${unique})`;
			const expanded = await select(url, { ...options, index: true });
			return [field, expanded];
		}),
	));
	// Replace expandable IDs with their expanded records
	return records.map(record => {
		const fields = Object.entries(record.fields).reduce((acc, [field, value]) => {
			acc[field] = expandable[field] ? value.map(id => expandable[field][id]) : value;
			return acc;
		}, {});
		return { ...record, fields };
	});
};

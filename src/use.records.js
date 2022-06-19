export const flattenRecord = record => ({
	_id: record.id,
	_created: record.createdTime,
	...record.fields,
});

export const indexRecords = records => records.reduce((acc, record) => {
	const id = record._id || record.id; // eslint-disable-line no-underscore-dangle
	acc[id] = record;
	return acc;
}, {});

export const useRecords = (dirtyRecords = [], select, options = {}) => {
	let records = dirtyRecords;

	const persist = async (table, offset) => {
		if (!options.persist || !offset) return;
		const forceRaw = { flatten: false, expand: false, index: false };
		const more = await select(table, { ...options, offset, ...forceRaw });
		records = [...records, ...more];
	};

	const expand = async () => {
		if (!options.expand) return;
		// Recollect all unique record IDs for each field and query them to the API
		const queries = Object.entries(options.expand).map(async ([field, expander]) => {
			const ids = records.flatMap(record => record.fields[field]);
			const unique = [...new Set(ids)].map(id => `RECORD_ID()='${id}'`).join(',');
			const url = `${expander.table}?filterByFormula=OR(${unique})`;
			// eslint-disable-next-line no-use-before-define
			const expanded = await select(url, { ...expander.options, index: true });
			return { field, expanded };
		});
		// Wait for all queries to complete
		const expandable = await Promise.all(queries);
		// Replace expandable IDs with their expanded records
		records = records.map(({ fields, ...rest }) => {
			const expandedFields = expandable.reduce((acc, { field, expanded }) => {
				if (fields[field]) acc[field] = fields[field].map(id => expanded[id]);
				return acc;
			}, {});
			return { ...rest, fields: { ...fields, ...expandedFields } };
		});
	};

	const getAll = () => {
		const { index, flatten = true } = options;
		const flatRecords = flatten ? records.map(flattenRecord) : records;
		return index ? indexRecords(flatRecords) : flatRecords;
	};

	return { flattenRecord, expand, persist, getAll };
};

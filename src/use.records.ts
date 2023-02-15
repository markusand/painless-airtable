import type { AirtableRawRecord, AirtableRecord, AirtableExpandOptions, AirtableSelect } from './types';

export const flattenRecord = <T>(record: AirtableRawRecord<T>): AirtableRecord<T> => ({
	_id: record.id,
	_created: record.createdTime,
	...record.fields,
});

export const indexateRecords = <T>(records: (AirtableRawRecord<T> | AirtableRecord<T>)[]) => (
	records.reduce((acc, record) => {
		const id = '_id' in record ? record._id : record.id;
		acc[id] = record;
		return acc;
	}, {} as Record<string, AirtableRawRecord<T> | AirtableRecord<T>>)
);

export const expandRecords = async <T extends object>(
	records: AirtableRawRecord<T>[],
	expand: AirtableExpandOptions,
	select: AirtableSelect,
) => {
	// Recollect all unique record IDs for each field and query them to the API
	const expandable = Object.fromEntries(await Promise.all(
		Object.entries(expand).map(async ([field, { table, options = {} }]) => {
			const ids = records.flatMap(record => record.fields[field as keyof T]).filter(Boolean);
			const unique = [...new Set(ids)].map(id => `RECORD_ID()='${id}'`).join(',');
			const url = `${table}?filterByFormula=OR(${unique})`;
			const expanded = await select(url, { ...options, index: true });
			return [field, expanded];
		}),
	));
	// Replace expandable IDs with their expanded records
	return records.map(record => {
		const fields = Object.entries(record.fields).reduce((acc, [field, value]) => {
			acc[field] = expandable[field] ? value.map((id: string) => expandable[field][id]) : value;
			return acc;
		}, {} as Record<string, any>);
		return { ...record, fields };
	});
};

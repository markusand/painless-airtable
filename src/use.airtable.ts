import HttpError from './error.http';
import useURL from './use.url';
import { flattenRecord, expandRecords, indexateRecords } from './use.records';
import type { AirtableOptions, AirtableSelectOptions, AirtableFindOptions, AirtableResponse, AirtableRawRecord, AirtableSelect, AirtableFind } from './types';

export const BASE_URL = 'https://api.airtable.com/v0';

export default ({ base, token, baseURL = BASE_URL }: AirtableOptions) => {
	if (!base) throw new Error('Airtable base is required');
	if (!token) throw new Error('Airtable API token is required');

	const buildURL = useURL(baseURL, base);

	const query = async <T>(resource: string, options?: AirtableSelectOptions) => {
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

	// @ts-ignore Return type inference is correct on use, but this triggers a ts error
	const select: AirtableSelect = async <T extends object>(table: string, options?: AirtableSelectOptions) => {
		if (!table) throw new Error('Airtable table is required');
		const { persist, expand, index, flatten = true } = options || {};
		const { records, offset } = await query(table, options) as AirtableResponse<T>;
		// Retrieve more raw records.
		// Transoformations (flatten, expand, indexated) will be done after all together.
		if (persist && offset) {
			const forceRaw = { expand: undefined, flatten: false, index: false };
			const more = await select(table, { ...options, ...forceRaw, offset }) as AirtableRawRecord<T>[];
			records.push(...more);
		}
		// Replace linked records with their expanded object
		if (expand) {
			const expanded = await expandRecords(records, expand, select);
			Object.assign(records, expanded);
		}
		// Use plain objects, without Airtable's raw structure
		const flatRecords = flatten ? records.map(flattenRecord) : records;
		// Return records as array or indexed dictionary
		 return index ? indexateRecords(flatRecords) : flatRecords;
	};

	const find: AirtableFind = async <T extends object>(table: string, id: string, options?: AirtableFindOptions) => {
		if (!table) throw new Error('Airtable table is required');
		if (!id) throw new Error('Airtable record id is required');
		const record = await query(`${table}/${id}`, options);
		return flattenRecord(record);
	};

	return { query, select, find };
};

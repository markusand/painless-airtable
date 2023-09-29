import HttpError from './error.http';
import useURL from './use.url';
import { flattenRecord, expandRecords, indexateRecords } from './use.records';
import { toArray } from './utils';
import type {
	AirtableOptions,
	SelectOptions,
	FindOptions,
	UpdateOptions,
	AirtableResponse,
	AirtableRecord,
	AirtableRawRecord,
	AirtableSelect,
	AirtableFind,
	AirtableUpdate,
} from './types';

type AirtableQueryOptions = {
	_method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
	_data?: string;
} & SelectOptions;

export const BASE_URL = 'https://api.airtable.com/v0';

export default ({ base, token, baseURL = BASE_URL, fetchOptions: globalFetchOptions }: AirtableOptions) => {
	if (!base) throw new Error('Airtable base is required');
	if (!token) throw new Error('Airtable API token is required');

	const buildURL = useURL(baseURL, base);

	const query = async (resource: string, options?: AirtableQueryOptions) => {
		if (!resource) throw new Error('Airtable resource is required');
		const url = buildURL(resource, options);
		const {
			_method: method = 'GET',
			_data: body,
			fetchOptions = globalFetchOptions
		} = options || {};
		const headers = {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		};
		const response = await fetch(url, { method, headers, body, ...fetchOptions });
		const { status, statusText } = response;
		if (HttpError.isErrorCode(status)) {
			const errorMessage = `Error with resource '${resource}': ${status} ${statusText}`;
			throw new HttpError(status, errorMessage);
		}
		return response.json();
	};

	// @ts-ignore Return type inference is correct on use, but this triggers a ts error
	const select: AirtableSelect = async <T extends object>(table: string, options?: SelectOptions) => {
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

	const find: AirtableFind = async <T extends object>(table: string, id: string, options?: FindOptions) => {
		if (!table) throw new Error('Airtable table is required');
		if (!id) throw new Error('Airtable record id is required');
		const { flatten = true } = options || {};
		const record = await query(`${table}/${id}`, options) as AirtableRawRecord<T>;
		return flatten ? flattenRecord(record) : record;
	};

	const update: AirtableUpdate = async <T extends object>(
		table: string,
		data: Partial<AirtableRecord<T>>[] | Partial<AirtableRecord<T>>,
		options?: UpdateOptions
	) => {
		const { typecast, findBy, fetchOptions } = options || {};
		const performUpsert = findBy ? { fieldsToMergeOn: findBy } : undefined;
		const records = toArray(data).map(({ _id: id, _created, ...fields }) => ({ id, fields }));
		if (!findBy && records.some(record => !record.id)) throw new Error('Record id or findBy is required');
		const response = await query(table, {
			_method: 'PATCH',
			_data: JSON.stringify({ records, typecast, performUpsert }),
			fetchOptions,
		});
		const flatRecords = response.records.map(flattenRecord) as AirtableRecord<T>[];
		return Array.isArray(data) ? flatRecords : flatRecords[0];
	};

	return { query, select, find, update };
};

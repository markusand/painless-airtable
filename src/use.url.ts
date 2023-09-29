import createFormula from './formula';
import { SelectOptions } from './types';

export default (baseURL: string, base: string) => (resource: string, options?: SelectOptions): string => {
	if (!resource) throw new Error('Airtable resource is required');
	const { base: overrideBase, fields = [], sort = {}, max, view, offset, where } = options || {};
	const url = new URL(`${baseURL}/${overrideBase || base}/${resource}`);

	// Add direct parameters (if required)
	if (view) url.searchParams.append('view', view);
	if (max) url.searchParams.append('maxRecords', `${max}`);
	if (offset) url.searchParams.append('offset', offset);

	// Serialize fields[] option
	fields.forEach(field => url.searchParams.append('fields[]', field));

	// Serialize sort options
	Object.entries(sort).forEach(([field, order], i) => {
		url.searchParams.append(`sort[${i}][field]`, field);
		url.searchParams.append(`sort[${i}][direction]`, order);
	});

	// Build filter formula
	if (where) url.searchParams.append('filterByFormula', createFormula(where));

	return url.toString();
};

import createFormula from './formula';

export default ({ baseURL, base }) => (resource, options = {}) => {
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

	return url.toString();
};

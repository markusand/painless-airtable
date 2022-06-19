import useURL from '../use.url';

const baseURL = 'https://base_url';
const base = 'base';

const buildURL = useURL({ baseURL, base });

describe('useURL', () => {
	it('should return error if resource not provided', () => {
		expect.assertions(1);
		expect(() => buildURL()).toThrow('Airtable resource is required');
	});

	it('should create a basic url without parameters', () => {
		expect.assertions(1);
		const url = buildURL('table');
		expect(url).toBe('https://base_url/base/table');
	});

	it('should create url with direct parameters', () => {
		expect.assertions(1);
		const url = buildURL('table', { view: 'view', max: 100, offset: 'offset' });
		expect(url).toBe('https://base_url/base/table?view=view&maxRecords=100&offset=offset');
	});

	it('should create url with fields parameters', () => {
		expect.assertions(1);
		const url = buildURL('table', { fields: ['field1', 'field2'] });
		expect(decodeURI(url)).toBe('https://base_url/base/table?fields[]=field1&fields[]=field2');
	});

	it('should create url with sort parameters', () => {
		expect.assertions(1);
		const url = buildURL('table', { sort: { age: 'asc' } });
		expect(decodeURI(url)).toBe('https://base_url/base/table?sort[0][field]=age&sort[0][direction]=asc');
	});

	it('should create url with direct filter parameter', () => {
		expect.assertions(1);
		const url = buildURL('table', { where: 'string_filter' });
		expect(decodeURI(url)).toBe('https://base_url/base/table?filterByFormula=string_filter');
	});

	it('should create url with different filter parameters', () => {
		expect.assertions(7);

		// Encoded URL escaped characters = => %3D , => %2C

		const url1 = buildURL('table', { where: { age: 35 } });
		expect(decodeURI(url1)).toBe("https://base_url/base/table?filterByFormula=AND({age}%3D'35')");

		const url2 = buildURL('table', { where: { age: [20, 25, 30] } });
		expect(decodeURI(url2)).toBe("https://base_url/base/table?filterByFormula=AND(OR({age}%3D'20'%2C{age}%3D'25'%2C{age}%3D'30'))");

		const url3 = buildURL('table', { where: { age: { $lt: 35 } } });
		expect(decodeURI(url3)).toBe("https://base_url/base/table?filterByFormula=AND({age}<'35')");

		const url4 = buildURL('table', { where: { age: [20, { $gt: 35 }] } });
		expect(decodeURI(url4)).toBe("https://base_url/base/table?filterByFormula=AND(OR({age}%3D'20'%2C{age}>'35'))");

		const url5 = buildURL('table', { where: { is_valid: { checked: true } } });
		expect(decodeURI(url5)).toBe('https://base_url/base/table?filterByFormula=AND({is_valid}%3D1)');

		const url6 = buildURL('table', { where: { tags: { has: 'dev' } } });
		expect(decodeURI(url6)).toBe("https://base_url/base/table?filterByFormula=AND(FIND('dev'%2C{tags}))");

		const url7 = buildURL('table', { where: { type: { not: ['post', 'page'] } } });
		expect(decodeURI(url7)).toBe("https://base_url/base/table?filterByFormula=AND(NOT(OR({type}%3D'post'%2C{type}%3D'page')))");
	});
});

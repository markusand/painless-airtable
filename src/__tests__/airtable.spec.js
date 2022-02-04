/* eslint jest/require-hook: "off" */
import fetch from 'jest-fetch-mock';
import useAirtable from '../airtable';

fetch.enableMocks();

describe('initialize useAirtable service', () => {
	it('should throw error if missing required arguments', () => {
		expect.assertions(2);

		expect(() => useAirtable()).toThrow('Airtable base is required');
		expect(() => useAirtable({ base: 'BASE' })).toThrow('Airtable API token is required');
	});

	it('should throw error if invalid baseURL provided', async () => {
		expect.assertions(1);

		fetch.resetMocks();
		fetch.once(JSON.stringify({}));

		await expect(async () => {
			const airtable = useAirtable({ base: 'BASE', token: 'TOKEN', baseURL: 'INVALID_URL' });
			return airtable.select('TABLE');
		}).rejects.toThrow('Invalid URL');
	});
});

describe('useAirtable select', () => {
	const airtable = useAirtable({ base: 'BASE', token: 'TOKEN', baseURL: 'https://baseurl' });

	it('should throw error if table not provided', async () => {
		expect.assertions(1);

		await expect(airtable.select()).rejects.toThrow('Airtable table is required');
	});

	it('should make a valid select request', async () => {
		expect.assertions(3);

		fetch.resetMocks();
		fetch.once(JSON.stringify({ records: [] }));

		await airtable.select('TABLE');
		const [[url, options]] = fetch.mock.calls;

		expect(fetch.mock.calls).toHaveLength(1);
		expect(url).toBe('https://baseurl/BASE/TABLE');
		expect(options.headers.Authorization).toBe('Bearer TOKEN');
	});

	it('should create request with multiple attributes', async () => {
		expect.assertions(1);

		fetch.resetMocks();
		fetch.once(JSON.stringify({ records: [] }));

		await expect(airtable.select('TABLE', {
			view: 'VIEW',
			fields: ['FIELD1', 'FIELD2'],
			sort: { name: 'asc' },
			max: 10,
		})).resolves.toBeTruthy();
	});

	it('should throw error on API error', async () => {
		expect.assertions(2);

		fetch.resetMocks();
		fetch
			.once(undefined, { status: 404, statusText: 'Not Found' })
			.once(undefined, { status: 500, statusText: 'Internal error' });

		await expect(airtable.select('TABLE')).rejects.toThrow('Not Found');
		await expect(airtable.select('TABLE')).rejects.toThrow('Internal error');
	});

	it('should parse simple response', async () => {
		expect.assertions(4);

		fetch.resetMocks();
		fetch.once(JSON.stringify({
			records: [
				{ id: 'ID_1', fields: { name: 'John Doe' } },
				{ id: 'ID_2', fields: { name: 'Jane Doe' } },
			],
		}));

		const response = await airtable.select('TABLE');

		expect(Array.isArray(response)).toBe(true);
		expect(response).toHaveLength(2);
		expect(response[0]._id).toBe('ID_1'); // eslint-disable-line no-underscore-dangle
		expect(response[0].name).toBe('John Doe');
	});

	it('should return indexed results', async () => {
		expect.assertions(2);

		fetch.resetMocks();
		fetch.once(JSON.stringify({
			records: [
				{ id: 'ID_1', fields: { name: 'John Doe' } },
				{ id: 'ID_2', fields: { name: 'Jane Doe' } },
			],
		}));

		const response = await airtable.select('TABLE', { index: true });

		expect(Array.isArray(response)).toBe(false);
		expect(response).toHaveProperty('ID_1');
	});

	it('should expand records when required', async () => {
		expect.assertions(4);

		fetch.resetMocks();
		fetch
			.once(JSON.stringify({
				records: [
					{ id: 'ID_3', fields: { name: 'Johnnie Doe', parents: ['ID_1', 'ID_2'] } },
					{ id: 'ID_4', fields: { name: 'Johnnie Smith', parents: [] } },
				],
			}))
			.once(JSON.stringify({
				records: [
					{ id: 'ID_1', fields: { name: 'John Doe' } },
					{ id: 'ID_2', fields: { name: 'Jane Doe' } },
				],
			}));

		const response = await airtable.select('TABLE', { expand: { parents: { table: 'TABLE' } } });

		expect(fetch.mock.calls).toHaveLength(2);
		expect(response[0].parents[0].name).toBe('John Doe');
		expect(response[0].parents[1].name).toBe('Jane Doe');
		expect(response[1].parents).toHaveLength(0);
	});

	it('should persist paginated queries', async () => {
		expect.assertions(2);

		fetch.resetMocks();
		fetch
			.once(JSON.stringify({ records: [{ id: 'ID_1', fields: { name: 'John Doe' } }], offset: 'OFFSET' }))
			.once(JSON.stringify({ records: [{ id: 'ID_2', fields: { name: 'Jane Doe' } }] }));

		const response = await airtable.select('TABLE', { persist: true });

		expect(fetch.mock.calls).toHaveLength(2);
		expect(response).toHaveLength(2);
	});
});

describe('useAirtable find', () => {
	const airtable = useAirtable({ base: 'BASE', token: 'TOKEN', baseURL: 'https://baseurl' });

	it('should throw error if table or record id not provided', async () => {
		expect.assertions(3);

		fetch.resetMocks();
		fetch.once(JSON.stringify({ id: 'ID_1', fields: { name: 'John Doe' } }));

		await expect(airtable.find()).rejects.toThrow('Airtable table is required');
		await expect(airtable.find('TABLE')).rejects.toThrow('Airtable record id is required');
		await expect(airtable.find('TABLE', 'ID_1')).resolves.toBeTruthy();
	});
});

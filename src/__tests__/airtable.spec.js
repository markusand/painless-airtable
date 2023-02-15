/* eslint jest/require-hook: "off" */
import fetch from 'jest-fetch-mock';
import useAirtable, { BASE_URL } from '../use.airtable';

fetch.enableMocks();

const RECORDS = [
	{ id: 'ID_1', createdTime: '2020-03-25T21:38:30.000Z', fields: { name: 'John Doe', kids: ['ID_3'] } },
	{ id: 'ID_2', createdTime: '2020-03-25T21:38:40.000Z', fields: { name: 'Jane Doe', kids: ['ID_3'] } },
	{ id: 'ID_3', createdTime: '2020-03-25T21:38:50.000Z', fields: { name: 'Johnny Doe', parents: ['ID_1', 'ID_2'] } },
];

describe('useAirtable initialization', () => {
	it('should throw error if missing required arguments', () => {
		expect.assertions(3);
		expect(() => useAirtable()).toThrow('Airtable base is required');
		expect(() => useAirtable({ base: 'BASE' })).toThrow('Airtable API token is required');
		expect(() => useAirtable({ base: 'BASE', token: 'TOKEN' })).toBeTruthy();
	});

	it('should throw error if invalid baseURL provided', async () => {
		expect.assertions(1);
		const airtable = useAirtable({ base: 'BASE', token: 'TOKEN', baseURL: 'INVALID_URL' });
		await expect(() => airtable.select('TABLE')).rejects.toThrow('Invalid URL');
	});
});

describe('useAirtable query', () => {
	it('should throw error if resource not provided', async () => {
		expect.assertions(1);
		const airtable = useAirtable({ base: 'BASE', token: 'TOKEN' });
		await expect(airtable.query()).rejects.toThrow('Airtable resource is required');
	});

	it('should make a valid query', async () => {
		expect.assertions(4);
		fetch.resetMocks();
		fetch.once(JSON.stringify({ records: [] }));
		const airtable = useAirtable({ base: 'BASE', token: 'TOKEN' });
		const result = await airtable.query('TABLE');
		expect(fetch.mock.calls).toHaveLength(1);
		const [[url, options]] = fetch.mock.calls;
		expect(url).toBe(`${BASE_URL}/BASE/TABLE`);
		expect(options.headers.Authorization).toBe('Bearer TOKEN');
		expect(result).toStrictEqual({ records: [] });
	});

	it('should throw error on API error', async () => {
		expect.assertions(2);
		fetch.resetMocks();
		fetch
			.once(undefined, { status: 404, statusText: 'Not Found' })
			.once(undefined, { status: 500, statusText: 'Internal error' });
		const airtable = useAirtable({ base: 'BASE', token: 'TOKEN' });
		await expect(airtable.query('TABLE')).rejects.toThrow("Error with resource 'TABLE': 404 Not Found");
		await expect(airtable.query('TABLE')).rejects.toThrow("Error with resource 'TABLE': 500 Internal error");
	});
});

describe('useAirtable select', () => {
	const airtable = useAirtable({ base: 'BASE', token: 'TOKEN' });

	it('should throw error if table not provided', async () => {
		expect.assertions(1);
		await expect(airtable.select()).rejects.toThrow('Airtable table is required');
	});

	it('should return results with default parameters', async () => {
		expect.assertions(2);
		fetch.resetMocks();
		fetch.once(JSON.stringify({ records: RECORDS }));
		const result = await airtable.select('TABLE');
		expect(result).toHaveLength(3);
		expect(result[0]).toStrictEqual({
			_id: 'ID_1',
			_created: '2020-03-25T21:38:30.000Z',
			name: 'John Doe',
			kids: ['ID_3'],
		});
	});

	it('should return indexed results', async () => {
		expect.assertions(4);
		fetch.resetMocks();
		fetch.once(JSON.stringify({ records: RECORDS }));
		const result = await airtable.select('TABLE', { index: true });
		expect(Array.isArray(result)).toBe(false);
		expect(result).toHaveProperty('ID_1');
		expect(result.ID_1.name).toBe('John Doe');
		expect(result).toHaveProperty('ID_3');
	});

	it('should expand records when required', async () => {
		expect.assertions(7);
		fetch.resetMocks();
		fetch
			.once(JSON.stringify({ records: RECORDS })) // Return all records
			.once(JSON.stringify({ records: [RECORDS[2]] })) // Return ID_3
			.once(JSON.stringify({ records: RECORDS.slice(0, 2) })); // Return ID_1 & ID_2
		const result = await airtable.select('TABLE', {
			expand: {
				kids: { table: 'TABLE' },
				parents: { table: 'TABLE' },
			},
		});
		expect(fetch.mock.calls).toHaveLength(3);
		expect(result[0].kids[0].name).toBe('Johnny Doe');
		expect(result[1].kids[0].name).toBe('Johnny Doe');
		expect(result[2].kids).toBeUndefined();
		expect(result[2].parents).toHaveLength(2);
		expect(result[2].parents[0].name).toBe('John Doe');
		expect(result[2].parents[1].name).toBe('Jane Doe');
	});

	it('should recursively expand records', async () => {
		expect.assertions(4);
		fetch.resetMocks();
		fetch
			.once(JSON.stringify({ records: [RECORDS[0]] })) // Return ID_1
			.once(JSON.stringify({ records: [RECORDS[2]] })) // Return ID_3
			.once(JSON.stringify({ records: RECORDS.slice(0, 2) })); // Return ID_1 & ID_2
		const result = await airtable.select('TABLE', {
			expand: {
				kids: {
					table: 'TABLE',
					options: { expand: { parents: { table: 'TABLE' } } },
				},
			},
		});
		expect(fetch.mock.calls).toHaveLength(3);
		expect(result[0].kids[0].name).toBe('Johnny Doe');
		expect(result[0].kids[0].parents).toHaveLength(2);
		expect(result[0].kids[0].parents[0].name).toBe('John Doe');
	});

	it('should persist paginated indexed queries', async () => {
		expect.assertions(3);
		fetch.resetMocks();
		fetch
			.once(JSON.stringify({ records: RECORDS.slice(0, 2), offset: 'ID_3' }))
			.once(JSON.stringify({ records: [RECORDS[2]] }));
		const result = await airtable.select('TABLE', { persist: true });
		expect(fetch.mock.calls).toHaveLength(2);
		expect(result).toHaveLength(3);
		expect(result[2].name).toBe('Johnny Doe');
	});
});

describe('useAirtable find', () => {
	const airtable = useAirtable({ base: 'BASE', token: 'TOKEN' });

	it('should throw error if table or record id not provided', async () => {
		expect.assertions(2);
		await expect(airtable.find()).rejects.toThrow('Airtable table is required');
		await expect(airtable.find('TABLE')).rejects.toThrow('Airtable record id is required');
	});

	it('should return expected record', async () => {
		expect.assertions(1);
		fetch.resetMocks();
		fetch.once(JSON.stringify(RECORDS[2]));
		const result = await airtable.find('TABLE', 'ID_3');
		expect(result.name).toBe('Johnny Doe');
	});
});

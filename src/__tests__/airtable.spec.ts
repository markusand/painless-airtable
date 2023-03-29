/* eslint jest/require-hook: "off" */
import fetch from 'jest-fetch-mock';
import useAirtable, { BASE_URL } from '../use.airtable';
import type { AirtableResponse } from '../types';

fetch.enableMocks();

type Person = {
	name: string;
	kids?: string[];
	parents?: string[];
};

type ExpandedPerson = {
	name: string;
	kids?: ExpandedPerson[];
	parents?: ExpandedPerson[];
};

const RECORDS: AirtableResponse<Person>['records'] = [
	{ id: 'ID_1', createdTime: '2020-03-25T21:38:30.000Z', fields: { name: 'John Doe', kids: ['ID_3'] } },
	{ id: 'ID_2', createdTime: '2020-03-25T21:38:40.000Z', fields: { name: 'Jane Doe', kids: ['ID_3'] } },
	{ id: 'ID_3', createdTime: '2020-03-25T21:38:50.000Z', fields: { name: 'Johnny Doe', parents: ['ID_1', 'ID_2'] } },
];

describe('useAirtable initialization', () => {
	it('should initialize airtable composable', () => {
		expect.assertions(1);
		expect(() => useAirtable({ base: 'BASE', token: 'TOKEN' })).toBeTruthy();
	});

	it('should throw error if invalid baseURL provided', async () => {
		expect.assertions(1);
		const airtable = useAirtable({ base: 'BASE', token: 'TOKEN', baseURL: 'INVALID_URL' });
		await expect(() => airtable.select('TABLE')).rejects.toThrow('Invalid URL');
	});
});

describe('useAirtable query', () => {
	it('should make a valid query', async () => {
		expect.assertions(4);
		fetch.resetMocks();
		fetch.once(JSON.stringify({ records: [] }));
		const airtable = useAirtable({ base: 'BASE', token: 'TOKEN' });
		const result = await airtable.query('TABLE');
		expect(fetch.mock.calls).toHaveLength(1);
		const [[url, options]] = fetch.mock.calls;
		expect(url).toBe(`${BASE_URL}/BASE/TABLE`);
		// @ts-ignore Headers contains Authorization
		expect(options?.headers?.Authorization).toBe('Bearer TOKEN');
		expect(result).toStrictEqual({ records: [] });
	});

	it('should throw error on API error', async () => {
		expect.assertions(2);
		fetch.resetMocks();
		fetch
			.once('', { status: 404, statusText: 'Not Found' })
			.once('', { status: 500, statusText: 'Internal error' });
		const airtable = useAirtable({ base: 'BASE', token: 'TOKEN' });
		await expect(airtable.query('TABLE')).rejects.toThrow("Error with resource 'TABLE': 404 Not Found");
		await expect(airtable.query('TABLE')).rejects.toThrow("Error with resource 'TABLE': 500 Internal error");
	});

	it('should add extra fetch options', async () => {
		expect.assertions(1);
		fetch.resetMocks();
		fetch.once(JSON.stringify({ records: [] }));
		const airtable = useAirtable({
			base: 'BASE',
			token: 'TOKEN',
			fetchOptions: { key: 'value' },
		});
		await airtable.query('TABLE');
		const [[, options]] = fetch.mock.calls;
		expect(options).toHaveProperty('key', 'value');
	});
});

describe('useAirtable select', () => {
	const airtable = useAirtable({ base: 'BASE', token: 'TOKEN' });

	it('should add local extra fetch options', async () => {
		expect.assertions(1);
		fetch.resetMocks();
		fetch.once(JSON.stringify({ records: RECORDS }));
		const airtable = useAirtable({ base: 'BASE', token: 'TOKEN' });
		await airtable.select('TABLE', { fetchOptions: { key: 'value' } });
		const [[, options]] = fetch.mock.calls;
		expect(options).toHaveProperty('key', 'value');
	});

	it('should override extra fetch options', async () => {
		expect.assertions(2);
		fetch.resetMocks();
		fetch.once(JSON.stringify({ records: RECORDS }));
		const airtable = useAirtable({ base: 'BASE', token: 'TOKEN', fetchOptions: { key: 'value' } });
		await airtable.select('TABLE', { fetchOptions: { foo: 'bar' } });
		const [[, options]] = fetch.mock.calls;
		expect(options).toHaveProperty('foo', 'bar');
		expect(options).not.toHaveProperty('key', 'value');
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
		const result = await airtable.select<Person>('TABLE', { index: true });
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
		const result = await airtable.select<ExpandedPerson>('TABLE', {
			expand: {
				kids: { table: 'TABLE' },
				parents: { table: 'TABLE' },
			},
		});
		expect(fetch.mock.calls).toHaveLength(3);
		expect(result[0].kids?.[0].name).toBe('Johnny Doe');
		expect(result[1].kids?.[0].name).toBe('Johnny Doe');
		expect(result[2].kids).toBeUndefined();
		expect(result[2].parents).toHaveLength(2);
		expect(result[2].parents?.[0].name).toBe('John Doe');
		expect(result[2].parents?.[1].name).toBe('Jane Doe');
	});

	it('should recursively expand records', async () => {
		expect.assertions(4);
		fetch.resetMocks();
		fetch
			.once(JSON.stringify({ records: [RECORDS[0]] })) // Return ID_1
			.once(JSON.stringify({ records: [RECORDS[2]] })) // Return ID_3
			.once(JSON.stringify({ records: RECORDS.slice(0, 2) })); // Return ID_1 & ID_2
		const result = await airtable.select<ExpandedPerson>('TABLE', {
			expand: {
				kids: {
					table: 'TABLE',
					options: { expand: { parents: { table: 'TABLE' } } },
				},
			},
		});
		expect(fetch.mock.calls).toHaveLength(3);
		expect(result[0].kids?.[0].name).toBe('Johnny Doe');
		expect(result[0].kids?.[0].parents).toHaveLength(2);
		expect(result[0].kids?.[0].parents?.[0].name).toBe('John Doe');
	});

	it('should persist paginated indexed queries', async () => {
		expect.assertions(3);
		fetch.resetMocks();
		fetch
			.once(JSON.stringify({ records: RECORDS.slice(0, 2), offset: 'ID_3' }))
			.once(JSON.stringify({ records: [RECORDS[2]] }));
		const result = await airtable.select<Person>('TABLE', { persist: true });
		expect(fetch.mock.calls).toHaveLength(2);
		expect(result).toHaveLength(3);
		expect(result[2].name).toBe('Johnny Doe');
	});
});

describe('useAirtable find', () => {
	const airtable = useAirtable({ base: 'BASE', token: 'TOKEN' });

	it('should return expected record', async () => {
		expect.assertions(1);
		fetch.resetMocks();
		fetch.once(JSON.stringify(RECORDS[2]));
		const result = await airtable.find<Person>('TABLE', 'ID_3', {});
		expect(result.name).toBe('Johnny Doe');
	});

	it('should add local extra fetch options', async () => {
		expect.assertions(1);
		fetch.resetMocks();
		fetch.once(JSON.stringify(RECORDS[2]));
		const airtable = useAirtable({ base: 'BASE', token: 'TOKEN' });
		await airtable.find('TABLE', 'ID_3', { fetchOptions: { key: 'value' } });
		const [[, options]] = fetch.mock.calls;
		expect(options).toHaveProperty('key', 'value');
	});
});

describe('useAirtable update', () => {
	const airtable = useAirtable({ base: 'BASE', token: 'TOKEN' });

	it('should override extra fetch options', async () => {
		expect.assertions(1);
		fetch.resetMocks();
		fetch.once(JSON.stringify({ records: [RECORDS[1]] }));
		const airtable = useAirtable({ base: 'BASE', token: 'TOKEN' });
		const result = await airtable.update<Person>('TABLE', { _id: 'ID_1' }, { fetchOptions: { key: 'value' } });
		const [[, options]] = fetch.mock.calls;
		expect(options).toHaveProperty('key', 'value');
	});

	it('should update a record', async () => {
		expect.assertions(4);
		fetch.resetMocks();
		fetch.once(JSON.stringify({ records: [RECORDS[1]] }));
		const result = await airtable.update<Person>('TABLE', { _id: 'ID_1', name: 'Johann Doe' });
		const [url, call] = fetch.mock.lastCall || [];
		expect(url).toBe(`${BASE_URL}/BASE/TABLE`);
		expect(call?.method).toBe('PATCH');
		expect(call?.body).toStrictEqual(JSON.stringify({ records: [{ id: 'ID_1', fields: { name: 'Johann Doe' } }] }))
		expect(Array.isArray(result)).toBe(false);
	});

	it('should update multiple records', async () => {
		expect.assertions(2);
		fetch.resetMocks();
		fetch.once(JSON.stringify({ records: RECORDS.slice(0, 2) }));
		const result = await airtable.update<Person>('TABLE', [
			{ _id: 'ID_1', name: 'Johann Doe' },
			{ _id: 'ID_2', name: 'Johanna Doe' },
		]);
		const [, call] = fetch.mock.lastCall || [];
		expect(call?.body).toStrictEqual(JSON.stringify({
			records: [
				{ id: 'ID_1', fields: { name: 'Johann Doe' } },
				{ id: 'ID_2', fields: { name: 'Johanna Doe' } },
			],
		}))
		expect(Array.isArray(result)).toBe(true);
	});

	it('should update record with options', async () => {
		expect.assertions(1);
		fetch.resetMocks();
		fetch.once(JSON.stringify({ records: [RECORDS[1]] }));
		await airtable.update<Person>('TABLE', { name: 'John Doe', kids: [] }, {
			typecast: true,
			findBy: ['name'],
		});
		const [, call] = fetch.mock.lastCall || [];
		expect(call?.body).toStrictEqual(JSON.stringify({
			records: [{ fields: { name: 'John Doe', kids:[] } }],
			typecast: true,
			performUpsert: { fieldsToMergeOn: ['name'] }
		}));
	});

	it('should throw error if record id and findBy are not provided', async () => {
		expect.assertions(1);
		await expect(airtable.update<Person>('TABLE', {})).rejects.toThrow('Record id or findBy is required');
	});
});

import { flattenRecord, useRecords } from '../use.records';

const RECORDS = [
	{ id: 'ID_1', fields: { name: 'John Doe', kids: ['ID_3'] } },
	{ id: 'ID_2', fields: { name: 'Jane Doe', kids: ['ID_3'] } },
];

describe('flatternRecord', () => {
	it('should flatten an Airtable record', () => {
		expect.assertions(1);
		const flattenedRecord = flattenRecord({
			id: 'recJ4z4BZVF8ZPWx',
			createdTime: '2020-03-25T21:38:29.000Z',
			fields: { name: 'John Doe' },
		});
		expect(flattenedRecord).toStrictEqual({
			_id: 'recJ4z4BZVF8ZPWx',
			_created: '2020-03-25T21:38:29.000Z',
			name: 'John Doe',
		});
	});
});

describe('useRecord', () => {
	it('should initialize empty records', async () => {
		expect.assertions(1);
		const { getAll } = useRecords();
		expect(getAll()).toHaveLength(0);
	});

	it('should flatten all records by default', () => {
		expect.assertions(3);
		const select = jest.fn();
		const { getAll } = useRecords(RECORDS, select);
		const records = getAll();
		expect(records).toHaveLength(2);
		expect(records[0]).toHaveProperty('_id', 'ID_1');
		expect(records[1]).toHaveProperty('_id', 'ID_2');
	});

	it('should not flatten records when disabled', () => {
		expect.assertions(3);
		const select = jest.fn();
		const { getAll } = useRecords(RECORDS, select, { flatten: false });
		const records = getAll();
		expect(records).toHaveLength(2);
		expect(records[0]).toHaveProperty('id', 'ID_1');
		expect(records[1]).toHaveProperty('id', 'ID_2');
	});

	it('should index records', () => {
		expect.assertions(1);
		const select = jest.fn();
		const { getAll } = useRecords(RECORDS, select, { index: true });
		const indexes = Object.keys(getAll());
		expect(indexes).toStrictEqual(['ID_1', 'ID_2']);
	});

	it('should index not flattened records', () => {
		expect.assertions(1);
		const select = jest.fn();
		const { getAll } = useRecords(RECORDS, select, { index: true, flatten: false });
		const indexes = Object.keys(getAll());
		expect(indexes).toStrictEqual(['ID_1', 'ID_2']);
	});

	it('should persist paginated queries', async () => {
		expect.assertions(10);
		const select = jest.fn(async () => [{ id: 'ID_3', fields: { name: 'John Doe Jr.', kids: [] } }]);
		const { persist, getAll } = useRecords(RECORDS, select, { persist: true });
		await persist('table', 'offset');
		expect(select.mock.calls).toHaveLength(1);
		expect(select.mock.calls[0][0]).toBe('table');
		expect(select.mock.calls[0][1]).toHaveProperty('offset', 'offset');
		expect(select.mock.calls[0][1]).toHaveProperty('persist', true);
		expect(select.mock.calls[0][1]).toHaveProperty('flatten', false);
		expect(select.mock.calls[0][1]).toHaveProperty('expand', false);
		expect(select.mock.calls[0][1]).toHaveProperty('index', false);
		const records = getAll();
		expect(records).toHaveLength(3);
		expect(records[0]).toHaveProperty('_id', 'ID_1');
		expect(records[2]).toHaveProperty('_id', 'ID_3');
	});

	it('should not persist queries when disabled', async () => {
		expect.assertions(2);
		const select = jest.fn();
		const { persist, getAll } = useRecords(RECORDS, select, { persist: false });
		await persist('table', 'offset');
		expect(select.mock.calls).toHaveLength(0);
		const records = getAll();
		expect(records).toHaveLength(2);
	});

	it('should expand linked records', async () => {
		expect.assertions(6);
		const select = jest.fn(async () => ({ ID_3: { id: 'ID_3', fields: { name: 'John Doe Jr.', kids: [] } } }));
		const { expand, getAll } = useRecords(RECORDS, select, { expand: { kids: { table: 'kids' } } });
		await expand();
		expect(select.mock.calls).toHaveLength(1);
		expect(select.mock.calls[0][1]).toHaveProperty('index', true);
		const records = getAll();
		expect(records[0].kids).toHaveLength(1);
		expect(records[0].kids[0]).toHaveProperty('id', 'ID_3');
		expect(records[1].kids).toHaveLength(1);
		expect(records[1].kids[0]).toHaveProperty('id', 'ID_3');
	});

	it('should not expand records when disabled', async () => {
		expect.assertions(3);
		const select = jest.fn();
		const records = useRecords(RECORDS, select, { expand: false });
		await records.expand();
		const response = records.getAll();
		expect(select.mock.calls).toHaveLength(0);
		expect(response[0].kids).toHaveLength(1);
		expect(response[0].kids[0]).toBe('ID_3');
	});
});

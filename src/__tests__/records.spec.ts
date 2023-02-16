import { flattenRecord, indexateRecords, expandRecords } from '../use.records';
import type { AirtableResponse, AirtableSelect } from '../types';

type Person = {
	name: string;
	kids?: string[];
	parents?: string[];
};

const RECORDS: AirtableResponse<Person>['records'] = [
	{ id: 'ID_1', createdTime: '2020-03-25T21:38:30.000Z', fields: { name: 'John Doe', kids: ['ID_3'] } },
	{ id: 'ID_2', createdTime: '2020-03-25T21:38:40.000Z', fields: { name: 'Jane Doe', kids: ['ID_3'] } },
	{ id: 'ID_3', createdTime: '2020-03-25T21:38:50.000Z', fields: { name: 'Johnny Doe' } },
];

describe('flatternRecord', () => {
	it('should flatten an Airtable record', () => {
		expect.assertions(1);
		const flatten = flattenRecord(RECORDS[0]);
		expect(flatten).toStrictEqual({
			_id: 'ID_1',
			_created: '2020-03-25T21:38:30.000Z',
			name: 'John Doe',
			kids: ['ID_3'],
		});
	});
});

describe('indexateRecords', () => {
	it('should indexate records', () => {
		expect.assertions(1);
		const indexed = indexateRecords(RECORDS);
		expect(Object.keys(indexed)).toStrictEqual(['ID_1', 'ID_2', 'ID_3']);
	});
});

describe('expandRecords', () => {
	it('should expand linked records', async () => {
		expect.assertions(6);
		const select = jest.fn(async () => ({ ID_3: { name: 'Johnny Doe' } }));
		const expanded = await expandRecords(RECORDS, { kids: { table: 'kids' } }, select as any as AirtableSelect);
		expect(select.mock.calls).toHaveLength(1);
		expect(expanded[0].fields.kids).toHaveLength(1);
		expect(expanded[0].fields.kids[0]).toHaveProperty('name', 'Johnny Doe');
		expect(expanded[1].fields.kids).toHaveLength(1);
		expect(expanded[1].fields.kids[0]).toHaveProperty('name', 'Johnny Doe');
		expect(expanded[2].fields.kids).toBeFalsy();
	});
});

import { toArray } from '../utils';

describe('Utils', () => {
	it('toArray should always return an array', () => {
		expect.assertions(2);
		expect(toArray(['item'])).toStrictEqual(['item']);
		expect(toArray('item')).toStrictEqual(['item']);
	});
});

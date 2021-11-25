import createFormula from './formula';

describe('formula for where clause', () => {
	it('should return null if no input parameter', () => {
		expect.assertions(1);
		const formula = createFormula();
		expect(formula).toBeNull();
	});

	it('should return formula if passing a string', () => {
		expect.assertions(1);
		const formula = createFormula('OR(name, surname)');
		expect(formula).toBe('OR(name, surname)');
	});

	it('should format formula with comparation operands', () => {
		expect.assertions(1);
		const where = {
			a: 1, // Field is equal to the value
			b: [1, 2], // Field is ANY of the values
			c: { $lt: 1 }, // Apply an operand to the value
			d: [1, { $gte: 2 }], // Combine options
		};
		const formula = createFormula(where);
		expect(formula).toBe('AND({a}=\'1\',OR({b}=\'1\',{b}=\'2\'),{c}<\'1\',OR({d}=\'1\',{d}>=\'2\'))');
	});

	it('should format formula with containing expression', () => {
		expect.assertions(1);
		const where = {
			a: { has: 1 }, // Field contains the value
			b: { has: [1, 2] }, // Field contains ANY of the values
		};
		const formula = createFormula(where);
		expect(formula).toBe('AND(FIND(\'1\',{a}),OR(FIND(\'1\',{b}),FIND(\'2\',{b})))');
	});

	it('should format formula with negation expression', () => {
		expect.assertions(1);
		const where = {
			a: { not: 1 }, // Field is not the value
			b: { not: [1, 2] }, // Field does not contain ANY of the values
			c: { not: [1, { $gt: 3 }] }, // Combine options
		};
		const formula = createFormula(where);
		expect(formula).toBe('AND(NOT({a}=\'1\'),NOT(OR({b}=\'1\',{b}=\'2\')),NOT(OR({c}=\'1\',{c}>\'3\')))');
	});

	it('should format formula with boolean checks', () => {
		expect.assertions(1);
		const where = {
			a: { checked: true },
			b: { checked: false },
		};
		const formula = createFormula(where);
		expect(formula).toBe('AND({a}=1,{b}=0)');
	});
});

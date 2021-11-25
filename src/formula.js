const OPERANDS = { $eq: '=', $neq: '!=', $lt: '<', $gt: '>', $lte: '<=', $gte: '>=', is: '=' };

const FILTERS = {
	has: (field, value) => `FIND('${value}',{${field}})`,
	not: (_, value) => `NOT(${value})`,
	checked: (field, value) => `{${field}}=${+value}`,
	default: (field, value, operand) => `{${field}}${OPERANDS[operand]}'${value}'`,
};

const serialize = (item, callback) => (Array.isArray(item)
	? `OR(${item.map(value => callback(value)).join(',')})`
	: callback(item));

const parse = (field, item) => {
	if (Array.isArray(item)) return serialize(item, value => parse(field, value));
	if (typeof item === 'object') {
		const [operand, value] = Object.entries(item)[0];
		const filter = FILTERS[operand] || FILTERS.default;
		const composed = operand === 'not' ? parse(field, value) : value;
		return serialize(composed, v => filter(field, v, operand));
	}
	return FILTERS.default(field, item, '$eq');
};

export default where => {
	if (!where) return null;
	if (typeof where === 'string') return where;
	const filters = Object.entries(where)
		.map(([field, expression]) => parse(field, expression));
	return `AND(${filters.join(',')})`;
};

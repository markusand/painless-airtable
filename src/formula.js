const OPERANDS = { $eq: '=', $neq: '!=', $lt: '<', $gt: '>', $lte: '<=', $gte: '>=' };

const FILTERS = {
	has: (field, value) => `FIND('${value}',{${field}})`,
	checked: (field, value) => `{${field}}=${+value}`,
	default: (field, value, operand) => `{${field}}${OPERANDS[operand]}'${value}'`,
};

const serialize = (item, callback, aggregator = 'OR') => (Array.isArray(item)
	? `${aggregator}(${item.map(value => callback(value)).join(',')})`
	: callback(item));

const parse = (field, item) => {
	if (Array.isArray(item)) return serialize(item, value => parse(field, value));
	if (typeof item === 'object') {
		const [operand, value] = Object.entries(item)[0];
		const filter = FILTERS[operand] || FILTERS.default;
		const aggregator = operand === 'not' ? 'AND' : 'OR';
		return serialize(value, v => filter(field, v, operand), aggregator);
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

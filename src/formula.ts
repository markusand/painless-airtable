import type { WhereOptions, WhereOperands, WhereValues } from "./types";

const OPERANDS: Partial<Record<WhereOperands, string>> = { $eq: '=', $neq: '!=', $lt: '<', $gt: '>', $lte: '<=', $gte: '>=', is: '=' };

const FILTERS: Record<string, (field: string, value: WhereValues, operand: WhereOperands) => string> = {
	has: (field, value) => `FIND('${value}',{${field}})`,
	not: (_, value) => `NOT(${value})`,
	checked: (field, value) => `{${field}}=${+value}`,
	default: (field, value, operand) => `{${field}}${OPERANDS[operand]}'${value}'`,
};

const serialize = (item: WhereValues, callback: (value: WhereValues) => string): string => (
	Array.isArray(item)
		? `OR(${item.map(value => callback(value)).join(',')})`
		: callback(item)
);

const parse = (field: string, item: WhereValues): string => {
	if (Array.isArray(item)) return serialize(item, value => parse(field, value));
	if (typeof item === 'object') {
		const [operand, value] = Object.entries(item)[0];
		const filter = FILTERS[operand] || FILTERS.default;
		const composed = operand === 'not' ? parse(field, value) : value;
		return serialize(composed, v => filter(field, v, operand as WhereOperands));
	}
	return FILTERS.default(field, item, '$eq');
};

export default (where: WhereOptions): string => {
	if (typeof where === 'string') return where;
	const filters = Object.entries(where)
		.map(([field, expression]) => parse(field, expression));
	return `AND(${filters.join(',')})`;
};

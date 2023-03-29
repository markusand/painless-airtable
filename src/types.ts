export type AirtableWhereOperands = 'is' | 'has' | 'not' | 'checked' | '$eq' | '$neq' | '$lt' | '$gt' | '$lte' | '$gte';
export type AirtableWhereValues = string | number | boolean | Partial<Record<AirtableWhereOperands, string | number | boolean | (number | string | Partial<Record<AirtableWhereOperands, number | string | boolean>>)[]>> | AirtableWhereValues[];
export type AirtableWhere = string | Record<string, AirtableWhereValues>;

export type AirtableOptions = {
	base: string;
	token: string;
	baseURL?: string;
	fetchOptions?: Record<string, any>;
};

export type AirtableSelectOptions = {
	base?: string;
	view?: string;
	fields?: string[];
	max?: number;
	sort?: Record<string, 'asc' | 'desc'>;
	offset?: string;
	persist?: boolean;
	index?: boolean;
	where?: AirtableWhere;
	expand?: AirtableExpandOptions;
	flatten?: boolean;
	fetchOptions?: Record<string, any>;
};

export type AirtableExpandOptions = Record<string, {
	table: string;
	options?: AirtableSelectOptions;
}>;

export type AirtableFindOptions = Pick<AirtableSelectOptions, 'base' | 'view' | 'fields' | 'expand' | 'flatten' | 'fetchOptions'>;

export type AirtableUpdateOptions = {
	typecast?: boolean;
	findBy?: string[],
	fetchOptions?: Record<string, any>;
};

export type AirtableRawRecord<T> = {
	id: string;
	createdTime: string;
	fields: T;
};

export type AirtableResponse<T> = {
	records: AirtableRawRecord<T>[];
	offset?: string;
};

export type AirtableRecord<T> = {
	_id: string;
	_created: string;
} & T;

export interface AirtableSelect {
	<T>(table: string, options?: AirtableSelectOptions & { flatten: false, index: true }): Promise<Record<string, AirtableRawRecord<T>>>;
	<T>(table: string, options?: AirtableSelectOptions & { index: true }): Promise<Record<string, AirtableRecord<T>>>;
	<T>(table: string, options?: AirtableSelectOptions & { flatten: false }): Promise<AirtableRawRecord<T>[]>;
	<T>(table: string, options?: AirtableSelectOptions): Promise<AirtableRecord<T>[]>;
};

export interface AirtableFind {
	<T>(table: string, id: string, options?: AirtableFindOptions & { flatten: false }): Promise<AirtableRawRecord<T>>;
	<T>(table: string, id: string, options?: AirtableFindOptions): Promise<AirtableRecord<T>>;
};

export interface AirtableUpdate {
	<T>(table: string, data: Partial<AirtableRecord<T>>, options?: AirtableUpdateOptions): Promise<AirtableRecord<T>>;
	<T>(table: string, data: Partial<AirtableRecord<T>>[], options?: AirtableUpdateOptions): Promise<AirtableRecord<T>[]>;
};

export type WhereOperands = 'is' | 'has' | 'not' | 'checked' | '$eq' | '$neq' | '$lt' | '$gt' | '$lte' | '$gte';
export type WhereValues = string | number | boolean | Partial<Record<WhereOperands, string | number | boolean | (number | string | Partial<Record<WhereOperands, number | string | boolean>>)[]>> | WhereValues[];
export type WhereOptions = string | Record<string, WhereValues>;

export type AirtableOptions = {
	base: string;
	token: string;
	baseURL?: string;
	fetchOptions?: Record<string, any>;
};

export type SelectOptions = {
	base?: string;
	view?: string;
	fields?: string[];
	max?: number;
	sort?: Record<string, 'asc' | 'desc'>;
	offset?: string;
	persist?: boolean;
	index?: boolean;
	where?: WhereOptions;
	expand?: ExpandOptions;
	flatten?: boolean;
	fetchOptions?: Record<string, any>;
};

export type ExpandOptions = Record<string, {
	table: string;
	options?: SelectOptions;
}>;

export type FindOptions = Pick<SelectOptions, 'base' | 'view' | 'expand' | 'flatten' | 'fetchOptions'>;

export type UpdateOptions = {
	typecast?: boolean;
	findBy?: string[],
	fetchOptions?: Record<string, any>;
};

export type AirtableRawRecord<T extends object> = {
	id: string;
	createdTime: string;
	fields: T;
};

export type AirtableResponse<T extends object> = {
	records: AirtableRawRecord<T>[];
	offset?: string;
};

export type AirtableRecord<T extends object> = {
	_id: string;
	_created: string;
} & T;

export interface AirtableSelect {
	<T extends object, O extends SelectOptions & { flatten: false, index: true }>(table: string, options?: O): Promise<Record<string, AirtableRawRecord<T>>>;
	<T extends object, O extends SelectOptions & { index: true }>(table: string, options?: O): Promise<Record<string, AirtableRecord<T>>>;
	<T extends object, O extends SelectOptions & { flatten: false }>(table: string, options?: O): Promise<AirtableRawRecord<T>[]>;
	<T extends object>(table: string, options?: SelectOptions): Promise<AirtableRecord<T>[]>;
};

export interface AirtableFind {
	<T extends object, O extends FindOptions>(table: string, id: string, options?: O & { flatten: false }): Promise<AirtableRawRecord<T>>;
	<T extends object, O extends FindOptions>(table: string, id: string, options?: O): Promise<AirtableRecord<T>>;
};

export interface AirtableUpdate {
	<T extends object>(table: string, data: Partial<AirtableRecord<T>>, options?: UpdateOptions): Promise<AirtableRecord<T>>;
	<T extends object>(table: string, data: Partial<AirtableRecord<T>>[], options?: UpdateOptions): Promise<AirtableRecord<T>[]>;
};

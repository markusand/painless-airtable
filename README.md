# Painless Airtable

Easily interact with the Airtable API.

[![version](https://img.shields.io/npm/v/painless-airtable)](https://npmjs.org/package/painless-airtable)
[![size](https://img.shields.io/bundlephobia/minzip/painless-airtable)](https://bundlephobia.com/package/painless-airtable)
![license](https://img.shields.io/npm/l/painless-airtable)

## Usage

```bash
npm install painless-airtable
```

```js
import { useAirtable } from 'painless-airtable';

const { AIRTABLE_TOKEN } = import.meta.env;

const airtable = useAirtable({
  base: '<< Airtable base ID >>',
  token: AIRTABLE_TOKEN,
});

// Queries return a promise and must be inside an async function
const results = await airtable.select('users', {
  fields: ['name', 'phone', 'email'],
  sort: { name: 'asc' },
  max: 20,
});
```

### Select & find records

Use `select` method to retrieve all records that match certain conditions (if any), while `find` method will retrieve a single record by its Airtable's RECORD_ID.

#### Options

Both methods accept some options to tailor the response from Airtable. If not provided the results will be as is with Airtable's default options.

|option|type|default|description|
|---|---|---|---|
|base|string|undefined|Override the global base|
|view|string|undefined|Get results from a specific view|
|fields|array|undefined|Fields to retrieve|
|max|int|undefined|Max number of results|
|sort|object|undefined|Fields and order to sort the results|
|persist|boolean|false|Automatically query for more results when max-results-per-query limit is reached. Be aware it may trigger the max-query-per-second limit error |
|index|boolean|false|Return an an object of indexed records by RECORD_ID()|
|where|object, string|undefined|Options to filter results|
|expand|object|undefined|Options to expand linked records|
|flatten|boolean|true|Flatten records, assigning metadata to underscore fields|

#### Filter records with `where`

Results may be filtered using an object parameter, with some *mongodb-like* operands.

```js
where: {
  age: 35, // Field is equal to the value
  age: [20, 25, 30], // Field is ANY of the values
  age: { $lt: 35 },  // Apply an operand to the value
  age: [20, { $gte: 50 }], // Combine options
  is_valid: { checked: true },
  tags: { has: 'development' },
  type: { not: ['post', 'page'] },
}
```

|operand|equivalent|meaning|
|---|---|---|
|is|=|Equal to|
|has|⊃|Contains|
|not|!|Negate|
|checked||Is checked|
||||
|$eq|=|Equal to|
|$neq|!=|Not equal to|
|$lt|<|Lower than|
|$gt|>|Greater than|
|$lte|<=|Lower than or equal|
|$gte|>=|Greater than or equal|

For more complex filtering you may have to write your own  [filterByFormula string](https://support.airtable.com/hc/en-us/articles/223247187-How-do-I-sort-filter-or-retrieve-ordered-records-in-the-API-) and pass it directly.

#### Expand records

Automatically query and populate fields with linked records information.
> [!WARNING]
> Be aware it may trigger the max-query-per-second limit error.

```js
expand: {
  // Field with linked records to expand
  company: {
    // Linked table
    table: 'companies',
    // Accepts the same options object as the select method
    options: { 
      fields: ['name', 'address', 'phone'],
    },
  },
}
```

### Update records

Use `update` method to update a record by passing a single record or an array (up to 10 limited by Airtable). Update records according to some other attribute than `_id` by using the `findBy` option. Use `typecast` option to force Airtable to infer the type of the field.

## To Do

- [ ] Add methods for a complete CRUD
- [ ] Throttle queries (with retry option?)

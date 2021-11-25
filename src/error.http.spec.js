import HttpError from './error.http';

describe('error class HttpError', () => {
	it('error should have valid attributes', () => {
		expect.assertions(3);
		const error = new HttpError(404, 'Not Found');
		expect(error.name).toBe('HttpError');
		expect(error.code).toBe(404);
		expect(error.message).toBe('Not Found');
	});

	it('should detect an error code', () => {
		expect.assertions(3);
		expect(HttpError.isErrorCode(404)).toBe(true);
		expect(HttpError.isErrorCode(500)).toBe(true);
		expect(HttpError.isErrorCode(201)).toBe(false);
	});
});

class HttpError extends Error {
	code: number;

	constructor(code: number, message: string) {
		super(message);
		this.code = code;
		this.name = 'HttpError';
	}

	// Check for 4xx and 5xx status codes
	static isErrorCode(code: number) {
		return [4, 5].includes(Math.round(code / 100));
	}
}

export default HttpError;

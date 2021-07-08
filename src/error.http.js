class HttpError extends Error {
	constructor(code, message) {
		super(message);
		this.code = code;
		this.name = 'HttpError';
	}

	// Check for 4xx and 5xx status codes
	static isErrorCode(code) {
		return [4, 5].includes(Math.round(code / 100));
	}
}

export default HttpError;

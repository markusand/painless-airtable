export const toArray = <T>(input: T | T[]): T[] => Array.isArray(input) ? input : [input];

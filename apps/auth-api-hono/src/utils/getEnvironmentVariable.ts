export const getEnvironmentVariable = function (environmentVariable: string): string {
	const validEnvironmentVariable = process.env[environmentVariable];
	if (!validEnvironmentVariable) {
		throw new Error(`Couldn't find environment variable: ${environmentVariable}`);
	}
	return validEnvironmentVariable;
};

export const IS_PROD = getEnvironmentVariable("NODE_ENV") === "production";

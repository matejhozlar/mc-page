const logError = (error) => error?.stack || error?.message || String(error);

export default logError;

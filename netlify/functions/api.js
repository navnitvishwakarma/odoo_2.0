import serverless from 'serverless-http';
import app from '../../server.js';

// Robustly handle ESM default exports
// In some environments, the default export is nested in a 'default' property
const appInstance = app.default || app;

export const handler = serverless(appInstance);

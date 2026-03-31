import app, { initDb } from "../src/server/app";

// Initialize DB on cold start
initDb().catch(console.error);

export default app;

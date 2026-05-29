type RequiredServerEnv = "MONGODB_URI" | "MONGODB_DB_NAME";

function getRequiredEnv(name: RequiredServerEnv): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const env = {
  mongodbUri: getRequiredEnv("MONGODB_URI"),
  mongodbDbName: getRequiredEnv("MONGODB_DB_NAME"),
  authSecret: process.env.AUTH_SECRET,
  authUrl: process.env.AUTH_URL,
};

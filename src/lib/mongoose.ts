import "server-only";

import mongoose, { type Mongoose } from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

type MongooseCache = {
  connection: Mongoose | null;
  promise: Promise<Mongoose> | null;
};

declare global {
  var mongooseCache: MongooseCache | undefined;
}

const cache = global.mongooseCache ?? {
  connection: null,
  promise: null,
};

// Cache in every environment so warm production instances reuse both active
// connections and in-flight connection attempts instead of opening new pools.
global.mongooseCache = cache;

export async function connectToDatabase(): Promise<Mongoose> {
  if (!MONGODB_URI?.trim()) {
    console.warn(
      "[mongodb] MONGODB_URI is missing or empty. Add it to .env.local and restart the Next.js server.",
    );
    throw new Error(
      "MONGODB_URI is not configured. Add it to .env.local before using the database.",
    );
  }

  if (cache.connection) {
    return cache.connection;
  }

  if (!cache.promise) {
    cache.promise = mongoose
      .connect(MONGODB_URI, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 10_000,
      })
      .catch((error: unknown) => {
        cache.promise = null;
        const databaseError = error as {
          code?: unknown;
          codeName?: unknown;
          message?: unknown;
        };
        // Next.js dev mode promotes console.error calls made while rendering a
        // Server Component to the browser error overlay. This is an expected,
        // recoverable failure for pages that render an unavailable state, so
        // retain the server diagnostic without reporting a React render error.
        console.warn("[mongodb] Connection attempt failed", {
          code: databaseError?.code,
          codeName: databaseError?.codeName,
          name: error instanceof Error ? error.name : "UnknownError",
        });
        throw error;
      });
  }

  cache.connection = await cache.promise;
  return cache.connection;
}

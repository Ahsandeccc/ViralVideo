type DatabaseLikeError = {
  code?: unknown;
  codeName?: unknown;
  message?: unknown;
};

export function databaseErrorResponse(error: unknown): { message: string; status: number } {
  const databaseError = error as DatabaseLikeError;
  const message = typeof databaseError?.message === "string" ? databaseError.message : "";

  if (databaseError?.code === 8000 || databaseError?.codeName === "AtlasError" || /bad auth|authentication failed/i.test(message)) {
    return {
      message: "MongoDB authentication failed. Check the Atlas username and password in MONGODB_URI.",
      status: 503,
    };
  }

  if (/MONGODB_URI is not configured/i.test(message)) {
    return { message, status: 503 };
  }

  if (/server selection|timed out|ECONNREFUSED|ENOTFOUND/i.test(message)) {
    return {
      message: "MongoDB is unavailable. Check the connection string, Atlas network access, and cluster status.",
      status: 503,
    };
  }

  return { message: "A database operation failed. Please try again.", status: 500 };
}

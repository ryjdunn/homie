export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 400,
    public readonly code = "bad_request",
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function notFound(message: string) {
  return new AppError(message, 404, "not_found");
}

export function unauthorized(message = "Unauthorized") {
  return new AppError(message, 401, "unauthorized");
}

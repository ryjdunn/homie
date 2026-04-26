import { describe, expect, it } from "vitest";
import { AppError, notFound, unauthorized } from "@/server/domain/errors";

describe("domain errors", () => {
  it("carries HTTP and machine-readable error details", () => {
    const error = new AppError("Nope", 418, "teapot");
    expect(error.message).toBe("Nope");
    expect(error.statusCode).toBe(418);
    expect(error.code).toBe("teapot");
  });

  it("creates common not found and unauthorized errors", () => {
    expect(notFound("Missing").statusCode).toBe(404);
    expect(unauthorized().code).toBe("unauthorized");
  });
});

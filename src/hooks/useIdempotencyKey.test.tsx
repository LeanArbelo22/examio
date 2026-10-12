import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useIdempotencyKey } from "./useIdempotencyKey";

describe("useIdempotencyKey", () => {
  it("reutiliza la clave para el mismo body y crea otra si cambia", () => {
    const randomUUID = vi
      .spyOn(crypto, "randomUUID")
      .mockReturnValueOnce("4e096ceb-51fd-49a1-8f80-c3760edaf021")
      .mockReturnValueOnce("6f7eaaab-3292-4210-8fb3-a3e31340f625");
    const { result } = renderHook(useIdempotencyKey);

    expect(result.current.keyFor({ title: "A" })).toBe(
      "4e096ceb-51fd-49a1-8f80-c3760edaf021",
    );
    expect(result.current.keyFor({ title: "A" })).toBe(
      "4e096ceb-51fd-49a1-8f80-c3760edaf021",
    );
    expect(result.current.keyFor({ title: "B" })).toBe(
      "6f7eaaab-3292-4210-8fb3-a3e31340f625",
    );
    randomUUID.mockRestore();
  });
});

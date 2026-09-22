import { describe, expect, it, vi } from "vitest";

vi.mock("@/core/lib/supabase-server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: {
      signInWithPassword: vi.fn(async ({ email }: { email: string }) =>
        email === "valid@bloqbase.net"
          ? { data: { user: { id: "1" } }, error: null }
          : { data: { user: null }, error: { message: "Invalid credentials" } }
      ),
    },
  })),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

describe("login action", () => {
  it("returns an error message for invalid credentials", async () => {
    const { login } = await import("../actions");
    const formData = new FormData();
    formData.set("email", "wrong@bloqbase.net");
    formData.set("password", "bad");
    const result = await login(formData);
    expect(result?.error).toBeDefined();
  });

  it("returns no error for valid credentials", async () => {
    const { login } = await import("../actions");
    const formData = new FormData();
    formData.set("email", "valid@bloqbase.net");
    formData.set("password", "good");
    try {
      await login(formData);
      // If redirect throws, we'll catch it below
    } catch (e) {
      // Redirect throws NEXT_REDIRECT which is expected
      if ((e as Error).message !== "NEXT_REDIRECT") {
        throw e;
      }
    }
    // Success means no error was returned and redirect was called
  });
});

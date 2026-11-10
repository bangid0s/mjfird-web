import assert from "node:assert/strict";
import test from "node:test";

test("auth setup does not call the network on import and redacts failures", async () => {
  const original = globalThis.fetch;
  let fetches = 0;
  globalThis.fetch = async () => {
    fetches += 1;
    throw new Error("network");
  };
  try {
    const setup = await import("./setup-auth.mjs");
    assert.equal(fetches, 0);
    assert.equal(setup.formatAuthSetupFailure("Google provider", 401), "✗ Google provider: HTTP 401");

    const logs: string[] = [];
    const log = {
      error: (line: string) => logs.push(line),
      log: (line: string) => logs.push(line),
    };
    const marker = "provider-body-marker";
    const secret = "smtp-password-marker";
    let sawSecretInRequest = false;
    const code = await setup.runAuthSetup({
      env: {
        SUPABASE_PROJECT_REF: "isolated-ref",
        SUPABASE_ACCESS_TOKEN: "access-token-marker",
        RESEND_API_KEY: secret,
        GOOGLE_CLIENT_ID: "google-client",
        GOOGLE_CLIENT_SECRET: "google-secret",
      },
      log,
      fetchImpl: async (_url: string, init?: { headers?: Record<string, string>; body?: string }) => {
        if (init?.body?.includes(secret)) sawSecretInRequest = true;
        if (init?.headers?.Authorization?.includes("access-token-marker")) {
          // The token is sent. It must not be written to the log below.
        }
        return {
          ok: false,
          status: 401,
          body: { cancel: async () => undefined },
          text: async () => marker,
        };
      },
    });
    assert.equal(code, 1);
    assert.equal(sawSecretInRequest, true);
    const printed = logs.join("\n");
    assert.match(printed, /HTTP 401/);
    assert.equal(printed.includes(marker), false);
    assert.equal(printed.includes(secret), false);
    assert.equal(printed.includes("access-token-marker"), false);
    assert.equal(printed.includes("google-secret"), false);

    const skipped = await setup.runAuthSetup({
      env: {},
      log,
      fetchImpl: async () => {
        throw new Error("network");
      },
    });
    assert.equal(skipped, 1);
    assert.match(logs.join("\n"), /SUPABASE_PROJECT_REF is required/);
  } finally {
    globalThis.fetch = original;
  }
});

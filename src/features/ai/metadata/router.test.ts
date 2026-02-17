import { describe, expect, mock, test } from "bun:test";
import { createMetadataRouter } from "./router";
import type { MetadataProvider, MetadataInput } from "./types";

/**
 * Helper to create a mock provider
 */
function createMockProvider(
  name: string,
  options: {
    available?: boolean;
    summary?: string;
    tags?: string[];
    shouldFail?: boolean;
    throwOnAvailable?: boolean;
    throwOnGenerate?: boolean;
    delay?: number;
  } = {},
): MetadataProvider {
  const {
    available = true,
    summary = `${name} summary`,
    tags = [`${name}-tag`],
    shouldFail = false,
    throwOnAvailable = false,
    throwOnGenerate = false,
    delay = 0,
  } = options;

  return {
    name,
    async isAvailable() {
      if (throwOnAvailable) {
        throw new Error(`${name} isAvailable threw error`);
      }
      return available;
    },
    async generate(input: MetadataInput) {
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      if (throwOnGenerate) {
        throw new Error(`${name} generate threw error`);
      }

      if (shouldFail) {
        return {
          success: false,
          error: {
            _tag: "AI_PROVIDER_ERROR",
            code: "AI_PROVIDER_INTERNAL_ERROR",
            provider: name,
            message: `${name} generation failed`,
          },
        } as const;
      }

      return {
        success: true,
        data: {
          summary: `${summary}: ${input.content.substring(0, 20)}...`,
          tags,
        },
      } as const;
    },
  };
}

/**
 * Create a stub provider that always succeeds
 */
const alwaysStubProvider: MetadataProvider = {
  name: "stub",
  async isAvailable() {
    return true;
  },
  async generate(input: MetadataInput) {
    return {
      success: true,
      data: {
        summary: `[Stub] ${input.content.substring(0, 30)}`,
        tags: ["stub-tag"],
      },
    };
  },
};

describe("metadata router", () => {
  describe("priority order", () => {
    test("tries providers in order: first available wins", async () => {
      const callOrder: string[] = [];

      const appleProvider = createMockProvider("apple", {
        summary: "Apple summary",
      });
      appleProvider.isAvailable = mock(async () => {
        callOrder.push("apple-check");
        return true;
      });
      const originalGenerate = appleProvider.generate.bind(appleProvider);
      appleProvider.generate = mock(async (input) => {
        callOrder.push("apple-generate");
        return originalGenerate(input);
      });

      const localProvider = createMockProvider("local");
      localProvider.isAvailable = mock(async () => {
        callOrder.push("local-check");
        return true;
      });

      const router = createMetadataRouter({
        providers: [appleProvider, localProvider, alwaysStubProvider],
      });

      const result = await router.generate({ content: "test content" });

      expect(result.success).toBe(true);
      expect(callOrder).toEqual(["apple-check", "apple-generate"]);
      // Local should not be checked since Apple succeeded
      expect(callOrder).not.toContain("local-check");
    });

    test("skips unavailable providers", async () => {
      const callOrder: string[] = [];

      const appleProvider = createMockProvider("apple");
      appleProvider.isAvailable = mock(async () => {
        callOrder.push("apple-unavailable");
        return false;
      });

      const localProvider = createMockProvider("local", {
        summary: "Local summary",
      });
      localProvider.isAvailable = mock(async () => {
        callOrder.push("local-available");
        return true;
      });

      const router = createMetadataRouter({
        providers: [appleProvider, localProvider, alwaysStubProvider],
      });

      const result = await router.generate({ content: "test content" });

      expect(result.success).toBe(true);
      expect(callOrder).toContain("apple-unavailable");
      expect(callOrder).toContain("local-available");
      if (result.success) {
        expect(result.data.summary).toContain("Local summary");
      }
    });

    test("falls back through all providers on failure", async () => {
      const callOrder: string[] = [];

      const appleProvider = createMockProvider("apple", { shouldFail: true });
      appleProvider.isAvailable = mock(async () => {
        callOrder.push("apple-check");
        return true;
      });
      const appleGenerate = appleProvider.generate.bind(appleProvider);
      appleProvider.generate = mock(async (input) => {
        callOrder.push("apple-fail");
        return appleGenerate(input);
      });

      const localProvider = createMockProvider("local", { shouldFail: true });
      localProvider.isAvailable = mock(async () => {
        callOrder.push("local-check");
        return true;
      });
      const localGenerate = localProvider.generate.bind(localProvider);
      localProvider.generate = mock(async (input) => {
        callOrder.push("local-fail");
        return localGenerate(input);
      });

      const byokProvider = createMockProvider("byok", {
        summary: "BYOK summary",
      });
      byokProvider.isAvailable = mock(async () => {
        callOrder.push("byok-check");
        return true;
      });

      const router = createMetadataRouter({
        providers: [
          appleProvider,
          localProvider,
          byokProvider,
          alwaysStubProvider,
        ],
      });

      const result = await router.generate({ content: "test content" });

      expect(result.success).toBe(true);
      expect(callOrder).toEqual([
        "apple-check",
        "apple-fail",
        "local-check",
        "local-fail",
        "byok-check",
      ]);
      if (result.success) {
        expect(result.data.summary).toContain("BYOK summary");
      }
    });

    test("stub is always available as final fallback", async () => {
      const failingProvider = createMockProvider("failing", {
        shouldFail: true,
      });
      failingProvider.isAvailable = mock(async () => true);

      const router = createMetadataRouter({
        providers: [failingProvider, alwaysStubProvider],
      });

      const result = await router.generate({ content: "test content" });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.summary).toContain("[Stub]");
        expect(result.data.tags).toEqual(["stub-tag"]);
      }
    });
  });

  describe("callbacks", () => {
    test("calls onProviderSelected when provider is selected", async () => {
      const selectedProviders: string[] = [];

      const appleProvider = createMockProvider("apple");
      const router = createMetadataRouter({
        providers: [appleProvider, alwaysStubProvider],
        onProviderSelected: (provider, reason) => {
          selectedProviders.push(`${provider}:${reason}`);
        },
      });

      await router.generate({ content: "test" });

      expect(selectedProviders).toContain("apple:available");
    });

    test("calls onProviderFailed when provider fails", async () => {
      const failedProviders: string[] = [];

      const failingProvider = createMockProvider("failing", {
        shouldFail: true,
      });
      const router = createMetadataRouter({
        providers: [failingProvider, alwaysStubProvider],
        onProviderFailed: (provider, error) => {
          failedProviders.push(provider);
        },
      });

      await router.generate({ content: "test" });

      expect(failedProviders).toContain("failing");
    });
  });

  describe("input handling", () => {
    test("passes full input to provider", async () => {
      let receivedInput: MetadataInput | null = null;

      const testProvider: MetadataProvider = {
        name: "test",
        async isAvailable() {
          return true;
        },
        async generate(input) {
          receivedInput = input;
          return {
            success: true,
            data: { summary: "test", tags: [] },
          };
        },
      };

      const router = createMetadataRouter({
        providers: [testProvider],
      });

      await router.generate({
        content: "Test content",
        title: "Test Title",
        type: "note",
      });

      expect(receivedInput).toEqual({
        content: "Test content",
        title: "Test Title",
        type: "note",
      });
    });

    test("handles empty content gracefully", async () => {
      const router = createMetadataRouter({
        providers: [alwaysStubProvider],
      });

      const result = await router.generate({ content: "" });

      expect(result.success).toBe(true);
    });
  });

  describe("complete chain", () => {
    test("Apple -> Local -> BYOK -> Stub priority order", async () => {
      // This test verifies the actual provider chain order
      // with mocked availability

      const calls: string[] = [];

      // Create providers that log their checks
      const mockApple = createMockProvider("apple", { available: false });
      mockApple.isAvailable = mock(async () => {
        calls.push("apple");
        return false;
      });

      const mockLocal = createMockProvider("local", { available: false });
      mockLocal.isAvailable = mock(async () => {
        calls.push("local");
        return false;
      });

      const mockBYOK = createMockProvider("byok", { available: false });
      mockBYOK.isAvailable = mock(async () => {
        calls.push("byok");
        return false;
      });

      const router = createMetadataRouter({
        providers: [mockApple, mockLocal, mockBYOK, alwaysStubProvider],
      });

      const result = await router.generate({ content: "test" });

      // Verify order: Apple checked first, then Local, then BYOK, then Stub succeeds
      expect(calls).toEqual(["apple", "local", "byok"]);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.summary).toContain("[Stub]");
      }
    });
  });

  // ============================================================
  // MC/DC Coverage Tests
  // ============================================================
  describe("MC/DC: exception handling paths", () => {
    test("handles isAvailable() throwing exception", async () => {
      const errors: unknown[] = [];

      const throwingProvider = createMockProvider("throwing", {
        throwOnAvailable: true,
      });

      const router = createMetadataRouter({
        providers: [throwingProvider, alwaysStubProvider],
        onProviderFailed: (_provider, error) => {
          errors.push(error);
        },
      });

      const result = await router.generate({ content: "test" });

      // Should fallback to stub and succeed
      expect(result.success).toBe(true);
      // Should have recorded the error
      expect(errors.length).toBe(1);
    });

    test("handles generate() throwing exception", async () => {
      const errors: unknown[] = [];

      const throwingProvider = createMockProvider("throwing", {
        throwOnGenerate: true,
      });

      const router = createMetadataRouter({
        providers: [throwingProvider, alwaysStubProvider],
        onProviderFailed: (_provider, error) => {
          errors.push(error);
        },
      });

      const result = await router.generate({ content: "test" });

      // Should fallback to stub and succeed
      expect(result.success).toBe(true);
      // Should have recorded the error
      expect(errors.length).toBe(1);
    });

    test("handles both isAvailable and generate exceptions in chain", async () => {
      const errors: string[] = [];

      const provider1 = createMockProvider("p1", { throwOnAvailable: true });
      const provider2 = createMockProvider("p2", { throwOnGenerate: true });
      const provider3 = createMockProvider("p3", { shouldFail: true });

      const router = createMetadataRouter({
        providers: [provider1, provider2, provider3, alwaysStubProvider],
        onProviderFailed: (provider, _error) => {
          errors.push(provider);
        },
      });

      const result = await router.generate({ content: "test" });

      // Should fallback to stub
      expect(result.success).toBe(true);
      // All three providers should have failed
      expect(errors).toEqual(["p1", "p2", "p3"]);
    });
  });

  describe("MC/DC: config paths", () => {
    test("uses default providers when config.providers is undefined", async () => {
      // createMetadataRouter with no providers config uses default
      const router = createMetadataRouter();

      const result = await router.generate({ content: "test content" });

      // Should succeed with stub fallback
      expect(result.success).toBe(true);
    });

    test("works without callbacks (callbacks undefined)", async () => {
      const router = createMetadataRouter({
        providers: [alwaysStubProvider],
        // No callbacks provided
      });

      const result = await router.generate({ content: "test" });

      expect(result.success).toBe(true);
    });

    test("works with empty config object", async () => {
      const router = createMetadataRouter({});

      const result = await router.generate({ content: "test" });

      expect(result.success).toBe(true);
    });
  });

  describe("MC/DC: all providers fail path", () => {
    test("returns failure when all providers fail (no stub)", async () => {
      const failingProvider1 = createMockProvider("fail1", { shouldFail: true });
      const failingProvider2 = createMockProvider("fail2", { shouldFail: true });

      const router = createMetadataRouter({
        providers: [failingProvider1, failingProvider2],
        // No stub fallback!
      });

      const result = await router.generate({ content: "test" });

      // Should return failure since no provider succeeded
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("GENERATION_ERROR");
        expect(result.error.message).toContain("All metadata providers failed");
      }
    });

    test("returns failure when all providers unavailable", async () => {
      const unavailable1 = createMockProvider("unavail1", { available: false });
      const unavailable2 = createMockProvider("unavail2", { available: false });

      const router = createMetadataRouter({
        providers: [unavailable1, unavailable2],
        // No stub fallback!
      });

      const result = await router.generate({ content: "test" });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain("All metadata providers failed");
      }
    });

    test("accumulates errors from all failed providers", async () => {
      const fail1 = createMockProvider("fail1", { shouldFail: true });
      const fail2 = createMockProvider("fail2", { available: false });
      const fail3 = createMockProvider("fail3", { throwOnGenerate: true });

      const router = createMetadataRouter({
        providers: [fail1, fail2, fail3],
      });

      const result = await router.generate({ content: "test" });

      expect(result.success).toBe(false);
      if (!result.success) {
        // Should have error details from all providers
        const details = result.error.details as { failedProviders: unknown[]; totalErrors: number };
        expect(details.failedProviders.length).toBe(3);
        expect(details.totalErrors).toBe(3);
      }
    });
  });

  describe("MC/DC: result.success condition", () => {
    test("returns immediately on first successful result", async () => {
      const calls: string[] = [];

      const success1: MetadataProvider = {
        name: "success1",
        async isAvailable() {
          calls.push("s1-available");
          return true;
        },
        async generate(input) {
          calls.push("s1-generate");
          return {
            success: true,
            data: { summary: "success1", tags: [] },
          };
        },
      };

      const success2: MetadataProvider = {
        name: "success2",
        async isAvailable() {
          calls.push("s2-available");
          return true;
        },
        async generate(input) {
          calls.push("s2-generate");
          return {
            success: true,
            data: { summary: "success2", tags: [] },
          };
        },
      };

      const router = createMetadataRouter({
        providers: [success1, success2],
      });

      const result = await router.generate({ content: "test" });

      expect(result.success).toBe(true);
      // Should only call first provider
      expect(calls).toEqual(["s1-available", "s1-generate"]);
      expect(calls).not.toContain("s2-available");
    });
  });
});

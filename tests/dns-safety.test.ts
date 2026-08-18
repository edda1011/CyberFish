import { describe, expect, it, vi } from "vitest";
import { createDnsSafetyProvider, isNonPublicAddress } from "../lib/dns-safety/dns-safety";

describe("DNS safety provider", () => {
  it("reports only a public classification and does not expose resolved IPs", async () => {
    const resolver = vi.fn().mockResolvedValue([
      { address: "8.8.8.8", family: 4 },
      { address: "2606:4700:4700::1111", family: 6 },
    ]);

    const result = await createDnsSafetyProvider(resolver).checkHostname("example.com");

    expect(result).toEqual({ status: "public", message: "This domain resolves to a public network address." });
    expect(JSON.stringify(result)).not.toContain("8.8.8.8");
  });

  it("treats a mixed public and private answer as non-public", async () => {
    const resolver = vi.fn().mockResolvedValue([
      { address: "8.8.8.8", family: 4 },
      { address: "10.0.0.5", family: 4 },
    ]);

    const result = await createDnsSafetyProvider(resolver).checkHostname("example.com");

    expect(result.status).toBe("non_public");
  });

  it.each([
    "127.0.0.1", "10.1.2.3", "172.16.0.1", "192.168.1.1", "169.254.1.1",
    "192.0.2.1", "198.51.100.2", "203.0.113.3", "::1", "fc00::1", "fd12::1", "fe80::1", "2001:db8::1",
  ])("classifies %s as non-public", (address) => {
    expect(isNonPublicAddress(address)).toBe(true);
  });

  it.each(["1.1.1.1", "8.8.8.8", "2606:4700:4700::1111"])("classifies %s as public", (address) => {
    expect(isNonPublicAddress(address)).toBe(false);
  });

  it("distinguishes a nonexistent domain from a temporary DNS error", async () => {
    const notFound = Object.assign(new Error("not found"), { code: "ENOTFOUND" });
    const missingProvider = createDnsSafetyProvider(vi.fn().mockRejectedValue(notFound));
    const unavailableProvider = createDnsSafetyProvider(vi.fn().mockRejectedValue(Object.assign(new Error("again"), { code: "EAI_AGAIN" })));

    expect((await missingProvider.checkHostname("missing.example")).status).toBe("not_found");
    expect((await unavailableProvider.checkHostname("temporary.example")).status).toBe("unavailable");
  });

  it("returns unavailable when DNS resolution exceeds the timeout", async () => {
    vi.useFakeTimers();
    try {
      const resolver = vi.fn(() => new Promise<never>(() => undefined));
      const pending = createDnsSafetyProvider(resolver).checkHostname("slow.example");
      await vi.advanceTimersByTimeAsync(2_500);

      expect((await pending).status).toBe("unavailable");
    } finally {
      vi.useRealTimers();
    }
  });

  it.each(["127.0.0.1", "::1", "localhost"])("does not perform DNS lookup for %s", async (hostname) => {
    const resolver = vi.fn();
    const result = await createDnsSafetyProvider(resolver).checkHostname(hostname);

    expect(result.status).toBe("not_applicable");
    expect(resolver).not.toHaveBeenCalled();
  });

  it("caches only the classification for a short period", async () => {
    const resolver = vi.fn().mockResolvedValue([{ address: "8.8.8.8", family: 4 }]);
    const provider = createDnsSafetyProvider(resolver, () => 1_000);

    const first = await provider.checkHostname("example.com");
    const second = await provider.checkHostname("example.com");

    expect(second).toEqual(first);
    expect(resolver).toHaveBeenCalledOnce();
  });
});

import { describe, expect, it, vi } from "vitest";
import { createRdapProvider } from "../lib/domain-registration/rdap";

const NOW = new Date("2026-08-18T00:00:00.000Z");

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("RDAP domain registration provider", () => {
  it("extracts a registrable domain and reads its registration date", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(response({ services: [[ ["uk"], ["https://rdap.example.test/"] ]] }))
      .mockResolvedValueOnce(response({ events: [{ eventAction: "registration", eventDate: "2026-08-10T00:00:00Z" }] }));
    const provider = createRdapProvider(fetcher, () => NOW);

    const result = await provider.checkDomain("login.security.example.co.uk");

    expect(result).toMatchObject({ status: "found", registeredDomain: "example.co.uk", ageDays: 8 });
    expect(fetcher).toHaveBeenNthCalledWith(2, "https://rdap.example.test/domain/example.co.uk", expect.any(Object));
  });

  it("reuses the IANA bootstrap registry while its memory cache is fresh", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(response({ services: [[ ["com"], ["https://rdap.example.test/"] ]] }))
      .mockResolvedValue(response({ events: [{ eventAction: "registration", eventDate: "2020-01-01T00:00:00Z" }] }));
    const provider = createRdapProvider(fetcher, () => NOW);

    await provider.checkDomain("example.com");
    await provider.checkDomain("another.com");

    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it.each(["127.0.0.1", "::1", "localhost"])("does not query registration services for %s", async (hostname) => {
    const fetcher = vi.fn();
    const result = await createRdapProvider(fetcher, () => NOW).checkDomain(hostname);

    expect(result.status).toBe("not_applicable");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("fails closed when the official service redirects", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(response({ services: [[ ["com"], ["https://rdap.example.test/"] ]] }))
      .mockRejectedValueOnce(new TypeError("redirect blocked"));

    const result = await createRdapProvider(fetcher, () => NOW).checkDomain("example.com");

    expect(result.status).toBe("unavailable");
    expect(result.message).toContain("currently unavailable");
    expect(fetcher.mock.calls[1][1]).toMatchObject({ redirect: "error", cache: "no-store" });
  });

  it("returns unavailable when no registration event is provided", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(response({ services: [[ ["com"], ["https://rdap.example.test/"] ]] }))
      .mockResolvedValueOnce(response({ events: [{ eventAction: "expiration", eventDate: "2030-01-01T00:00:00Z" }] }));

    const result = await createRdapProvider(fetcher, () => NOW).checkDomain("example.com");

    expect(result.status).toBe("unavailable");
    expect(result.message).toContain("registration date");
  });
});

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import type { DnsSafetyProvider, DnsSafetyResult } from "./types";

const LOOKUP_TIMEOUT_MS = 2_500;
const CACHE_MS = 5 * 60 * 1_000;

type LookupAddress = { address: string; family: number };
type Resolver = (hostname: string, options: { all: true; verbatim: true }) => Promise<LookupAddress[]>;
type CacheEntry = { expiresAt: number; result: DnsSafetyResult };

function ipv4IsNonPublic(address: string) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a, b, c] = parts;
  return a === 0
    || a === 10
    || a === 127
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 0 && c === 0)
    || (a === 192 && b === 0 && c === 2)
    || (a === 192 && b === 88 && c === 99)
    || (a === 192 && b === 168)
    || (a === 198 && (b === 18 || b === 19))
    || (a === 198 && b === 51 && c === 100)
    || (a === 203 && b === 0 && c === 113)
    || a >= 224;
}

export function isNonPublicAddress(address: string) {
  const normalized = address.toLowerCase().split("%")[0];
  const family = isIP(normalized);
  if (family === 4) return ipv4IsNonPublic(normalized);
  if (family !== 6) return true;

  const mappedIpv4 = normalized.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  if (mappedIpv4) return ipv4IsNonPublic(mappedIpv4);

  return normalized === "::"
    || normalized === "::1"
    || normalized === "0:0:0:0:0:0:0:0"
    || normalized === "0:0:0:0:0:0:0:1"
    || /^(?:fc|fd)/.test(normalized)
    || /^fe[89ab]/.test(normalized)
    || normalized.startsWith("ff")
    || normalized.startsWith("100:")
    || normalized.startsWith("2001:2:")
    || normalized.startsWith("2001:db8:")
    || /^2001:(?:[1][0-9a-f]|2[0-9a-f]):/.test(normalized);
}

function unavailable(): DnsSafetyResult {
  return { status: "unavailable", message: "DNS information is currently unavailable." };
}

async function lookupWithTimeout(resolver: Resolver, hostname: string) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      resolver(hostname, { all: true, verbatim: true }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("DNS lookup timed out")), LOOKUP_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function createDnsSafetyProvider(
  resolver: Resolver = lookup,
  now: () => number = Date.now,
): DnsSafetyProvider {
  const cache = new Map<string, CacheEntry>();

  return {
    async checkHostname(hostname: string): Promise<DnsSafetyResult> {
      const normalized = hostname.trim().toLowerCase().replace(/\.$/, "");
      if (!normalized || normalized === "localhost" || isIP(normalized)) {
        return { status: "not_applicable", message: "DNS resolution does not apply to this address." };
      }

      const cached = cache.get(normalized);
      const currentTime = now();
      if (cached && cached.expiresAt > currentTime) return cached.result;

      try {
        const addresses = await lookupWithTimeout(resolver, normalized);

        const result: DnsSafetyResult = addresses.length === 0
          ? { status: "not_found", message: "This domain does not currently resolve to a network address." }
          : addresses.some(({ address }) => isNonPublicAddress(address))
            ? { status: "non_public", message: "This domain points to a non-public or reserved network address." }
            : { status: "public", message: "This domain resolves to a public network address." };
        cache.set(normalized, { result, expiresAt: currentTime + CACHE_MS });
        return result;
      } catch (caught) {
        const code = caught && typeof caught === "object" && "code" in caught
          ? String((caught as { code?: unknown }).code)
          : "";
        const result: DnsSafetyResult = ["ENOTFOUND", "ENODATA", "EAI_NONAME"].includes(code)
          ? { status: "not_found", message: "This domain does not currently resolve to a network address." }
          : unavailable();
        cache.set(normalized, { result, expiresAt: currentTime + CACHE_MS });
        return result;
      }
    },
  };
}

export const dnsSafety = createDnsSafetyProvider();

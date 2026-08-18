import { isIP } from "node:net";
import { getDomain } from "tldts";
import type { DomainRegistrationProvider, DomainRegistrationResult } from "./types";

const IANA_RDAP_BOOTSTRAP_URL = "https://data.iana.org/rdap/dns.json";
const REQUEST_TIMEOUT_MS = 2_500;
const BOOTSTRAP_CACHE_MS = 24 * 60 * 60 * 1_000;

type Fetcher = typeof fetch;
type RdapBootstrap = { services?: unknown };
type RdapDomain = { events?: unknown };

type BootstrapCache = {
  expiresAt: number;
  services: Array<[string[], string[]]>;
};

function unavailable(message: string): DomainRegistrationResult {
  return { provider: "rdap", status: "unavailable", message };
}

function notApplicable(message: string): DomainRegistrationResult {
  return { provider: "rdap", status: "not_applicable", message };
}

function parseServices(value: unknown): Array<[string[], string[]]> {
  if (!Array.isArray(value)) throw new Error("Invalid RDAP bootstrap data");

  return value.flatMap((entry) => {
    if (!Array.isArray(entry) || entry.length !== 2) return [];
    const [suffixes, urls] = entry;
    if (!Array.isArray(suffixes) || !Array.isArray(urls)) return [];
    const cleanSuffixes = suffixes.filter((item): item is string => typeof item === "string");
    const cleanUrls = urls.filter((item): item is string => typeof item === "string");
    return cleanSuffixes.length && cleanUrls.length ? [[cleanSuffixes, cleanUrls] as [string[], string[]]] : [];
  });
}

function safeRdapBaseUrl(urls: string[]): string | undefined {
  for (const candidate of urls) {
    try {
      const parsed = new URL(candidate);
      if (parsed.protocol === "https:" && !parsed.username && !parsed.password) {
        if (!parsed.pathname.endsWith("/")) parsed.pathname += "/";
        return parsed.toString();
      }
    } catch {
      // Ignore malformed registry entries and try the next official endpoint.
    }
  }
}

function registrationDate(payload: RdapDomain): Date | undefined {
  if (!Array.isArray(payload.events)) return undefined;

  for (const event of payload.events) {
    if (!event || typeof event !== "object") continue;
    const record = event as Record<string, unknown>;
    if (record.eventAction !== "registration" || typeof record.eventDate !== "string") continue;
    const date = new Date(record.eventDate);
    if (!Number.isNaN(date.getTime())) return date;
  }
}

async function fetchJson<T>(fetcher: Fetcher, url: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetcher(url, {
      headers: { Accept: "application/rdap+json, application/json" },
      cache: "no-store",
      redirect: "error",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`RDAP returned ${response.status}`);
    return await response.json() as T;
  } finally {
    clearTimeout(timer);
  }
}

export function createRdapProvider(fetcher: Fetcher = fetch, now: () => Date = () => new Date()): DomainRegistrationProvider {
  let bootstrapCache: BootstrapCache | undefined;

  async function services() {
    const currentTime = now().getTime();
    if (bootstrapCache && bootstrapCache.expiresAt > currentTime) return bootstrapCache.services;

    const payload = await fetchJson<RdapBootstrap>(fetcher, IANA_RDAP_BOOTSTRAP_URL);
    const parsed = parseServices(payload.services);
    bootstrapCache = { services: parsed, expiresAt: currentTime + BOOTSTRAP_CACHE_MS };
    return parsed;
  }

  return {
    async checkDomain(hostname: string): Promise<DomainRegistrationResult> {
      const normalized = hostname.trim().toLowerCase().replace(/\.$/, "");
      if (!normalized || normalized === "localhost" || isIP(normalized)) {
        return notApplicable("Domain registration age does not apply to this address.");
      }

      const registeredDomain = getDomain(normalized, { allowPrivateDomains: false });
      if (!registeredDomain) {
        return notApplicable("No public registrable domain was found for this address.");
      }

      try {
        const suffix = registeredDomain.split(".").at(-1);
        const service = (await services()).find(([suffixes]) =>
          suffixes.some((item) => item.toLowerCase() === suffix),
        );
        const baseUrl = service ? safeRdapBaseUrl(service[1]) : undefined;
        if (!baseUrl) return unavailable("Domain registration data is not available for this domain ending.");

        const endpoint = new URL(`domain/${encodeURIComponent(registeredDomain)}`, baseUrl).toString();
        const payload = await fetchJson<RdapDomain>(fetcher, endpoint);
        const registeredAt = registrationDate(payload);
        if (!registeredAt) return unavailable("The registry did not provide a readable registration date.");

        const currentTime = now().getTime();
        if (registeredAt.getTime() > currentTime + 86_400_000) {
          return unavailable("The registry provided an unexpected future registration date.");
        }
        const ageDays = Math.max(0, Math.floor((currentTime - registeredAt.getTime()) / 86_400_000));
        return {
          provider: "rdap",
          status: "found",
          registeredDomain,
          registeredAt: registeredAt.toISOString(),
          ageDays,
          message: `The registry reports that this domain was registered ${ageDays} day${ageDays === 1 ? "" : "s"} ago.`,
        };
      } catch {
        return unavailable("Domain registration data is currently unavailable.");
      }
    },
  };
}

export const domainRegistration = createRdapProvider();

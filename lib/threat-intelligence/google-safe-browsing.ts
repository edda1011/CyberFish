import type { ThreatIntelligenceProvider, ThreatIntelligenceResult } from "./types";

const ENDPOINT = "https://safebrowsing.googleapis.com/v5/urls:search";
const ADVISORY_URL = "https://developers.google.com/safe-browsing/v4/advisory";
const TIMEOUT_MS = 3000;

type GoogleThreat = {
  threatTypes: string[];
};

const THREAT_LABELS: Record<string, string> = {
  SOCIAL_ENGINEERING: "Social engineering or phishing",
  MALWARE: "Malware",
  UNWANTED_SOFTWARE: "Unwanted software",
  POTENTIALLY_HARMFUL_APPLICATION: "Potentially harmful application",
};

const THREAT_TYPES: Record<number, string> = {
  1: "MALWARE",
  2: "SOCIAL_ENGINEERING",
  3: "UNWANTED_SOFTWARE",
  4: "POTENTIALLY_HARMFUL_APPLICATION",
};

function readVarint(bytes: Uint8Array, position: { value: number }, limit = bytes.length) {
  let result = 0;
  let shift = 0;

  while (position.value < limit && shift < 35) {
    const byte = bytes[position.value++];
    result += (byte & 0x7f) * (2 ** shift);
    if ((byte & 0x80) === 0) return result;
    shift += 7;
  }

  throw new Error("Invalid protobuf varint");
}

function skipField(bytes: Uint8Array, position: { value: number }, wireType: number, limit: number) {
  if (wireType === 0) {
    readVarint(bytes, position, limit);
    return;
  }
  if (wireType === 1) {
    position.value += 8;
    return;
  }
  if (wireType === 2) {
    const fieldLength = readVarint(bytes, position, limit);
    position.value += fieldLength;
    return;
  }
  if (wireType === 5) {
    position.value += 4;
    return;
  }

  throw new Error("Unsupported protobuf field");
}

function decodeThreatUrl(bytes: Uint8Array, start: number, end: number): GoogleThreat {
  const position = { value: start };
  const threatTypes: string[] = [];

  while (position.value < end) {
    const tag = readVarint(bytes, position, end);
    const fieldNumber = tag >>> 3;
    const wireType = tag & 7;

    if (fieldNumber === 2 && wireType === 0) {
      const type = THREAT_TYPES[readVarint(bytes, position, end)];
      if (type) threatTypes.push(type);
      continue;
    }

    if (fieldNumber === 2 && wireType === 2) {
      const packedLength = readVarint(bytes, position, end);
      const packedEnd = position.value + packedLength;
      if (packedEnd > end) throw new Error("Invalid packed threat list");
      while (position.value < packedEnd) {
        const type = THREAT_TYPES[readVarint(bytes, position, packedEnd)];
        if (type) threatTypes.push(type);
      }
      continue;
    }

    skipField(bytes, position, wireType, end);
    if (position.value > end) throw new Error("Invalid threat field length");
  }

  return { threatTypes };
}

function decodeSearchUrlsResponse(buffer: ArrayBuffer): GoogleThreat[] {
  const bytes = new Uint8Array(buffer);
  const position = { value: 0 };
  const threats: GoogleThreat[] = [];

  while (position.value < bytes.length) {
    const tag = readVarint(bytes, position);
    const fieldNumber = tag >>> 3;
    const wireType = tag & 7;

    if (fieldNumber === 1 && wireType === 2) {
      const entryLength = readVarint(bytes, position);
      const end = position.value + entryLength;
      if (end > bytes.length) throw new Error("Invalid threat entry length");
      threats.push(decodeThreatUrl(bytes, position.value, end));
      position.value = end;
      continue;
    }

    skipField(bytes, position, wireType, bytes.length);
    if (position.value > bytes.length) throw new Error("Invalid response field length");
  }

  return threats;
}

function unavailable(message: string): ThreatIntelligenceResult {
  return {
    provider: "google-safe-browsing",
    status: "unavailable",
    threats: [],
    message,
  };
}

export const googleSafeBrowsingProvider: ThreatIntelligenceProvider = {
  async checkUrl(input: string) {
    const apiKey = process.env.GOOGLE_SAFE_BROWSING_API_KEY;
    if (!apiKey) {
      return unavailable("Live threat intelligence is not configured. This result uses local checks only.");
    }

    const normalizedUrl = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(input.trim())
      ? input.trim()
      : `https://${input.trim()}`;
    const endpoint = new URL(ENDPOINT);
    endpoint.searchParams.set("key", apiKey);
    endpoint.searchParams.append("urls", normalizedUrl);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(endpoint, {
        method: "GET",
        headers: { Accept: "application/x-protobuf" },
        cache: "no-store",
        signal: controller.signal,
      });

      if (!response.ok) {
        return unavailable("Live threat intelligence could not be reached. This result uses local checks only.");
      }

      const matches = decodeSearchUrlsResponse(await response.arrayBuffer());
      const threatTypes = matches.flatMap((match) =>
        match.threatTypes,
      );
      const threats = [...new Set(threatTypes)].map((type) => THREAT_LABELS[type] ?? type.replaceAll("_", " ").toLowerCase());

      if (matches.length === 0) {
        return {
          provider: "google-safe-browsing",
          status: "no_match",
          threats: [],
          message: "Google Safe Browsing returned no known threat match. This does not prove the link is safe.",
        };
      }

      return {
        provider: "google-safe-browsing",
        status: "match",
        threats: threats.length ? threats : ["Known web threat"],
        message: "Google Safe Browsing identified this address as a possible threat.",
        advisoryUrl: ADVISORY_URL,
      };
    } catch (error) {
      const message = error instanceof Error && error.name === "AbortError"
        ? "Live threat intelligence timed out. This result uses local checks only."
        : "Live threat intelligence returned an unreadable response. This result uses local checks only.";

      return unavailable(message);
    } finally {
      clearTimeout(timeout);
    }
  },
};

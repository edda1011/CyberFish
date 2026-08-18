export type DnsSafetyStatus = "public" | "non_public" | "not_found" | "unavailable" | "not_applicable";

export interface DnsSafetyResult {
  status: DnsSafetyStatus;
  message: string;
}

export interface DnsSafetyProvider {
  checkHostname(hostname: string): Promise<DnsSafetyResult>;
}

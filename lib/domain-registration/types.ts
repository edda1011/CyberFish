export type DomainRegistrationStatus = "found" | "unavailable" | "not_applicable";

export interface DomainRegistrationResult {
  provider: "rdap";
  status: DomainRegistrationStatus;
  registeredDomain?: string;
  registeredAt?: string;
  ageDays?: number;
  message: string;
}

export interface DomainRegistrationProvider {
  checkDomain(hostname: string): Promise<DomainRegistrationResult>;
}

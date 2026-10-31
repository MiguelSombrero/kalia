import { createFetchTransport, registerTransport } from "@kalia/api";
import { origins } from "@/lib/config/origins";

export const registerMobileTransport = (): void =>
  registerTransport(createFetchTransport({ baseUrl: () => origins.api }));

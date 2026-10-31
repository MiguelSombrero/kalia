import { registerTransport } from "@kalia/api";
import { kaliaFetch } from "./mutator";

/** The one call that points the shared generated client at the web's transport. */
export const registerWebTransport = (): void => registerTransport(kaliaFetch);

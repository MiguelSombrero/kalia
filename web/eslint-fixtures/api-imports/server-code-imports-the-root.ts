import { isApiError } from "@kalia/api";

export const probe = (error: unknown) => isApiError(error);

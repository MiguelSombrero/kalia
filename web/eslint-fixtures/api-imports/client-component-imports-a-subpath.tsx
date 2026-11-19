"use client";

import { isApiError } from "@kalia/api/api-error";

export const Probe = ({ error }: { error: unknown }) => <p>{isApiError(error) ? error.message : null}</p>;

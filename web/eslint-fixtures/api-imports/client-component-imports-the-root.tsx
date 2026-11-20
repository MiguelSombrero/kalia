"use client";

import { isApiError } from "@kalia/api";

export const Probe = ({ error }: { error: unknown }) => <p>{isApiError(error) ? error.message : null}</p>;

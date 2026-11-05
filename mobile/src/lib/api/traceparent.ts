import { newTraceparent } from "@kalia/api";
import { getRandomValues } from "expo-crypto";

export const startTrace = (): string => newTraceparent((bytes) => getRandomValues(new Uint8Array(bytes))).header;

import { httpFailure } from "@kalia/api";
import { readAppConfig as generatedReadAppConfig } from "@kalia/api/generated/app-config/app-config";
import type { AppConfigDto } from "@kalia/api/generated/models";

export type AppConfig = AppConfigDto;

export const readAppConfig = async (): Promise<AppConfig> => {
  const response = await generatedReadAppConfig();
  if (response.status !== 200) {
    throw httpFailure("App config read", response);
  }
  return response.data;
};

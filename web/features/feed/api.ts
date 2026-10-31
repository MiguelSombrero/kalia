import { apiError } from "@kalia/api";
import { readFeed as generatedReadFeed } from "@kalia/api/generated/feed/feed";
import type { ReadFeedParams } from "@kalia/api/generated/models";
import type { FeedPage } from "./types";

export const readFeed = async (params?: ReadFeedParams): Promise<FeedPage> => {
  const response = await generatedReadFeed(params);
  if (response.status !== 200) {
    throw apiError("http", `Feed read failed with status ${response.status}`, {
      status: response.status,
    });
  }
  return response.data;
};

import { httpFailure } from "@kalia/api";
import { readFeed as generatedReadFeed } from "@kalia/api/generated/feed/feed";
import type { ReadFeedParams } from "@kalia/api/generated/models";

import type { FeedPage } from "./types";

export const readFeed = async (params?: ReadFeedParams): Promise<FeedPage> => {
  const response = await generatedReadFeed(params);
  if (response.status !== 200) {
    throw httpFailure("Feed read", response);
  }
  return response.data;
};

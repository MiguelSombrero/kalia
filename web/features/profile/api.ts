import { httpFailure } from "@kalia/api";
import {
  changeVisibility as generatedChangeVisibility,
  myProfile as generatedMyProfile,
} from "@kalia/api/generated/profile/profile";

import type { Profile } from "./types";

export const getProfile = async (): Promise<Profile> => {
  const response = await generatedMyProfile();
  if (response.status !== 200) {
    throw httpFailure("Profile lookup", response);
  }
  return response.data;
};

export const changeCellarVisibility = async (cellarPublic: boolean): Promise<Profile> => {
  const response = await generatedChangeVisibility({ cellarPublic });
  if (response.status !== 200) {
    throw httpFailure("Changing cellar visibility", response);
  }
  return response.data;
};

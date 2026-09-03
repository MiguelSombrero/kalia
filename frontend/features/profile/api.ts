import { apiError } from "@/lib/api/api-error";
import {
  changeVisibility as generatedChangeVisibility,
  myProfile as generatedMyProfile,
} from "@/lib/api/generated/profile/profile";
import type { Profile } from "./types";

export const getProfile = async (): Promise<Profile> => {
  const response = await generatedMyProfile();
  if (response.status !== 200) {
    throw apiError("http", `Profile lookup failed with status ${response.status}`, {
      status: response.status,
    });
  }
  return response.data;
};

export const changeCellarVisibility = async (cellarPublic: boolean): Promise<Profile> => {
  const response = await generatedChangeVisibility({ cellarPublic });
  if (response.status !== 200) {
    throw apiError("http", `Changing cellar visibility failed with status ${response.status}`, {
      status: response.status,
    });
  }
  return response.data;
};

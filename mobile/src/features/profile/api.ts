import { httpFailure } from "@kalia/api";
import type { ProfileDto } from "@kalia/api/generated/models";
import { myProfile } from "@kalia/api/generated/profile/profile";

export type Profile = ProfileDto;

export const readMyProfile = async (): Promise<Profile> => {
  const response = await myProfile();
  if (response.status !== 200) {
    throw httpFailure("Profile read", response);
  }
  return response.data;
};

import { httpFailure } from "@kalia/api";
import { myProfile } from "@kalia/api/generated/profile/profile";
import type { ProfileDto } from "@kalia/api/generated/models";

export type Profile = ProfileDto;

export const readMyProfile = async (): Promise<Profile> => {
  const response = await myProfile();
  if (response.status !== 200) {
    throw httpFailure("Profile read", response);
  }
  return response.data;
};

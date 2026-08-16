"use server";

import { signIn } from "@/auth";

export const startSignIn = async () => {
  await signIn("keycloak");
};

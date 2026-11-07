import type { ContainerType } from "./types";

const labelKey: Record<ContainerType, string> = {
  BOTTLE: "container.BOTTLE",
  CAN: "container.CAN",
  KEG: "container.KEG",
};

export const probe = (type: ContainerType) => labelKey[type];

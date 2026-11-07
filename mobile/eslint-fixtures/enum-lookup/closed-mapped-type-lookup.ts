import type { BottleDtoContainerType } from "@kalia/api/generated/models";

const colour: { [K in BottleDtoContainerType]: string } = {
  BOTTLE: "green",
  CAN: "silver",
  KEG: "steel",
};

export const probe = (type: BottleDtoContainerType) => colour[type];

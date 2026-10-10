import type { ContainerType } from "./types";

/** i18n key per container type, shared by the owner and public cellars. */
export const containerLabelKey: Record<ContainerType, string> = {
  BOTTLE: "cellar.bottle.container.BOTTLE",
  CAN: "cellar.bottle.container.CAN",
  KEG: "cellar.bottle.container.KEG",
};

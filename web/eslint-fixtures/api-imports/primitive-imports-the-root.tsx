import { beerStyleGroup } from "@kalia/api";

export const Probe = ({ style }: { style: string }) => <p>{beerStyleGroup(style)}</p>;

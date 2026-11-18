import { Text } from "react-native";

type ProbeProps = { label: string };

export const Probe = ({ label }: ProbeProps) => <Text>{label}</Text>;

export const labelOf = ({ label }: { label: string }) => label;

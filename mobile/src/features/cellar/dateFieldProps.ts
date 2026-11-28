export type DateFieldProps = {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  maximumDate?: Date;
  error?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

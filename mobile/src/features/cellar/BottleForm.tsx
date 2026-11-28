import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { ActionButton } from "@/components/ActionButton";
import { spacing } from "@/components/metrics";
import { Sheet } from "@/components/Sheet";
import { textStyle, titleScale } from "@/lib/design/fonts";
import { createThemedStyles } from "@/lib/design/themedStyles";
import { formMessageKey } from "@/lib/i18n/translationKey";

import { type BottleDetails, bottleFormSchema, type BottleFormValues } from "./bottleFormSchema";
import { dayAsDate, localToday } from "./bottles";
import { ContainerPicker } from "./ContainerPicker";
import { DateField } from "./DateField";
import { QuantityStepper } from "./QuantityStepper";
import type { CellarEntry } from "./types";

type BottleFormProps = { beer: Pick<CellarEntry["beer"], "name" | "brewery">; onCancel: () => void } & (
  | { mode: "add"; onSubmit: (values: BottleFormValues) => void }
  | { mode: "edit"; bottle: BottleDetails; onSubmit: (values: BottleDetails) => void }
);

type DateName = "brewedDate" | "bestBeforeDate";

const NEW_BOTTLE: BottleFormValues = { containerType: "BOTTLE", brewedDate: null, bestBeforeDate: null, quantity: 1 };

export const BottleForm = (props: BottleFormProps) => {
  const { beer, mode, onCancel } = props;
  const styles = useStyles();
  const { t } = useTranslation();
  const [openDate, setOpenDate] = useState<DateName | null>(null);
  const {
    control,
    handleSubmit,
    setValue,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<BottleFormValues>({
    resolver: zodResolver(bottleFormSchema),
    defaultValues: props.mode === "edit" ? { ...props.bottle, quantity: NEW_BOTTLE.quantity } : NEW_BOTTLE,
  });
  const values = useWatch({ control }) as BottleFormValues;

  const submit = handleSubmit(({ quantity, ...details }) => (props.mode === "add" ? props.onSubmit({ ...details, quantity }) : props.onSubmit(details)));

  const dateField = (name: DateName, label: string, maximumDate?: Date) => {
    const message = errors[name]?.message;
    return (
      <DateField
        label={label}
        value={values[name]}
        maximumDate={maximumDate}
        error={message ? t(formMessageKey(message)) : undefined}
        open={openDate === name}
        onOpenChange={(open) => setOpenDate(open ? name : null)}
        onChange={(value) => {
          setValue(name, value);
          void trigger();
        }}
      />
    );
  };

  return (
    <Sheet
      title={mode === "add" ? t("bottleForm.addTitle") : t("cellar.edit.title")}
      closeLabel={t(`cellar.${mode}.cancel`)}
      onClose={onCancel}
      footer={
        <ActionButton
          maxFontSizeMultiplier={titleScale.maxFontSizeMultiplier}
          label={t(`cellar.${mode}.submit`)}
          disabled={isSubmitting || Object.keys(errors).length > 0}
          onPress={() => void submit()}
        />
      }
    >
      <View style={spacing.blocks}>
        <View>
          <Text style={styles.beer}>{beer.name}</Text>
          <Text style={styles.brewery}>{beer.brewery}</Text>
        </View>
        <ContainerPicker label={t(`cellar.${mode}.containerType`)} value={values.containerType} onChange={(container) => setValue("containerType", container)} />
        {mode === "add" ? <QuantityStepper value={values.quantity} onChange={(quantity) => setValue("quantity", quantity)} /> : null}
        <View>
          {dateField("brewedDate", t(`cellar.${mode}.brewedDate`), dayAsDate(localToday()))}
          {dateField("bestBeforeDate", t(`cellar.${mode}.bestBeforeDate`))}
        </View>
      </View>
    </Sheet>
  );
};

const useStyles = createThemedStyles((colors) => ({
  beer: { ...textStyle("body", "bold"), color: colors.foreground },
  brewery: { ...textStyle("supporting", "medium"), color: colors["muted-foreground"] },
}));

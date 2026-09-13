import type { Locale } from "@/i18n/settings";
import { formatRelativeInstant } from "@/lib/relativeInstant";

type RelativeTimeProps = {
  instant: string;
  locale: Locale;
  now: Date;
};

export const RelativeTime = ({ instant, locale, now }: RelativeTimeProps) => {
  const { text, datetime } = formatRelativeInstant(instant, locale, now);
  return <time dateTime={datetime}>{text}</time>;
};

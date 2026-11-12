import { beerStyleGroup } from "@kalia/api";
import { Badge } from "@/components/ui/badge";
import type { Locale } from "@/i18n/settings";
import { formatAbv } from "@/lib/abv";
import type { SuggestionRow } from "./types";

export const SuggestionHeader = ({ suggestion, locale }: { suggestion: SuggestionRow; locale: Locale }) => {
  return (
    <div className="flex flex-col gap-2">
      {/* eslint-disable-next-line no-restricted-syntax -- a beer's name heads its own suggestion, which is neither a page title nor a section */}
      <h2 className="font-display text-title font-bold text-foreground [overflow-wrap:anywhere] md:text-heading">
        {suggestion.name}
      </h2>
      <div className="flex flex-wrap gap-1.5">
        <Badge variant="style" data-beer-style={beerStyleGroup(suggestion.style)}>
          {suggestion.style}
        </Badge>
        <Badge>{formatAbv(suggestion.abv, locale)}</Badge>
      </div>
    </div>
  );
};

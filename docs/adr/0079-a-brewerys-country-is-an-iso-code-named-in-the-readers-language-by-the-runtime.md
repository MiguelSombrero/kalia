# ADR-0079: A brewery's country, shown in English to every reader, becomes an ISO 3166-1 code named in the reader's language by the runtime

- **Status:** accepted
- **Date:** 2026-10-22

## Context

A brewery's country is stored as an English string, the label the
[Wikidata import](0077-the-catalog-is-seeded-once-from-wikidata-and-owned-by-kalia.md)
took: `Sweden`, `People's Republic of China`. That one string does three
jobs. It is the stored fact, the URL value of the catalog's country filter
(`?country=Sweden`), and the text a reader sees. So a Finnish reader of a beer
page reads "kaikki maasta Sweden", and two readers in two languages cannot
share a filter link that names their own language's country.

Kalia's interface is localised in English and Finnish
([ADR-0011](0011-i18next-localization.md)), and more locales may follow. A
country is a fact with a standard identifier. Every runtime Kalia renders in,
Node on the server and the reader's browser, carries Unicode CLDR's names for
those identifiers in hundreds of languages.

The import also holds 44 breweries whose country no longer exists, or has no
ISO 3166-1 code of its own. They sit under seven names: East Germany, German
Reich, Russian Empire, Austria–Hungary, Czechoslovakia, Dutch East Indies and
Wales. A code cannot be given to those names, only to the brewery.

## Decision

**A brewery's country is stored as its ISO 3166-1 alpha-2 code and nothing
else, the API carries it as `countryCode`, and every client names the country
in its reader's language from the runtime's own CLDR data rather than from
translations Kalia keeps.**

- **The code is the only stored form.** No English name sits beside it.
  Anywhere the backend itself needs an English name, it derives one from the
  code.
- **The API speaks codes under a new name.** A brewery's `country` becomes
  `countryCode`, both on the wire and as the search parameter. Renaming it,
  rather than changing what `country` holds, makes the regenerated client
  fail to compile wherever the old field was read, instead of quietly showing
  `SE` to a reader.
- **Clients name countries themselves.** The frontend uses
  `Intl.DisplayNames`. Responses stay identical for every caller, whatever
  language the caller reads.
- **A country that has no code is resolved per brewery, to the country where
  the brewery stood, as it is today.** Its predecessor state is never mapped
  wholesale to a successor. The mapping is hand-reviewed and committed beside
  the Wikidata snapshot, as `brewery-countries.json` already is. A re-import
  that meets a codeless country the mapping does not cover stops, as it does
  for an unmapped style. The 44 breweries map as follows:
  - East Germany: 15 breweries, to Germany.
  - Russian Empire: 12 breweries, all in Tampere, to Finland.
  - German Reich: 12 breweries, by where each brewery stood:
    - to Germany: J. G. Reif (Nuremberg), Ludwig Mord (Fürstenwalde),
      Dresdner Hofbrauhaus, Engelhardt (Berlin) and Hartmanns (Berlin);
    - to Poland: Bohrisch, Stettiner Bergschloß and Stettiner Elysium
      (Szczecin), and Englisch Brunnen (Elbląg);
    - to Russia: Ponarth and Schönbusch (Königsberg), and Bürgerliches
      Brauhaus (Insterburg).
  - Austria–Hungary and Czechoslovakia: one Prague brewery each, to the Czech
    Republic.
  - Dutch East Indies: De Kroon (Batavia), to Indonesia.
  - Wales: two breweries, to the United Kingdom.

The decision does not cover how the catalog's country filter looks, beyond it
offering only countries the catalog has breweries in. That belongs to the task
that builds it. It also does not cover translating anything other than
country names.

## Alternatives considered

**Translations Kalia keeps in its own locale files.** A `countries.*` key per
country, in each locale, keyed by the stored English string. It would need no
schema or API change, and it gives full control of every word. It was rejected
for three reasons:

- It means about 250 entries per locale, kept by hand. Each new locale needs
  all of them again.
- A country added by a user, or by a re-import, silently falls back to
  English until someone notices.
- Keying a lookup by a display string means a spelling change breaks it
  without an error.

**The backend names countries in the caller's language.** The API would read
`Accept-Language` and answer with names from the JDK's CLDR data. Clients
would do nothing. It was rejected because every catalog response would then
vary by language. Responses are client-agnostic resources
([architecture.md §4](../architecture.md#4-api-design)), and a later cache
would have to key on the language as well.

**Keeping both the English name and the code.** The diff would be smaller,
and readers that want English would need nothing. It was rejected because
there would be two columns for one fact, which can disagree. Everything the
English name serves today, the code serves too.

**Mapping each former state wholesale to one successor**, so that German
Reich becomes Germany and Russian Empire becomes Russia. One rule per state,
with no per-brewery list. It was rejected because the data contradicts it.
Seven German Reich breweries stood in what is now Poland or Russia, and every
Russian Empire brewery stood in Tampere. A visible wrong country is the error
a per-brewery list exists to prevent.

**Dropping the 44 codeless breweries.** Only Tudor Brewery makes any imported
beers (three). The rest are defunct, so dropping them would cost almost
nothing. It was rejected because they are real breweries, and the import
deliberately keeps breweries whose beers Wikidata lacks, so that a user adding
one can pick it.

## Consequences

- Good, because a country reads in the reader's language in every locale
  Kalia adds, with no translation work.
- Good, because filter links name a country the same way in every language,
  and stop depending on how anyone types its name.
- Good, because catalog responses stay identical for every caller.
- Bad, because the wording is CLDR's, not Kalia's. It can differ slightly
  between the Node version that renders a page and the browser that hydrates
  it, so country names are rendered on the server, where only one runtime
  names them.
- Bad, because it is a schema change through generated code. The import's
  generator must emit codes, and `V008` is regenerated. The seed migration
  `V004` stays unchanged, so its rows get their codes some other way.
- Neutral, because the 44 formerly codeless breweries now show where they
  stood, not the state they were in. A brewery from Königsberg reads as
  Russian.
- Neutral, because the API contract changes, which is acceptable only because
  nothing outside this repository calls it yet.
- **Revisit trigger:** a reader-facing need for a country name CLDR does not
  carry, such as a historical state or a constituent country like Wales.

## Evidence

- **Runtime names.** Node v24.6.0,
  `new Intl.DisplayNames(["fi"], { type: "region" })` names `SE`, `CN`, `CZ`,
  `US`, `GB` and `XK` as "Ruotsi", "Kiina", "Tšekki", "Yhdysvallat",
  "Iso-Britannia" and "Kosovo".
- **The codeless breweries.** Counted from `V008__catalog_wikidata_import.sql`
  on `dev` at `bfd4510`. There are 44 breweries under the seven names, and
  their 3 beers all belong to Tudor Brewery (Wales).
- **Their present-day countries.** Read on 2026-10-22 from each Wikidata
  item's headquarters (P159), location (P276, P131) and coordinates (P625):
  - Bohrisch: Pomorzany, Szczecin, 53.40, 14.53.
  - Englisch Brunnen: Elbląg.
  - Ponarth: Kaliningrad.
  - Schönbusch: Königsberg.
  - Insterburg: Chernyakhovsk.
  - J. G. Reif: Nuremberg.
  - Hartmanns: Reinickendorf, Berlin.
  - Hellmichův pivovar: 50.04, 14.40, and U Čísla 1: 50.08, 14.40, both in
    Prague.
  - De Kroon: Batavia.
  - Nya Ölbryggeri: Tampere, 61.51, 23.74.
- **No merges.** Mapping all 44 to the countries above collides with no
  existing brewery's folded name and country, so none merges under the
  import's brewery rule.

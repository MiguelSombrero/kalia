# Iteration 14 — Scan the bottle in your hand

Goal: the first feature only a phone can do — scan a bottle's barcode and that
beer goes into the cellar.

## Done when

- **DW-1:** On a phone, scanning the barcode of a beer the catalog knows opens
  that beer with adding it to the cellar one step away.
- **DW-2:** Scanning a barcode the catalog does not know leads into
  [iteration 8](iteration-8.md)'s add-a-beer flow with the barcode carried
  into it.
- **DW-3:** Refusing camera access, now or permanently, leaves the user a way
  forward rather than a dead screen.
- **DW-4:** How barcodes are modelled in the catalog is a recorded decision.

## Planned tasks

Task files are written at refinement
([ADR-0047](../adr/0047-refinement-is-batched-per-iteration.md)).

- **Decision: the barcode data model** — a column on `catalog.beer` or a table
  of its own (one beer, many barcodes across sizes and markets), and how
  barcodes enter the catalog.
- **Look up a beer by barcode**, and capture a barcode in the add-a-beer API.
- **Design: the scan flow** — the viewfinder; found, not found and ambiguous.
- **Camera permission** — the rationale, a refusal, a permanent refusal and the
  way to Settings.
- **Scan, then add to the cellar.**
- **Scan an unknown beer, then add it to the catalog**, prefilled.
- **Barcodes for the imported catalog.** The source chosen in
  [iteration 8 task 01](iteration-8/01-catalog-data-source.md), Wikidata,
  carries almost none: 3 of about 19.8k beers on 2026-10-15. Imported beers
  therefore gain barcodes only as users scan them. The candidate route
  recorded at that refinement is one lookup per scan against Open Food Facts,
  the one evaluated source with barcodes. It would pre-fill the add-a-beer form
  and store the barcode in a table of its own. Open Food Facts is ODbL, so
  attribution and share-alike apply to what is taken from it; that is this
  iteration's decision to weigh.

The product owner chose a source without barcodes knowingly. The trap the
[backlog](backlog.md#product-gaps-mobile-makes-urgent) names, a catalog nobody
re-scans staying half-covered, is the accepted cost of that choice.

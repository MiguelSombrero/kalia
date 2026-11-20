# Iteration 14 — Scan the bottle in your hand (dropped)

**Dropped 2026-11-20 by the product owner.** The iteration was to scan a bottle's
barcode and put that beer in the cellar. A barcode carries only a number: none of
the name, brewery or strength Kalia would need arrives with it. Turning the number
into a beer takes a source that maps barcodes to beers, and the catalog's source,
[Wikidata](../adr/0077-the-catalog-is-seeded-once-from-wikidata-and-owned-by-kalia.md),
has almost none (3 of about 19.8k beers on 2026-10-15). The one evaluated source
that has them has no brewery field and is French-heavy, so a scan would find few
of the beers people cellar and would often lead to a form to fill in by hand,
which is the add-a-beer flow the user could have started from. The camera, its
permissions and a barcode table would be built for that.

Nothing was built, and no task files were written. The files and records that
mention this iteration are left as they were: they say what was planned when
they were written.

## What replaced it

The tab bar's central Add action, which was to carry the scan, is one way to
add a bottle by finding the beer in the catalog: iteration 12's
[task 07](iteration-12/07-design-the-add-action-and-finding-the-beer-to-add.md)
designs it and
[task 09](iteration-12/09-a-user-finds-a-beer-to-add-from-the-add-action-or-the-cellar.md)
builds it.

## If it returns

The first step is a source of barcodes with names, not a camera. The route the
iteration recorded was one lookup per scan against Open Food Facts, which is
under the ODbL; it would be decided again then, from a new evaluation.

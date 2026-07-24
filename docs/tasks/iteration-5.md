# Iteration 5 — Personal beer cellar

Goal: a signed-in beer enthusiast maintains the catalog of beers they own.

1. [ ] `cellar` module: schema + migrations (owned beers: beer reference, quantity, vintage/bottled year, purchase date and price, notes), domain rules as unit-tested logic
2. [ ] Cellar REST API (authenticated): list own cellar, add beer from catalog, update quantity/details, remove
3. [ ] Frontend: cellar page (list with age, quantity, details), add-to-cellar from beer list/detail pages
4. [ ] Playwright E2E: sign in → add a beer to cellar → edit quantity → remove it

**Done when:** a signed-in user can add a beer from the catalog to their cellar and see its age and quantity; another user cannot see it.

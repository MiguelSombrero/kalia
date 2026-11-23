package archfixture.notification.web;

import archfixture.catalog.CatalogType;

/** Violates {@code notificationKeepsNothingOfCatalogsInItsDomainOrWeb}: a web type depends on catalog. */
public class NotificationWebReachingIntoCatalog {

	public CatalogType reachIntoCatalog() {
		return new CatalogType();
	}

}

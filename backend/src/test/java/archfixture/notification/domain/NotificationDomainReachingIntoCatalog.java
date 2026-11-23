package archfixture.notification.domain;

import archfixture.catalog.CatalogType;

/** Violates {@code notificationKeepsNothingOfCatalogsInItsDomainOrWeb}: a domain type depends on catalog. */
public class NotificationDomainReachingIntoCatalog {

	public CatalogType reachIntoCatalog() {
		return new CatalogType();
	}

}

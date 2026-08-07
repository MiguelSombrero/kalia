package archfixture.badmodule.domain;

import archfixture.badmodule.application.ApplicationReachingIntoWeb;

/** Violates {@code domainDependsOnNoOuterLayer}: domain depends on application. */
public class DomainReachingOutward {

	public ApplicationReachingIntoWeb reachOutward() {
		return new ApplicationReachingIntoWeb();
	}

}

package archfixture.badmodule;

import archfixture.badmodule.domain.DomainType;

/** Violates {@code moduleRootReachesDomainThroughApplication}: a module-root
 * class depends on a domain type with no application type in the call path. */
public class ModuleRootReachingIntoDomain {

	public DomainType reachInward() {
		return new DomainType();
	}

}

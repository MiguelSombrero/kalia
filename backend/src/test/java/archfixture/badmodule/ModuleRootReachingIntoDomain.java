package archfixture.badmodule;

import archfixture.badmodule.domain.DomainType;

/** Violates {@code moduleRootDoesNotDependOnDomain}: a module-root class depends
 * on a domain type. */
public class ModuleRootReachingIntoDomain {

	public DomainType reachInward() {
		return new DomainType();
	}

}

package archfixture.identity;

import fi.kalia.identity.application.CurrentUserService;

/** Violates {@code onlyIdentityDependsOnCurrentUserService}: a module other
 * than identity depends on identity-private {@code CurrentUserService}. */
public class StrayCurrentUserServiceCaller {

	private final CurrentUserService currentUser;

	StrayCurrentUserServiceCaller(CurrentUserService currentUser) {
		this.currentUser = currentUser;
	}

}

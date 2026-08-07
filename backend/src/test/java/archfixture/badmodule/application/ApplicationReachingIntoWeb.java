package archfixture.badmodule.application;

import archfixture.badmodule.web.WebType;

/** Violates {@code applicationDoesNotDependOnWeb}. */
public class ApplicationReachingIntoWeb {

	public WebType reachOutward() {
		return new WebType();
	}

}

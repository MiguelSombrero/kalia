package archfixture.boundaries.beta;

import archfixture.boundaries.alpha.internal.AlphaInternal;

/** Violates the module boundary {@code ApplicationModules.verify()} enforces. */
public class BetaReachingIntoAlphaInternals {

	public AlphaInternal reachIn() {
		return new AlphaInternal();
	}

}

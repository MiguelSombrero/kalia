package fi.kalia.web;

import fi.kalia.feed.application.InvalidFeedCursorException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Test-only endpoint for {@link ModuleAdviceScopingIT} — no real controller
 * outside {@code feed}'s own package throws one of its exception types, so
 * this one stands in to prove {@code FeedExceptionHandler} does not answer
 * here once it is scoped to its own module.
 */
@RestController
@RequestMapping("/test/cross-module-advice-probe")
class CrossModuleAdviceProbeController {

	@GetMapping
	String probe() {
		throw new InvalidFeedCursorException("probe-exception-message");
	}

}

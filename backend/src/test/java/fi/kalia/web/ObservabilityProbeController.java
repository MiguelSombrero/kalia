package fi.kalia.web;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Test-only endpoint that fails with an unhandled exception, for ObservabilityIT. */
@RestController
@RequestMapping("/test/observability-probe")
class ObservabilityProbeController {

	@GetMapping("/fail")
	String fail() {
		throw new IllegalStateException("probe failure");
	}

}

package fi.kalia.web;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Test-only endpoints for the observability tests: one that fails, one with a path variable. */
@RestController
@RequestMapping("/test/observability-probe")
class ObservabilityProbeController {

	@GetMapping("/fail")
	String fail() {
		throw new IllegalStateException("probe failure");
	}

	@GetMapping("/echo/{id}")
	String echo(@PathVariable String id) {
		return id;
	}

}

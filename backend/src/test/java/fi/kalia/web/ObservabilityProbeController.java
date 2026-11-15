package fi.kalia.web;

import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Test-only endpoints for the observability tests: one that fails, one on a templated path, one that repeats a query. */
@RestController
@RequestMapping("/test/observability-probe")
class ObservabilityProbeController {

	static final String REPEATED_QUERY = "select count(*) from catalog.beer where id = ?";

	private final JdbcClient jdbc;

	ObservabilityProbeController(JdbcClient jdbc) {
		this.jdbc = jdbc;
	}

	@GetMapping("/fail")
	String fail() {
		throw new IllegalStateException("probe failure");
	}

	@GetMapping("/echo/{id}")
	String echo() {
		return "ok";
	}

	/** A deliberate N+1: the same statement once per iteration, as a loop over a result would run it. */
	@GetMapping("/repeat/{times}")
	String repeat(@PathVariable int times) {
		for (int i = 0; i < times; i++) {
			jdbc.sql(REPEATED_QUERY).param(UUID.randomUUID()).query(Long.class).single();
		}
		return "ok";
	}

}

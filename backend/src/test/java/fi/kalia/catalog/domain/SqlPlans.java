package fi.kalia.catalog.domain;

import java.util.Collections;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.jdbc.core.JdbcTemplate;

final class SqlPlans {

	private static final AtomicInteger PROBE_COUNT = new AtomicInteger();

	private SqlPlans() {
	}

	static int nextProbeNumber() {
		return PROBE_COUNT.incrementAndGet();
	}

	static String planFor(JdbcTemplate jdbc, String sql) {
		int parameters = (int) sql.chars().filter(character -> character == '?').count();
		String probe = "index_probe_" + nextProbeNumber();
		// PREPARE rather than EXPLAIN (GENERIC_PLAN) on the SQL directly: pgjdbc sends
		// every statement over the extended protocol, where a free $1 is a bind
		// parameter it has no value for. Postgres infers each parameter's type from
		// the statement it appears in, and force_generic_plan keeps the NULLs passed
		// for them out of the plan.
		jdbc.execute("SET LOCAL plan_cache_mode = force_generic_plan");
		jdbc.execute("PREPARE " + probe + " AS " + withPostgresPlaceholders(sql));
		String arguments = String.join(", ", Collections.nCopies(parameters, "NULL"));
		return String.join("\n",
				jdbc.queryForList("EXPLAIN EXECUTE " + probe + "(" + arguments + ")", String.class));
	}

	static String withPostgresPlaceholders(String sql) {
		StringBuilder rewritten = new StringBuilder(sql.length());
		int parameter = 0;
		for (char character : sql.toCharArray()) {
			if (character == '?') {
				rewritten.append('$').append(++parameter);
			} else {
				rewritten.append(character);
			}
		}
		return rewritten.toString();
	}

}

package fi.kalia.cellar.web;

import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;

/** Fills a cellar without 2,000 requests: a test of the limit starts at the limit. */
final class CellarSeeding {

	private CellarSeeding() {
	}

	static void bottles(JdbcTemplate jdbc, UUID userId, UUID beerId, int count) {
		UUID entryId = UUID.randomUUID();
		jdbc.update("insert into cellar.entry (id, user_id, beer_id) values (?, ?, ?)", entryId, userId, beerId);
		jdbc.update("""
				insert into cellar.bottle (entry_id, container_type)
				select ?, 'BOTTLE' from generate_series(1, ?)""", entryId, count);
	}

	static int bottlesHeld(JdbcTemplate jdbc, UUID userId) {
		return jdbc.queryForObject("""
				select count(*) from cellar.bottle b join cellar.entry e on e.id = b.entry_id
				where e.user_id = ?""", Integer.class, userId);
	}

}

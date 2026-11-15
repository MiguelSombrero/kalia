package fi.kalia.web;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.LoggerContext;
import ch.qos.logback.classic.turbo.TurboFilter;
import ch.qos.logback.core.spi.FilterReply;
import jakarta.annotation.PostConstruct;
import java.time.Duration;
import java.util.concurrent.atomic.AtomicLong;
import org.jspecify.annotations.Nullable;
import org.slf4j.LoggerFactory;
import org.slf4j.Marker;
import org.springframework.stereotype.Component;

// The OTLP exporter logs an error with a stack trace for every batch it cannot
// deliver, so a collector that has gone away would fill the log (ADR-0114).
@Component
class ExporterOutageThrottle extends TurboFilter {

	private static final String EXPORTER_PACKAGE = "io.opentelemetry.exporter.";

	private static final long QUIET_NANOS = Duration.ofMinutes(10).toNanos();

	private static final long NEVER = Long.MIN_VALUE;

	private final AtomicLong lastLoggedNanos = new AtomicLong(NEVER);

	// Replaces an earlier instance, so a second application context in one JVM
	// starts a fresh outage.
	@PostConstruct
	void register() {
		LoggerContext context = (LoggerContext) LoggerFactory.getILoggerFactory();
		context.getTurboFilterList().removeIf(ExporterOutageThrottle.class::isInstance);
		context.addTurboFilter(this);
		start();
	}

	@Override
	public FilterReply decide(@Nullable Marker marker, Logger logger, Level level, @Nullable String format,
			Object @Nullable [] params, @Nullable Throwable t) {
		if (!logger.getName().startsWith(EXPORTER_PACKAGE) || !level.isGreaterOrEqual(Level.WARN)) {
			return FilterReply.NEUTRAL;
		}
		long now = System.nanoTime();
		long last = lastLoggedNanos.get();
		boolean quiet = last != NEVER && now - last < QUIET_NANOS;
		return quiet || !lastLoggedNanos.compareAndSet(last, now) ? FilterReply.DENY : FilterReply.NEUTRAL;
	}

}

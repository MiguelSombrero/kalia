package fi.kalia.web;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Duration;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerMapping;
import org.springframework.web.filter.OncePerRequestFilter;

// ADR-0088, ADR-0013: the line names the route's pattern, never the path.
// Do not change the order: one past Boot's ServerHttpObservationFilter keeps
// the trace id in the log context, and ahead of Spring Security still logs the
// requests it rejects.
@Slf4j
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 2)
class RequestLogFilter extends OncePerRequestFilter {

	private static final String UNMATCHED_ROUTE = "unmatched";

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
			throws ServletException, IOException {
		long started = System.nanoTime();
		int status = 0;
		try {
			chain.doFilter(request, response);
			status = response.getStatus();
		} catch (ServletException | IOException | RuntimeException e) {
			// The container turns an exception that escaped the chain into a
			// 500 only after this filter has unwound, so the response still
			// says 200 here.
			status = HttpServletResponse.SC_INTERNAL_SERVER_ERROR;
			throw e;
		} finally {
			String route = routeOf(request);
			long millis = Duration.ofNanos(System.nanoTime() - started).toMillis();
			if (request.getRequestURI().startsWith("/actuator/health")) {
				log.trace("{} {} -> {} in {} ms from {}", request.getMethod(), route, status, millis,
						request.getRemoteAddr());
			} else {
				log.info("{} {} -> {} in {} ms from {}", request.getMethod(), route, status, millis,
						request.getRemoteAddr());
			}
		}
	}

	// Set by the handler mapping, so a request Spring Security rejects before
	// it reaches one has no route to name.
	private static String routeOf(HttpServletRequest request) {
		Object pattern = request.getAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE);
		return pattern != null ? pattern.toString() : UNMATCHED_ROUTE;
	}

}

package fi.kalia.web;

import io.opentelemetry.api.common.Attributes;
import io.opentelemetry.api.trace.SpanKind;
import io.opentelemetry.context.Context;
import io.opentelemetry.context.ContextKey;
import io.opentelemetry.sdk.trace.data.LinkData;
import io.opentelemetry.sdk.trace.samplers.Sampler;
import io.opentelemetry.sdk.trace.samplers.SamplingResult;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

// Keeps the readiness probe's trace out of the store (ADR-0114); the request
// is still counted and logged at TRACE.
@Configuration(proxyBeanMethods = false)
class HealthProbeTracing {

	private static final ContextKey<Boolean> UNTRACED = ContextKey.named("kalia.untraced");

	static boolean isHealthProbe(HttpServletRequest request) {
		return request.getRequestURI().startsWith("/actuator/health");
	}

	// A sampler sees only the span's start, when neither its name nor its
	// attributes are known, so the probe is marked in the context before
	// Boot's ServerHttpObservationFilter (HIGHEST_PRECEDENCE + 1) starts one.
	// A child follows its parent's decision, so the whole trace goes.
	@Component
	@Order(Ordered.HIGHEST_PRECEDENCE)
	static class Marker extends OncePerRequestFilter {

		@Override
		protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
				FilterChain chain) throws ServletException, IOException {
			if (!isHealthProbe(request)) {
				chain.doFilter(request, response);
				return;
			}
			try (var ignored = Context.current().with(UNTRACED, true).makeCurrent()) {
				chain.doFilter(request, response);
			}
		}

	}

	@Bean
	Sampler sampler(@Value("${management.tracing.sampling.probability:1.0}") double probability) {
		Sampler ratio = Sampler.traceIdRatioBased(probability);
		return Sampler.parentBased(new Sampler() {

			@Override
			public SamplingResult shouldSample(Context parentContext, String traceId, String name, SpanKind spanKind,
					Attributes attributes, List<LinkData> parentLinks) {
				if (parentContext.get(UNTRACED) != null) {
					return SamplingResult.drop();
				}
				return ratio.shouldSample(parentContext, traceId, name, spanKind, attributes, parentLinks);
			}

			@Override
			public String getDescription() {
				return "HealthProbeAware{" + ratio.getDescription() + "}";
			}

		});
	}

}

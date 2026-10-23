package fi.kalia;

import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.resilience.annotation.EnableResilientMethods;

// The services carrying @Retryable have no interface, so this needs class proxying (ADR-0057).
@Configuration(proxyBeanMethods = false)
@EnableResilientMethods(proxyTargetClass = true)
class ApplicationConfig {

	@Bean
	Clock clock() {
		return Clock.systemUTC();
	}

}

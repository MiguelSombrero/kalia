package archfixture.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

/**
 * The mistake the security guard exists to catch: a module other than
 * {@code identity} installing its own filter chain, which neither validates a
 * bearer token nor denies by default. This is the only thing
 * {@code onlyIdentityConfiguresWebSecurity} can be tested against — no
 * production class will ever trigger it.
 *
 * <p>Do not let any Spring context scan this package. Nothing scans it today
 * — it sits outside the application's base package — but this really is a
 * {@code @Configuration} declaring a chain that permits every request, and
 * Spring picks the first chain whose matcher accepts a request, so a context
 * that loaded it would answer with this one and authenticate nobody.
 */
@Configuration
public class StraySecurityConfig {

	@Bean
	SecurityFilterChain strayChain(HttpSecurity http) throws Exception {
		return http
				.authorizeHttpRequests(requests -> requests.anyRequest().permitAll())
				.build();
	}

}

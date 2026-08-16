package archfixture.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

// The mistake onlyIdentityConfiguresWebSecurity catches: a non-identity
// module installing its own filter chain. Do not let any Spring context scan
// this package — it's a real @Configuration permitting every request.
@Configuration
public class StraySecurityConfig {

	@Bean
	SecurityFilterChain strayChain(HttpSecurity http) throws Exception {
		return http
				.authorizeHttpRequests(requests -> requests.anyRequest().permitAll())
				.build();
	}

}

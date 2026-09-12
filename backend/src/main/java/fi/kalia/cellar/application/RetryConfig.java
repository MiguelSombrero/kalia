package fi.kalia.cellar.application;

import org.springframework.context.annotation.Configuration;
import org.springframework.resilience.annotation.EnableResilientMethods;

// CellarService has no interface, so this needs class proxying (ADR-0057).
@Configuration
@EnableResilientMethods(proxyTargetClass = true)
class RetryConfig {

}

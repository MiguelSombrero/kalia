package fi.kalia;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.util.Properties;
import org.junit.jupiter.api.Test;
import org.springframework.core.env.MutablePropertySources;
import org.springframework.core.env.PropertiesPropertySource;
import org.springframework.core.env.PropertyResolver;
import org.springframework.core.env.PropertySourcesPropertyResolver;
import org.springframework.core.io.ClassPathResource;

// Must stay a *Test: pom.xml's failsafe configuration forces both springdoc
// flags to true for every *IT run, so only a surefire test sees the production
// fallback that application.properties declares.
class SpringdocExposureDefaultTest {

	@Test
	void apiDocsAndSwaggerUiAreDisabledWhenNoDeploymentOptsIn() throws IOException {
		PropertyResolver config = applicationPropertiesWith(null);

		assertThat(config.getProperty("springdoc.api-docs.enabled")).isEqualTo("false");
		assertThat(config.getProperty("springdoc.swagger-ui.enabled")).isEqualTo("false");
	}

	@Test
	void aDeploymentOptsInBySettingSpringdocEnabled() throws IOException {
		PropertyResolver config = applicationPropertiesWith("true");

		assertThat(config.getProperty("springdoc.api-docs.enabled")).isEqualTo("true");
		assertThat(config.getProperty("springdoc.swagger-ui.enabled")).isEqualTo("true");
	}

	private static PropertyResolver applicationPropertiesWith(String springdocEnabled) throws IOException {
		Properties properties = new Properties();
		try (var in = new ClassPathResource("application.properties").getInputStream()) {
			properties.load(in);
		}
		if (springdocEnabled != null) {
			properties.setProperty("SPRINGDOC_ENABLED", springdocEnabled);
		}

		MutablePropertySources sources = new MutablePropertySources();
		sources.addFirst(new PropertiesPropertySource("application", properties));
		return new PropertySourcesPropertyResolver(sources);
	}

}

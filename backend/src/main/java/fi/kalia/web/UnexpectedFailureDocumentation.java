package fi.kalia.web;

import static org.springframework.http.MediaType.APPLICATION_PROBLEM_JSON_VALUE;

import io.swagger.v3.core.converter.ModelConverters;
import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.media.Content;
import io.swagger.v3.oas.models.media.MediaType;
import io.swagger.v3.oas.models.media.Schema;
import io.swagger.v3.oas.models.responses.ApiResponse;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Every operation can end in a 500, so the spec says so once instead of each
 * handler repeating it: Spring Boot answers an unexpected failure with a
 * problem+json that carries no message ({@code server.error.include-message}),
 * logged server-side (ADR-0013, ADR-0014). A handler that declares its own 500
 * keeps it.
 */
@Configuration
class UnexpectedFailureDocumentation {

	private static final String UNEXPECTED_FAILURE = "500";

	@Bean
	OpenApiCustomizer unexpectedFailureOnEveryOperation() {
		return openApi -> {
			Schema<?> problem = problemSchemaIn(openApi);
			ApiResponse unexpectedFailure = new ApiResponse()
					.description("An unexpected failure; the body carries no message")
					.content(new Content().addMediaType(APPLICATION_PROBLEM_JSON_VALUE, new MediaType().schema(problem)));
			openApi.getPaths().values().forEach(path -> path.readOperations().forEach(operation -> {
				if (!operation.getResponses().containsKey(UNEXPECTED_FAILURE)) {
					operation.getResponses().addApiResponse(UNEXPECTED_FAILURE, unexpectedFailure);
				}
			}));
		};
	}

	private static Schema<?> problemSchemaIn(OpenAPI openApi) {
		if (openApi.getComponents() == null) {
			openApi.setComponents(new Components());
		}
		Components components = openApi.getComponents();
		ModelConverters.getInstance(true).readAll(Problem.class).forEach((name, schema) -> {
			if (components.getSchemas() == null || !components.getSchemas().containsKey(name)) {
				components.addSchemas(name, schema);
			}
		});
		return new Schema<>().$ref("#/components/schemas/" + Problem.class.getSimpleName());
	}

}

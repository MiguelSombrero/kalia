package fi.kalia.web;

import static org.springframework.http.MediaType.APPLICATION_PROBLEM_JSON_VALUE;

import io.swagger.v3.oas.models.media.Content;
import io.swagger.v3.oas.models.media.MediaType;
import io.swagger.v3.oas.models.responses.ApiResponse;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Every operation that takes a body can be refused with a 415, which Spring
 * Boot sends as problem+json, so the spec says so once instead of each handler
 * repeating it (ADR-0014). A request built with the wrong {@code Content-Type}
 * is a client bug the client can fix, which is why it is typed. The
 * {@code 406} counterpart is left out; architecture.md §4 says why. A handler
 * that declares its own 415 keeps it.
 */
@Configuration
class UnsupportedMediaTypeDocumentation {

	private static final String UNSUPPORTED_MEDIA_TYPE = "415";

	@Bean
	OpenApiCustomizer unsupportedMediaTypeOnEveryOperationTakingABody() {
		return openApi -> {
			ApiResponse unsupportedMediaType = new ApiResponse()
					.description("The request body is not in a media type the operation consumes")
					.content(new Content().addMediaType(APPLICATION_PROBLEM_JSON_VALUE,
							new MediaType().schema(UnexpectedFailureDocumentation.problemSchemaIn(openApi))));
			openApi.getPaths().values().forEach(path -> path.readOperations().forEach(operation -> {
				if (operation.getRequestBody() != null
						&& !operation.getResponses().containsKey(UNSUPPORTED_MEDIA_TYPE)) {
					operation.getResponses().addApiResponse(UNSUPPORTED_MEDIA_TYPE, unsupportedMediaType);
				}
			}));
		};
	}

}

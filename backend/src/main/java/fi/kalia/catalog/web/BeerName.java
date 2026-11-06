package fi.kalia.catalog.web;

import static fi.kalia.catalog.web.AddBeerRequestDto.HAS_LETTER_OR_DIGIT;
import static fi.kalia.catalog.web.AddBeerRequestDto.HAS_LETTER_OR_DIGIT_MESSAGE;
import static fi.kalia.catalog.web.AddBeerRequestDto.MAX_NAME_LENGTH;
import static fi.kalia.catalog.web.AddBeerRequestDto.NO_CONTROL_CHARACTERS;
import static fi.kalia.catalog.web.AddBeerRequestDto.NO_CONTROL_CHARACTERS_MESSAGE;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.lang.annotation.Documented;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

import static java.lang.annotation.ElementType.ANNOTATION_TYPE;
import static java.lang.annotation.ElementType.CONSTRUCTOR;
import static java.lang.annotation.ElementType.FIELD;
import static java.lang.annotation.ElementType.METHOD;
import static java.lang.annotation.ElementType.PARAMETER;

/** A beer's name in a request, held once for adding a beer and for an admin's edit (ADR-0091). */
@NotBlank
@Size(max = MAX_NAME_LENGTH)
@Pattern(regexp = HAS_LETTER_OR_DIGIT, message = HAS_LETTER_OR_DIGIT_MESSAGE)
@Pattern(regexp = NO_CONTROL_CHARACTERS, message = NO_CONTROL_CHARACTERS_MESSAGE)
@Constraint(validatedBy = {})
@Documented
@Target({METHOD, FIELD, ANNOTATION_TYPE, CONSTRUCTOR, PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
@interface BeerName {

	String message() default "is not a valid beer name";

	Class<?>[] groups() default {};

	Class<? extends Payload>[] payload() default {};

}

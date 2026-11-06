package fi.kalia.catalog.web;

import static java.lang.annotation.ElementType.ANNOTATION_TYPE;
import static java.lang.annotation.ElementType.CONSTRUCTOR;
import static java.lang.annotation.ElementType.FIELD;
import static java.lang.annotation.ElementType.METHOD;
import static java.lang.annotation.ElementType.PARAMETER;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import java.lang.annotation.Documented;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@NotNull
@DecimalMin(BeerAbv.MIN)
@DecimalMax(BeerAbv.MAX)
// catalog.beer.abv is numeric(4, 1): PostgreSQL would round a second decimal silently.
@Digits(integer = 3, fraction = 1)
@Constraint(validatedBy = {})
@Documented
@Target({METHOD, FIELD, ANNOTATION_TYPE, CONSTRUCTOR, PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
@interface BeerAbv {

	String MIN = "0";

	String MAX = "100";

	String message() default "is not a valid alcohol by volume";

	Class<?>[] groups() default {};

	Class<? extends Payload>[] payload() default {};

}

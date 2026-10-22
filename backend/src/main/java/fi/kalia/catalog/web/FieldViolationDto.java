package fi.kalia.catalog.web;

// Not fi.kalia.web.FieldErrorDto: that would add a catalog → web module edge.
record FieldViolationDto(String field, String message) {
}

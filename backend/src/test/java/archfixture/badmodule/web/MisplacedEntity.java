package archfixture.badmodule.web;

import jakarta.persistence.Entity;

/** Violates {@code entitiesLiveInDomain}: a JPA entity outside {@code domain}. */
@Entity
public class MisplacedEntity {

}

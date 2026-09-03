package archfixture.badmodule.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import java.util.UUID;

/** Violates {@code ownedEntitiesHaveNoRepositoryOfTheirOwn} together with
 * {@link OwnedChildEntityRepository}: an entity {@link AggregateRootEntity}
 * owns via a {@code @OneToMany} with orphan removal, so it must be written
 * through that root rather than a repository of its own. */
@Entity
public class OwnedChildEntity {

	@Id
	private UUID id;

	@ManyToOne
	private AggregateRootEntity root;

}

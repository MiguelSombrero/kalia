package archfixture.badmodule.domain;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.repository.Repository;

/** Violates {@code ownedEntitiesHaveNoRepositoryOfTheirOwn}: a repository for an
 * entity owned via {@code @ManyToOne}. */
public interface OwnedChildEntityRepository extends Repository<OwnedChildEntity, UUID> {

	Optional<OwnedChildEntity> findById(UUID id);

}

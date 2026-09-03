package archfixture.badmodule.domain;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** A legitimately placed aggregate root: it owns {@link OwnedChildEntity} via a
 * {@code @OneToMany} with orphan removal, so the child gets no repository of its
 * own. Having a repository here would be fine; the fixture just needs the
 * ownership relationship to exist. */
@Entity
public class AggregateRootEntity {

	@Id
	private UUID id;

	@OneToMany(mappedBy = "root", cascade = CascadeType.ALL, orphanRemoval = true)
	private final List<OwnedChildEntity> children = new ArrayList<>();

}

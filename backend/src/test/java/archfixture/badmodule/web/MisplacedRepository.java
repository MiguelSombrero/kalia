package archfixture.badmodule.web;

import org.springframework.data.repository.Repository;

/** Violates {@code repositoriesLiveInDomain}: a repository outside {@code domain}. */
public interface MisplacedRepository extends Repository<MisplacedEntity, Long> {

}

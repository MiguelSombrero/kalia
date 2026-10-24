package archfixture.badmodule.domain;

import java.util.UUID;
import org.springframework.data.repository.Repository;

/** A legitimately placed domain repository; the target of the module-root injection. */
public interface DomainTypeRepository extends Repository<DomainType, UUID> {

}

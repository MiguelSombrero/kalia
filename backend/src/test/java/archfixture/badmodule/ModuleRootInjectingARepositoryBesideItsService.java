package archfixture.badmodule;

import archfixture.badmodule.application.ApplicationService;
import archfixture.badmodule.domain.DomainTypeRepository;

/** Violates {@code moduleRootDoesNotDependOnDomain}: an application service in the path
 * does not excuse injecting a domain repository straight in. */
public class ModuleRootInjectingARepositoryBesideItsService {

	private final ApplicationService service;

	private final DomainTypeRepository repository;

	public ModuleRootInjectingARepositoryBesideItsService(ApplicationService service,
			DomainTypeRepository repository) {
		this.service = service;
		this.repository = repository;
	}

}

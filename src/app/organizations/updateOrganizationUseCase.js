export class UpdateOrganizationUseCase {
  constructor({ organizationsRepository }) {
    this.organizationsRepository = organizationsRepository;
  }

  execute({ orgId, organization }) {
    return this.organizationsRepository.updateOrganization({ orgId, organization });
  }
}

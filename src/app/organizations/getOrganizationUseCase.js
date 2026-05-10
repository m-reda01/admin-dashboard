export class GetOrganizationUseCase {
  constructor({ organizationsRepository }) {
    this.organizationsRepository = organizationsRepository;
  }

  async execute({ orgId }) {
    return this.organizationsRepository.getOrganization({ orgId });
  }
}

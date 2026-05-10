export class ListOrganizationMembersUseCase {
  constructor({ organizationsRepository }) {
    this.organizationsRepository = organizationsRepository;
  }

  async execute({ orgId }) {
    return this.organizationsRepository.listOrganizationMembers({ orgId });
  }
}

export class ListOrganizationMembersUseCase {
  constructor({ organizationsRepository }) {
    this.organizationsRepository = organizationsRepository;
  }

  async execute({ orgId, pageSize = 200 } = {}) {
    return this.organizationsRepository.listOrganizationMembers({ orgId, pageSize });
  }
}

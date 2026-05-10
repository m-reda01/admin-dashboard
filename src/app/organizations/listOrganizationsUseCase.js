export class ListOrganizationsUseCase {
  constructor({ organizationsRepository }) {
    this.organizationsRepository = organizationsRepository;
  }

  async execute({ pageSize, withMembersCount } = {}) {
    return this.organizationsRepository.listOrganizations({ pageSize, withMembersCount });
  }
}

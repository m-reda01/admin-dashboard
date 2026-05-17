export class ListOrganizationSubscriptionsUseCase {
  constructor({ organizationsRepository }) {
    this.organizationsRepository = organizationsRepository;
  }

  async execute({ orgId, ownerUid } = {}) {
    return this.organizationsRepository.listOrganizationSubscriptions({ orgId, ownerUid });
  }
}

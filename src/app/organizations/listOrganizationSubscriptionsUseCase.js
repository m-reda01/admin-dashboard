export class ListOrganizationSubscriptionsUseCase {
  constructor({ organizationsRepository }) {
    this.organizationsRepository = organizationsRepository;
  }

  async execute({ ownerUid }) {
    return this.organizationsRepository.listOrganizationSubscriptions({ ownerUid });
  }
}

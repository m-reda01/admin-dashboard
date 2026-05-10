export class ListOrganizationDocumentsUseCase {
  constructor({ documentsRepository }) {
    this.documentsRepository = documentsRepository;
  }

  async execute({ organizationId, pageSize } = {}) {
    return this.documentsRepository.listDocumentsByOrganizationId({ organizationId, pageSize });
  }
}

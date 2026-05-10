export class UpdateDocumentUseCase {
  constructor({ documentsRepository }) {
    this.documentsRepository = documentsRepository;
  }

  async execute({ documentId, data }) {
    return this.documentsRepository.updateDocument({ documentId, data });
  }
}

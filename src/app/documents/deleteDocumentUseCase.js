export class DeleteDocumentUseCase {
  constructor({ documentsRepository }) {
    this.documentsRepository = documentsRepository;
  }

  async execute({ documentId }) {
    return this.documentsRepository.deleteDocument({ documentId });
  }
}

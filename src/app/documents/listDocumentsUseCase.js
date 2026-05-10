export class ListDocumentsUseCase {
  constructor({ documentsRepository }) {
    this.documentsRepository = documentsRepository;
  }

  async execute(options = {}) {
    return this.documentsRepository.listDocuments(options);
  }
}

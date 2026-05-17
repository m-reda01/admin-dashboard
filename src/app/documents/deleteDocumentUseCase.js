export class DeleteDocumentUseCase {
  constructor({ documentsRepository, adminAuditRepository }) {
    this.documentsRepository = documentsRepository;
    this.adminAuditRepository = adminAuditRepository;
  }

  async execute({ documentId }) {
    const result = await this.documentsRepository.deleteDocument({ documentId });
    this.adminAuditRepository
      ?.logAction({
        action: "document.delete",
        targetType: "document",
        targetId: documentId,
      })
      .catch(() => {});
    return result;
  }
}

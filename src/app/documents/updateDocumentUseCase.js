export class UpdateDocumentUseCase {
  constructor({ documentsRepository, adminAuditRepository }) {
    this.documentsRepository = documentsRepository;
    this.adminAuditRepository = adminAuditRepository;
  }

  async execute({ documentId, data }) {
    const result = await this.documentsRepository.updateDocument({ documentId, data });
    this.adminAuditRepository
      ?.logAction({
        action: "document.update",
        targetType: "document",
        targetId: documentId,
        after: {
          status: data?.status ?? null,
          paymentStatus: data?.paymentStatus ?? null,
          mintStatus: data?.mintStatus ?? null,
        },
      })
      .catch(() => {});
    return result;
  }
}

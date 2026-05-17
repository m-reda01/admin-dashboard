import { recordAdminAudit } from "../audit/recordAdminAudit.js";

export class DeleteDocumentUseCase {
  constructor({ documentsRepository, adminAuditRepository }) {
    this.documentsRepository = documentsRepository;
    this.adminAuditRepository = adminAuditRepository;
  }

  async execute({ documentId }) {
    const result = await this.documentsRepository.deleteDocument({ documentId });
    await recordAdminAudit(
      this.adminAuditRepository,
      {
        action: "document.delete",
        targetType: "document",
        targetId: documentId,
      },
      { required: true },
    );
    return result;
  }
}

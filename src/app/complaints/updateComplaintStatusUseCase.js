import { ComplaintStatus } from "../../domain/firestore/entityStatus.js";
import { recordAdminAudit } from "../audit/recordAdminAudit.js";

const ALLOWED_COMPLAINT_STATUSES = new Set(Object.values(ComplaintStatus));

export class UpdateComplaintStatusUseCase {
  constructor({ complaintsRepository, adminAuditRepository }) {
    this.complaintsRepository = complaintsRepository;
    this.adminAuditRepository = adminAuditRepository;
  }

  async execute({ complaintId, status } = {}) {
    const nextStatus = String(status ?? "").trim().toLowerCase();
    if (!ALLOWED_COMPLAINT_STATUSES.has(nextStatus)) {
      throw new Error("Unsupported complaint status.");
    }
    const result = await this.complaintsRepository.updateComplaintStatus({ complaintId, status: nextStatus });
    await recordAdminAudit(this.adminAuditRepository, {
      action: "complaint.status.update",
      targetType: "complaint",
      targetId: complaintId,
      after: { status: nextStatus },
    });
    return result;
  }
}

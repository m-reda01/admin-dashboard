export class UpdateComplaintStatusUseCase {
  constructor({ complaintsRepository, adminAuditRepository }) {
    this.complaintsRepository = complaintsRepository;
    this.adminAuditRepository = adminAuditRepository;
  }

  async execute({ complaintId, status } = {}) {
    const result = await this.complaintsRepository.updateComplaintStatus({ complaintId, status });
    this.adminAuditRepository
      ?.logAction({
        action: "complaint.status.update",
        targetType: "complaint",
        targetId: complaintId,
        after: { status },
      })
      .catch(() => {});
    return result;
  }
}

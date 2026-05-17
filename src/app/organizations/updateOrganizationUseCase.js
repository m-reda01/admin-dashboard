import { recordAdminAudit } from "../audit/recordAdminAudit.js";

export class UpdateOrganizationUseCase {
  constructor({ organizationsRepository, adminAuditRepository }) {
    this.organizationsRepository = organizationsRepository;
    this.adminAuditRepository = adminAuditRepository;
  }

  async execute({ orgId, organization }) {
    const result = await this.organizationsRepository.updateOrganization({ orgId, organization });
    await recordAdminAudit(this.adminAuditRepository, {
      action: "organization.update",
      targetType: "organization",
      targetId: orgId,
      after: {
        name: organization?.name ?? "",
        isActive: organization?.isActive !== false,
      },
    });
    return result;
  }
}

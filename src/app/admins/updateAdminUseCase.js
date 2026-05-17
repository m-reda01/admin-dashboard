import { canMutateAdmins } from "../../domain/auth/adminPermissions.js";
import { recordAdminAudit } from "../audit/recordAdminAudit.js";

export class UpdateAdminUseCase {
  constructor({ adminsRepository, adminAuditRepository }) {
    this.adminsRepository = adminsRepository;
    this.adminAuditRepository = adminAuditRepository;
  }

  async execute({ actorRole, actorUid, targetUid, displayName, adminRole, isActive }) {
    if (!canMutateAdmins(actorRole)) {
      throw new Error("Only super admins can update admins.");
    }
    if (!targetUid) throw new Error("Missing target admin.");
    if (targetUid === actorUid && isActive === false) {
      throw new Error("You cannot deactivate your own account.");
    }
    await this.adminsRepository.updateAdmin(targetUid, { displayName, adminRole, isActive });
    await recordAdminAudit(
      this.adminAuditRepository,
      {
        action: "admin.update",
        targetType: "admin",
        targetId: targetUid,
        after: {
          displayName: displayName ?? null,
          adminRole: adminRole ?? null,
          isActive: typeof isActive === "boolean" ? isActive : null,
        },
      },
      { required: true },
    );
  }
}

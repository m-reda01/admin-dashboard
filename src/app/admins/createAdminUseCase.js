import { canMutateAdmins } from "../../domain/auth/adminPermissions.js";

export class CreateAdminUseCase {
  constructor({ adminsRepository, adminAuditRepository }) {
    this.adminsRepository = adminsRepository;
    this.adminAuditRepository = adminAuditRepository;
  }

  async execute({ actorRole, email, password, displayName, adminRole }) {
    if (!canMutateAdmins(actorRole)) {
      throw new Error("Only super admins can create admins.");
    }
    const result = await this.adminsRepository.createAdmin({ email, password, displayName, adminRole });
    this.adminAuditRepository
      ?.logAction({
        action: "admin.create",
        targetType: "admin",
        targetId: result?.uid ?? "",
        after: {
          email: String(email ?? "").trim().toLowerCase(),
          displayName: displayName ?? "",
          adminRole: adminRole ?? "",
        },
      })
      .catch(() => {});
    return result;
  }
}

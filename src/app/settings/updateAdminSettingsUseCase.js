import { canMutateAdmins } from "../../domain/auth/adminPermissions.js";

export class UpdateAdminSettingsUseCase {
  constructor({ adminSettingsRepository, adminAuditRepository }) {
    this.adminSettingsRepository = adminSettingsRepository;
    this.adminAuditRepository = adminAuditRepository;
  }

  async execute({ actorRole, payload }) {
    if (!canMutateAdmins(actorRole)) {
      throw new Error("Not allowed to update settings.");
    }
    const result = await this.adminSettingsRepository.updateSettings(payload);
    this.adminAuditRepository
      ?.logAction({
        action: "admin_settings.update",
        targetType: "admin_settings",
        targetId: "general",
        after: {
          platformName: payload?.platformName ?? "",
          maintenanceMode: Boolean(payload?.maintenanceMode),
        },
      })
      .catch(() => {});
    return result;
  }
}

import { canMutateAdmins } from "../../domain/auth/adminPermissions.js";

export class UpdateAdminSettingsUseCase {
  constructor({ adminSettingsRepository }) {
    this.adminSettingsRepository = adminSettingsRepository;
  }

  async execute({ actorRole, payload }) {
    if (!canMutateAdmins(actorRole)) {
      throw new Error("Not allowed to update settings.");
    }
    return this.adminSettingsRepository.updateSettings(payload);
  }
}

import { canMutateAdmins } from "../../domain/auth/adminPermissions.js";

export class UpdateAdminUseCase {
  constructor({ adminsRepository }) {
    this.adminsRepository = adminsRepository;
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
  }
}

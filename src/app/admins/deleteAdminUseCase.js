import { canMutateAdmins } from "../../domain/auth/adminPermissions.js";

export class DeleteAdminUseCase {
  constructor({ adminsRepository }) {
    this.adminsRepository = adminsRepository;
  }

  async execute({ actorRole, actorUid, targetUid }) {
    if (!canMutateAdmins(actorRole)) {
      throw new Error("Only super admins can delete admins.");
    }
    if (!targetUid) throw new Error("Missing target admin.");
    if (targetUid === actorUid) {
      throw new Error("You cannot delete your own admin profile.");
    }
    await this.adminsRepository.deleteAdmin(targetUid);
  }
}

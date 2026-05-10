import { canMutateAdmins } from "../../domain/auth/adminPermissions.js";

export class CreateAdminUseCase {
  constructor({ adminsRepository }) {
    this.adminsRepository = adminsRepository;
  }

  async execute({ actorRole, email, password, displayName, adminRole }) {
    if (!canMutateAdmins(actorRole)) {
      throw new Error("Only super admins can create admins.");
    }
    return this.adminsRepository.createAdmin({ email, password, displayName, adminRole });
  }
}

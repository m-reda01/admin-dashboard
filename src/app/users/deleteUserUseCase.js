import { recordAdminAudit } from "../audit/recordAdminAudit.js";

export class DeleteUserUseCase {
  constructor({ usersRepository, adminAuditRepository }) {
    this.usersRepository = usersRepository;
    this.adminAuditRepository = adminAuditRepository;
  }

  async execute({ userId }) {
    if (!userId) {
      throw new Error("User id is required.");
    }

    await this.usersRepository.deleteUser({ userId });
    await recordAdminAudit(
      this.adminAuditRepository,
      {
        action: "user.delete",
        targetType: "user",
        targetId: userId,
      },
      { required: true },
    );
  }
}

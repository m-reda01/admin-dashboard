export class UpdateUserUseCase {
  constructor({ usersRepository, adminAuditRepository }) {
    this.usersRepository = usersRepository;
    this.adminAuditRepository = adminAuditRepository;
  }

  async execute({ userId, user }) {
    if (!userId) {
      throw new Error("User id is required.");
    }

    if (!user?.displayName?.trim()) {
      throw new Error("Display name is required.");
    }

    const result = await this.usersRepository.updateUser({ user, userId });
    this.adminAuditRepository
      ?.logAction({
        action: "user.update",
        targetType: "user",
        targetId: userId,
        after: {
          displayName: user?.displayName ?? "",
          role: user?.role ?? "",
          isActive: Boolean(user?.isActive),
          orgId: user?.orgId ?? "",
        },
      })
      .catch(() => {});
    return result;
  }
}

export class UpdateUserUseCase {
  constructor({ usersRepository }) {
    this.usersRepository = usersRepository;
  }

  async execute({ userId, user }) {
    if (!userId) {
      throw new Error("User id is required.");
    }

    if (!user?.displayName?.trim()) {
      throw new Error("Display name is required.");
    }

    return this.usersRepository.updateUser({ user, userId });
  }
}

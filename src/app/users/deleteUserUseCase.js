export class DeleteUserUseCase {
  constructor({ usersRepository }) {
    this.usersRepository = usersRepository;
  }

  async execute({ userId }) {
    if (!userId) {
      throw new Error("User id is required.");
    }

    await this.usersRepository.deleteUser({ userId });
  }
}

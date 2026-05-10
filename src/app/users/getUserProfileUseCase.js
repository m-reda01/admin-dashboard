export class GetUserProfileUseCase {
  constructor({ usersRepository }) {
    this.usersRepository = usersRepository;
  }

  async execute({ userId }) {
    if (!userId) {
      throw new Error("User id is required.");
    }

    return this.usersRepository.getUserProfile({ userId });
  }
}

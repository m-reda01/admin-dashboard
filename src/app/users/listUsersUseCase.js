export class ListUsersUseCase {
  constructor({ usersRepository }) {
    this.usersRepository = usersRepository;
  }

  async execute(params = {}) {
    return this.usersRepository.listUsers(params);
  }
}

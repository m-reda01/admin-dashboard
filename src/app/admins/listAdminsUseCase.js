export class ListAdminsUseCase {
  constructor({ adminsRepository }) {
    this.adminsRepository = adminsRepository;
  }

  async execute() {
    return this.adminsRepository.listAdmins();
  }
}

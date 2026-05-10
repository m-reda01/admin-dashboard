export class ListComplaintsByUserIdUseCase {
  constructor({ complaintsRepository }) {
    this.complaintsRepository = complaintsRepository;
  }

  async execute({ userId, pageSize } = {}) {
    if (!userId) {
      throw new Error("User id is required.");
    }
    return this.complaintsRepository.listComplaintsByUserId({ userId, pageSize });
  }
}

export class ListComplaintsUseCase {
  constructor({ complaintsRepository }) {
    this.complaintsRepository = complaintsRepository;
  }

  async execute({ pageSize } = {}) {
    return this.complaintsRepository.listComplaints({ pageSize });
  }
}

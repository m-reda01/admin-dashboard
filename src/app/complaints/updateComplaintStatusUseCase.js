export class UpdateComplaintStatusUseCase {
  constructor({ complaintsRepository }) {
    this.complaintsRepository = complaintsRepository;
  }

  async execute({ complaintId, status } = {}) {
    return this.complaintsRepository.updateComplaintStatus({ complaintId, status });
  }
}

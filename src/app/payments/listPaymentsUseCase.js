export class ListPaymentsUseCase {
  constructor({ paymentsRepository }) {
    this.paymentsRepository = paymentsRepository;
  }

  async execute(options = {}) {
    return this.paymentsRepository.listPayments(options);
  }
}

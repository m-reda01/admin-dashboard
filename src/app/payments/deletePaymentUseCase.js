export class DeletePaymentUseCase {
  constructor({ paymentsRepository }) {
    this.paymentsRepository = paymentsRepository;
  }

  async execute({ paymentDocId }) {
    return this.paymentsRepository.deletePayment(paymentDocId);
  }
}

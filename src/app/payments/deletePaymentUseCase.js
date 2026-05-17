export class DeletePaymentUseCase {
  constructor({ paymentsRepository, adminAuditRepository }) {
    this.paymentsRepository = paymentsRepository;
    this.adminAuditRepository = adminAuditRepository;
  }

  async execute({ paymentDocId }) {
    const result = await this.paymentsRepository.deletePayment(paymentDocId);
    this.adminAuditRepository
      ?.logAction({
        action: "payment.delete",
        targetType: "payment",
        targetId: paymentDocId,
      })
      .catch(() => {});
    return result;
  }
}

import { recordAdminAudit } from "../audit/recordAdminAudit.js";

export class DeletePaymentUseCase {
  constructor({ paymentsRepository, adminAuditRepository }) {
    this.paymentsRepository = paymentsRepository;
    this.adminAuditRepository = adminAuditRepository;
  }

  async execute({ paymentDocId }) {
    const result = await this.paymentsRepository.deletePayment(paymentDocId);
    await recordAdminAudit(
      this.adminAuditRepository,
      {
        action: "payment.delete",
        targetType: "payment",
        targetId: paymentDocId,
      },
      { required: true },
    );
    return result;
  }
}

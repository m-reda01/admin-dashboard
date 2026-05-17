import { recordAdminAudit } from "../audit/recordAdminAudit.js";

export class CreateSubscriptionPlanUseCase {
  constructor({ subscriptionPlansRepository, adminAuditRepository }) {
    this.subscriptionPlansRepository = subscriptionPlansRepository;
    this.adminAuditRepository = adminAuditRepository;
  }

  async execute(planPayload) {
    const result = await this.subscriptionPlansRepository.createPlan(planPayload);
    await recordAdminAudit(this.adminAuditRepository, {
      action: "subscription_plan.create",
      targetType: "subscription_plan",
      targetId: result?.id ?? "",
      after: {
        name: planPayload?.name ?? "",
        price: Number(planPayload?.price ?? 0),
        period: planPayload?.period ?? "",
      },
    });
    return result;
  }
}

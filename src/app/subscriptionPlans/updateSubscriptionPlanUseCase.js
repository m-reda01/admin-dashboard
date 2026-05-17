import { recordAdminAudit } from "../audit/recordAdminAudit.js";

export class UpdateSubscriptionPlanUseCase {
  constructor({ subscriptionPlansRepository, adminAuditRepository }) {
    this.subscriptionPlansRepository = subscriptionPlansRepository;
    this.adminAuditRepository = adminAuditRepository;
  }

  async execute(planId, planPayload) {
    const result = await this.subscriptionPlansRepository.updatePlan(planId, planPayload);
    await recordAdminAudit(this.adminAuditRepository, {
      action: "subscription_plan.update",
      targetType: "subscription_plan",
      targetId: planId,
      after: {
        name: planPayload?.name ?? "",
        price: Number(planPayload?.price ?? 0),
        period: planPayload?.period ?? "",
      },
    });
    return result;
  }
}

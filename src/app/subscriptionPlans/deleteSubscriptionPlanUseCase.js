import { recordAdminAudit } from "../audit/recordAdminAudit.js";

export class DeleteSubscriptionPlanUseCase {
  constructor({ subscriptionPlansRepository, adminAuditRepository }) {
    this.subscriptionPlansRepository = subscriptionPlansRepository;
    this.adminAuditRepository = adminAuditRepository;
  }

  async execute({ planId } = {}) {
    const id = String(planId ?? "").trim();
    if (!id) {
      throw new Error("Subscription plan id is required.");
    }
    const result = await this.subscriptionPlansRepository.deletePlan(id);
    await recordAdminAudit(
      this.adminAuditRepository,
      {
        action: "subscription_plan.delete",
        targetType: "subscription_plan",
        targetId: id,
        before: result?.before ?? null,
        after: result?.after ?? null,
      },
      { required: true },
    );
    return result;
  }
}

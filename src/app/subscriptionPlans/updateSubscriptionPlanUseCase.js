export class UpdateSubscriptionPlanUseCase {
  constructor({ subscriptionPlansRepository, adminAuditRepository }) {
    this.subscriptionPlansRepository = subscriptionPlansRepository;
    this.adminAuditRepository = adminAuditRepository;
  }

  async execute(planId, planPayload) {
    const result = await this.subscriptionPlansRepository.updatePlan(planId, planPayload);
    this.adminAuditRepository
      ?.logAction({
        action: "subscription_plan.update",
        targetType: "subscription_plan",
        targetId: planId,
        after: {
          name: planPayload?.name ?? "",
          price: Number(planPayload?.price ?? 0),
          period: planPayload?.period ?? "",
        },
      })
      .catch(() => {});
    return result;
  }
}

export class DeleteSubscriptionPlanUseCase {
  constructor({ subscriptionPlansRepository, adminAuditRepository }) {
    this.subscriptionPlansRepository = subscriptionPlansRepository;
    this.adminAuditRepository = adminAuditRepository;
  }

  async execute(planId) {
    const result = await this.subscriptionPlansRepository.deletePlan(planId);
    this.adminAuditRepository
      ?.logAction({
        action: "subscription_plan.delete",
        targetType: "subscription_plan",
        targetId: planId,
      })
      .catch(() => {});
    return result;
  }
}

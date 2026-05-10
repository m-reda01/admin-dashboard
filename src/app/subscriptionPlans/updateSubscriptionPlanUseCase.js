export class UpdateSubscriptionPlanUseCase {
  constructor({ subscriptionPlansRepository }) {
    this.subscriptionPlansRepository = subscriptionPlansRepository;
  }

  async execute(planId, planPayload) {
    return this.subscriptionPlansRepository.updatePlan(planId, planPayload);
  }
}

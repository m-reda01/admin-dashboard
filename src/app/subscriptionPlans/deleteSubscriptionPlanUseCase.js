export class DeleteSubscriptionPlanUseCase {
  constructor({ subscriptionPlansRepository }) {
    this.subscriptionPlansRepository = subscriptionPlansRepository;
  }

  async execute(planId) {
    return this.subscriptionPlansRepository.deletePlan(planId);
  }
}

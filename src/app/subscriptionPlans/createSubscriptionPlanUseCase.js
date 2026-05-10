export class CreateSubscriptionPlanUseCase {
  constructor({ subscriptionPlansRepository }) {
    this.subscriptionPlansRepository = subscriptionPlansRepository;
  }

  async execute(planPayload) {
    return this.subscriptionPlansRepository.createPlan(planPayload);
  }
}

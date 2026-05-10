export class ListSubscriptionPlansUseCase {
  constructor({ subscriptionPlansRepository }) {
    this.subscriptionPlansRepository = subscriptionPlansRepository;
  }

  async execute() {
    return this.subscriptionPlansRepository.listPlans();
  }
}

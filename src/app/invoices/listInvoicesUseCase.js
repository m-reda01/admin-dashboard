export class ListInvoicesUseCase {
  constructor({ invoicesRepository }) {
    this.invoicesRepository = invoicesRepository;
  }

  async execute(options = {}) {
    return this.invoicesRepository.listInvoices(options);
  }
}
export class GetAdminSettingsUseCase {
  constructor({ adminSettingsRepository }) {
    this.adminSettingsRepository = adminSettingsRepository;
  }

  async execute() {
    return this.adminSettingsRepository.getSettings();
  }
}

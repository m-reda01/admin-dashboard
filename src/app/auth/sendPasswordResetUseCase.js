import { normalizeAuthError } from "../../domain/auth/authErrors.js";

export class SendPasswordResetUseCase {
  constructor({ authRepository }) {
    this.authRepository = authRepository;
  }

  async execute({ email }) {
    if (!email?.trim()) {
      throw new Error("Email is required.");
    }

    try {
      await this.authRepository.sendPasswordResetLink({ email: email.trim() });
    } catch (error) {
      throw new Error(normalizeAuthError(error));
    }
  }
}

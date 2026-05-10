import { normalizeAuthError } from "../../domain/auth/authErrors.js";

export class SignInUseCase {
  constructor({ authRepository }) {
    this.authRepository = authRepository;
  }

  async execute({ email, password, rememberDevice }) {
    if (!email?.trim() || !password) {
      throw new Error("Email and password are required.");
    }

    try {
      return await this.authRepository.signIn({
        email: email.trim(),
        password,
        rememberDevice,
      });
    } catch (error) {
      throw new Error(normalizeAuthError(error));
    }
  }
}

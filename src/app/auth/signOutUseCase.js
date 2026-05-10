export class SignOutUseCase {
  constructor({ authRepository }) {
    this.authRepository = authRepository;
  }

  execute() {
    return this.authRepository.signOut();
  }
}

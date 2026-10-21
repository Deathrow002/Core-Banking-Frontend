import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Mirrors UserRegisPayload.PASSWORD_MIN_LENGTH / PASSWORD_MAX_LENGTH on the backend. */
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 72;

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirmPassword = group.get('confirmPassword')?.value;
  return password && confirmPassword && password !== confirmPassword ? { mismatch: true } : null;
}

@Component({
  selector: 'app-sign-up',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './sign-up.html',
  styleUrl: './sign-up.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignUp {
  private readonly auth = inject(AuthService);

  protected readonly minLength = PASSWORD_MIN_LENGTH;
  protected readonly maxLength = PASSWORD_MAX_LENGTH;

  protected readonly form = inject(NonNullableFormBuilder).group(
    {
      customerId: ['', [Validators.required, Validators.pattern(UUID_PATTERN)]],
      email: ['', [Validators.required, Validators.email]],
      password: [
        '',
        [Validators.required, Validators.minLength(PASSWORD_MIN_LENGTH), Validators.maxLength(PASSWORD_MAX_LENGTH)],
      ],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatch },
  );

  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { customerId, email, password } = this.form.getRawValue();
    this.submitting.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.auth
      .register({ customerId: customerId.trim(), email: email.trim(), password })
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (created) => {
          this.successMessage.set(`Login created for ${created.email}.`);
          this.form.reset();
        },
        error: (error: unknown) => this.errorMessage.set(toMessage(error)),
      });
  }
}

function toMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return 'Unable to reach the authentication service. Please try again later.';
    }
    if (error.status === 401) {
      return 'Your session has expired. Please sign in again.';
    }
    if (error.status === 403) {
      return 'Only administrators and managers can create logins.';
    }
    // The backend answers 400 with a plain-text reason, e.g. a duplicate email or unknown customer.
    if (error.status === 400 && typeof error.error === 'string' && error.error.trim()) {
      return error.error;
    }
    if (error.status === 400) {
      return 'Please check the details and try again.';
    }
  }
  return 'Something went wrong while creating the login. Please try again.';
}

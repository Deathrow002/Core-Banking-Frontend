import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  AbstractControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, Observable } from 'rxjs';
import { ManagedUser, UserCreatePayload, UserRole, UserUpdatePayload } from '../../../core/auth/auth.models';
import { AuthService } from '../../../core/auth/auth.service';
import {
  ADMIN_ROLE,
  assignableRoles,
  CUSTOMER_ROLE,
  toUserErrorMessage,
  UserManagementService,
} from '../../../core/users/user-management.service';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Mirrors the backend password limits in UserCreatePayload / UserUpdatePayload. */
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 72;

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value ?? '';
  const confirmPassword = group.get('confirmPassword')?.value ?? '';
  return password !== confirmPassword ? { mismatch: true } : null;
}

@Component({
  selector: 'app-user-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './user-form.html',
  styleUrl: './user-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserForm {
  protected readonly auth = inject(AuthService);
  private readonly users = inject(UserManagementService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /** The route decides the mode: /users/new is create, /users/:id/edit is edit. */
  protected readonly userId = this.route.snapshot.paramMap.get('id');
  protected readonly isEdit = this.userId !== null;

  protected readonly minLength = PASSWORD_MIN_LENGTH;
  protected readonly maxLength = PASSWORD_MAX_LENGTH;
  /** Role names loaded from the backend; a MANAGER is not offered ADMIN. */
  private readonly roleNames = signal<readonly UserRole[]>([]);
  protected readonly roleOptions = computed(() =>
    assignableRoles(this.roleNames(), this.auth.hasRole(ADMIN_ROLE)),
  );

  protected readonly form = inject(NonNullableFormBuilder).group(
    {
      customerId: [
        '',
        this.isEdit ? [] : [Validators.required, Validators.pattern(UUID_PATTERN)],
      ],
      email: ['', [Validators.required, Validators.email]],
      password: [
        '',
        this.isEdit
          ? [Validators.minLength(PASSWORD_MIN_LENGTH), Validators.maxLength(PASSWORD_MAX_LENGTH)]
          : [Validators.required, Validators.minLength(PASSWORD_MIN_LENGTH), Validators.maxLength(PASSWORD_MAX_LENGTH)],
      ],
      confirmPassword: ['', this.isEdit ? [] : [Validators.required]],
      role: [CUSTOMER_ROLE, [Validators.required]],
      enabled: [true],
    },
    { validators: passwordsMatch },
  );

  /** The user as loaded from the server, used to send only changed fields on edit. */
  private readonly original = signal<ManagedUser | null>(null);
  private readonly rolesLoaded = signal(false);
  private readonly userLoaded = signal(!this.isEdit);
  protected readonly ready = computed(() => this.rolesLoaded() && this.userLoaded());
  protected readonly loading = signal(false);
  protected readonly submitting = signal(false);
  protected readonly isSelf = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly cancelLink = this.isEdit ? ['/users', this.userId] : ['/users'];

  constructor() {
    this.loadRoles();
    if (this.isEdit) {
      this.form.controls.customerId.disable();
      this.loadUser(this.userId as string);
    }
  }

  protected submit(): void {
    if (this.submitting() || !this.ready()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    this.errorMessage.set(null);

    if (this.isEdit) {
      const payload = this.buildUpdatePayload();
      if (Object.values(payload).every((value) => value === null)) {
        this.errorMessage.set('No changes to save.');
        return;
      }
      this.run(this.users.update(this.userId as string, payload));
      return;
    }

    const payload: UserCreatePayload = {
      customerId: raw.customerId.trim(),
      email: raw.email.trim(),
      password: raw.password,
      role: raw.role,
    };
    this.run(this.users.create(payload));
  }

  /** Sends null for unchanged fields, which the backend treats as "leave as is". */
  private buildUpdatePayload(): UserUpdatePayload {
    const raw = this.form.getRawValue();
    const original = this.original();
    const email = raw.email.trim();

    return {
      email: original && email !== original.email ? email : null,
      password: raw.password ? raw.password : null,
      role: original && raw.role !== original.role ? raw.role : null,
      enabled: original && raw.enabled !== original.enabled ? raw.enabled : null,
    };
  }

  private run(request: Observable<ManagedUser>): void {
    this.submitting.set(true);

    request
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (saved) => this.router.navigate(['/users', saved.id]),
        error: (error: unknown) =>
          this.errorMessage.set(toUserErrorMessage(error, 'Could not save the user. Please try again.')),
      });
  }

  private loadRoles(): void {
    this.users.roles().subscribe({
      next: (names) => {
        this.roleNames.set(names);
        this.rolesLoaded.set(true);
      },
      error: (error: unknown) =>
        this.errorMessage.set(toUserErrorMessage(error, 'Could not load the roles. Please try again.')),
    });
  }

  private loadUser(id: string): void {
    this.loading.set(true);

    this.users
      .get(id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (user) => {
          this.original.set(user);
          this.form.patchValue({
            customerId: user.customerId,
            email: user.email,
            role: user.role,
            enabled: user.enabled,
          });

          // Changing your own role or disabling yourself is blocked by the backend, so lock those fields.
          if (user.customerId === this.auth.customerId()) {
            this.isSelf.set(true);
            this.form.controls.role.disable();
            this.form.controls.enabled.disable();
          }
          this.userLoaded.set(true);
        },
        error: (error: unknown) =>
          this.errorMessage.set(toUserErrorMessage(error, 'Could not load the user. Please try again.')),
      });
  }
}

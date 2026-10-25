import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ManagedUser, PERMISSIONS } from '../../../core/auth/auth.models';
import { AuthService } from '../../../core/auth/auth.service';
import { toUserErrorMessage, UserManagementService } from '../../../core/users/user-management.service';
import { Icon } from '../../../shared/icon/icon';

@Component({
  selector: 'app-user-detail',
  imports: [DatePipe, RouterLink, Icon],
  templateUrl: './user-detail.html',
  styleUrl: './user-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserDetail {
  private readonly users = inject(UserManagementService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly userId = this.route.snapshot.paramMap.get('id') as string;
  /** The backend enforces these permissions; hiding the actions only avoids offering calls that will fail. */
  protected readonly canEdit = this.auth.hasPermission(PERMISSIONS.edit);
  protected readonly canDelete = this.auth.hasPermission(PERMISSIONS.delete);
  protected readonly user = signal<ManagedUser | null>(null);
  protected readonly loading = signal(true);
  protected readonly deleting = signal(false);
  protected readonly confirmingDelete = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  constructor() {
    this.users
      .get(this.userId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (user) => this.user.set(user),
        error: (error: unknown) =>
          this.errorMessage.set(toUserErrorMessage(error, 'Could not load the user. Please try again.')),
      });
  }

  /** The backend also blocks self-deletion; this only avoids offering an action that will fail. */
  protected isSelf(): boolean {
    return this.user()?.customerId === this.auth.customerId();
  }

  protected confirmDelete(): void {
    this.deleting.set(true);
    this.errorMessage.set(null);

    this.users
      .delete(this.userId)
      .pipe(finalize(() => this.deleting.set(false)))
      .subscribe({
        next: () => this.router.navigate(['/users']),
        error: (error: unknown) =>
          this.errorMessage.set(toUserErrorMessage(error, 'Could not delete the user. Please try again.')),
      });
  }
}

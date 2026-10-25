import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ManagedUser, PageResponse, PERMISSIONS } from '../../../core/auth/auth.models';
import { AuthService } from '../../../core/auth/auth.service';
import {
  PAGE_SIZES,
  toUserErrorMessage,
  UserManagementService,
} from '../../../core/users/user-management.service';
import { Icon } from '../../../shared/icon/icon';

@Component({
  selector: 'app-user-list',
  imports: [DatePipe, RouterLink, Icon],
  templateUrl: './user-list.html',
  styleUrl: './user-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserList {
  private readonly users = inject(UserManagementService);
  private readonly auth = inject(AuthService);

  protected readonly pageSizes = PAGE_SIZES;
  /** The backend enforces these permissions; hiding the actions only avoids offering calls that will fail. */
  protected readonly canAdd = this.auth.hasPermission(PERMISSIONS.add);
  protected readonly canEdit = this.auth.hasPermission(PERMISSIONS.edit);
  protected readonly canDelete = this.auth.hasPermission(PERMISSIONS.delete);
  protected readonly size = signal<number>(PAGE_SIZES[1]);
  protected readonly pageIndex = signal(0);
  protected readonly data = signal<PageResponse<ManagedUser> | null>(null);
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly pendingDeleteId = signal<string | null>(null);
  protected readonly deletingId = signal<string | null>(null);

  protected readonly rows = computed(() => this.data()?.content ?? []);
  protected readonly total = computed(() => this.data()?.totalElements ?? 0);
  protected readonly totalPages = computed(() => Math.max(1, this.data()?.totalPages ?? 1));
  protected readonly canPrevious = computed(() => this.pageIndex() > 0);
  protected readonly canNext = computed(() => this.pageIndex() + 1 < this.totalPages());

  constructor() {
    this.load();
  }

  /** The backend also blocks self-deletion; this only avoids offering an action that will fail. */
  protected isSelf(user: ManagedUser): boolean {
    return user.customerId === this.auth.customerId();
  }

  protected onSizeChange(event: Event): void {
    this.size.set(Number((event.target as HTMLSelectElement).value));
    this.pageIndex.set(0);
    this.load();
  }

  protected goTo(index: number): void {
    this.pageIndex.set(index);
    this.load();
  }

  protected requestDelete(user: ManagedUser): void {
    this.successMessage.set(null);
    this.pendingDeleteId.set(user.id);
  }

  protected cancelDelete(): void {
    this.pendingDeleteId.set(null);
  }

  protected confirmDelete(user: ManagedUser): void {
    this.deletingId.set(user.id);
    this.errorMessage.set(null);

    this.users
      .delete(user.id)
      .pipe(
        finalize(() => {
          this.deletingId.set(null);
          this.pendingDeleteId.set(null);
        }),
      )
      .subscribe({
        next: () => {
          this.successMessage.set(`Deleted ${user.email}.`);
          // Step back a page when this delete empties the current one.
          if (this.rows().length === 1 && this.pageIndex() > 0) {
            this.pageIndex.update((index) => index - 1);
          }
          this.load();
        },
        error: (error: unknown) =>
          this.errorMessage.set(
            toUserErrorMessage(error, 'Could not delete the user. Please try again.'),
          ),
      });
  }

  private load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.users
      .list(this.pageIndex(), this.size())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (page) => this.data.set(page),
        error: (error: unknown) =>
          this.errorMessage.set(
            toUserErrorMessage(error, 'Could not load users. Please try again.'),
          ),
      });
  }
}

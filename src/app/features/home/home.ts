import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Permission, PERMISSIONS } from '../../core/auth/auth.models';
import { AuthService } from '../../core/auth/auth.service';
import { UserManagementService } from '../../core/users/user-management.service';
import { Icon, IconName } from '../../shared/icon/icon';

interface QuickAction {
  title: string;
  description: string;
  link: string;
  icon: IconName;
}

@Component({
  selector: 'app-home',
  imports: [DatePipe, RouterLink, Icon],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  protected readonly auth = inject(AuthService);
  private readonly users = inject(UserManagementService);

  protected readonly today = new Date();
  protected readonly greeting = greetingFor(this.today.getHours());
  protected readonly userCount = signal<number | null>(null);

  protected readonly roleNames = computed(() =>
    this.auth.roles().map((role) => role.replace(/^ROLE_/, '')),
  );

  protected readonly access = computed(() =>
    (
      [
        { label: 'Create records', permission: PERMISSIONS.add },
        { label: 'Edit records', permission: PERMISSIONS.edit },
        { label: 'Delete records', permission: PERMISSIONS.delete },
      ] satisfies { label: string; permission: Permission }[]
    ).map((entry) => ({ label: entry.label, granted: this.auth.hasPermission(entry.permission) })),
  );
  protected readonly grantedCount = computed(() => this.access().filter((e) => e.granted).length);

  protected readonly actions = computed<QuickAction[]>(() => {
    if (!this.auth.isStaff()) {
      return [];
    }
    const actions: QuickAction[] = [
      {
        title: 'Manage users',
        description: 'Review login accounts, roles and access status.',
        link: '/users',
        icon: 'users',
      },
    ];
    if (this.auth.hasPermission(PERMISSIONS.add)) {
      actions.push(
        {
          title: 'Onboard customer',
          description: 'Register a new customer profile with addresses.',
          link: '/customers/new',
          icon: 'user-plus',
        },
        {
          title: 'Open account',
          description: 'Open a deposit account for an existing customer.',
          link: '/accounts/new',
          icon: 'card',
        },
      );
    }
    return actions;
  });

  constructor() {
    if (this.auth.isStaff()) {
      // Only the total is needed, so ask for the smallest page.
      this.users.list(0, 1).subscribe({
        next: (page) => this.userCount.set(page.totalElements),
        error: () => this.userCount.set(null),
      });
    }
  }
}

function greetingFor(hour: number): string {
  if (hour < 12) {
    return 'Good morning';
  }
  return hour < 18 ? 'Good afternoon' : 'Good evening';
}

import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { BrandLogo } from '../../shared/brand-logo/brand-logo';
import { Icon, IconName } from '../../shared/icon/icon';

interface NavItem {
  label: string;
  link: string;
  icon: IconName;
  exact?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, BrandLogo, Icon],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Shell {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly navOpen = signal(false);
  protected readonly pageTitle = signal('');

  /** Menu entries mirror the route guards so users are only offered pages they can open. */
  protected readonly sections = computed<NavSection[]>(() => {
    const sections: NavSection[] = [
      { title: 'Overview', items: [{ label: 'Dashboard', link: '/home', icon: 'dashboard' }] },
    ];
    if (!this.auth.isStaff()) {
      return sections;
    }
    sections.push({
      title: 'Administration',
      items: [{ label: 'User management', link: '/users', icon: 'users' }],
    });
    sections.push({
      title: 'Operations',
      items: [
        { label: 'Customers', link: '/customers', icon: 'users' },
        { label: 'Accounts', link: '/accounts', icon: 'card' },
      ],
    });
    return sections;
  });

  protected readonly roleLabel = computed(() => formatRole(this.auth.roles()[0]));
  protected readonly initials = computed(() =>
    (this.auth.currentUser() ?? '?').replace(/[^a-z0-9]/gi, '').slice(0, 2),
  );

  constructor() {
    this.syncTitle();
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe(() => {
        this.navOpen.set(false);
        this.syncTitle();
      });
  }

  protected toggleNav(): void {
    this.navOpen.update((open) => !open);
  }

  protected logout(): void {
    this.auth.logout().subscribe({
      complete: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login']),
    });
  }

  private syncTitle(): void {
    let route = this.router.routerState.snapshot.root;
    while (route.firstChild) {
      route = route.firstChild;
    }
    this.pageTitle.set((route.title ?? '').split(' | ')[0]);
  }
}

function formatRole(role: string | undefined): string {
  if (!role) {
    return 'User';
  }
  const name = role.replace(/^ROLE_/, '').toLowerCase();
  return name.charAt(0).toUpperCase() + name.slice(1);
}

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PERMISSIONS } from '../../core/auth/auth.models';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  template: `
    <main class="home">
      <header class="home__bar">
        <strong>Core Banking</strong>
        <button type="button" (click)="logout()">Sign out</button>
      </header>
      <section class="home__content">
        <h1>Welcome, {{ auth.currentUser() }}</h1>
        @if (auth.roles().length) {
          <p>Roles: {{ auth.roles().join(', ') }}</p>
        }
        @if (auth.isStaff()) {
          <nav class="home__staff" aria-label="Staff tools">
            <a routerLink="/users">Manage users</a>
            @if (auth.hasPermission(permissions.add)) {
              <a routerLink="/accounts/new">Create account</a>
              <a routerLink="/customers/new">Create customer</a>
            }
          </nav>
        }
      </section>
    </main>
  `,
  styles: `
    .home__bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.5rem;
      background: #0b3d5c;
      color: #fff;
    }
    .home__bar button {
      border: 1px solid #fff;
      border-radius: 6px;
      background: transparent;
      color: #fff;
      padding: 0.4rem 0.9rem;
      cursor: pointer;
    }
    .home__content {
      padding: 2rem 1.5rem;
    }
    .home__staff {
      display: flex;
      gap: 1rem;
      margin-top: 1rem;
    }
    .home__staff a {
      color: #0b3d5c;
      font-weight: 600;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  protected readonly auth = inject(AuthService);
  protected readonly permissions = PERMISSIONS;
  private readonly router = inject(Router);

  protected logout(): void {
    this.auth.logout().subscribe({
      complete: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login']),
    });
  }
}

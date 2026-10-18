import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-home',
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
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected logout(): void {
    this.auth.logout().subscribe({
      complete: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login']),
    });
  }
}

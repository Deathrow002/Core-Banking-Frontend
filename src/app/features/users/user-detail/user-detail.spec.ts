import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { ManagedUser } from '../../../core/auth/auth.models';
import { AuthService } from '../../../core/auth/auth.service';
import { UserDetail } from './user-detail';

const SELF_ID = '3f2b8c1e-9a4d-4e7b-8f1a-2c3d4e5f6a7b';
const OTHER_ID = '7a1d2e3f-0000-4000-8000-000000000002';
const TELLER: ManagedUser = {
  id: 'u2',
  customerId: OTHER_ID,
  email: 'teller@bank.com',
  role: 'CUSTOMER',
  enabled: false,
  createdAt: '2025-01-02T10:00:00',
};

@Component({ template: '' })
class Placeholder {}

function buttonWithText(el: HTMLElement, text: string): HTMLButtonElement {
  const match = Array.from(el.querySelectorAll<HTMLButtonElement>('button')).find(
    (button) => button.textContent?.trim() === text,
  );
  if (!match) {
    throw new Error(`No button with text "${text}"`);
  }
  return match;
}

describe('UserDetail', () => {
  let http: HttpTestingController;
  let permissions: string[];

  beforeEach(() => {
    permissions = ['PERM_ADD', 'PERM_EDIT', 'PERM_DELETE'];
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'users', component: Placeholder },
          { path: 'users/:id', component: UserDetail },
          { path: 'users/:id/edit', component: Placeholder },
        ]),
        {
          provide: AuthService,
          useValue: {
            customerId: signal<string | null>(SELF_ID),
            hasPermission: (permission: string) => permissions.includes(permission),
          },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  async function open(user: ManagedUser) {
    const harness = await RouterTestingHarness.create(`/users/${user.id}`);
    http.expectOne(`/api/v1/auth/users/${user.id}`).flush(user);
    harness.detectChanges();
    return { harness, el: harness.routeNativeElement as HTMLElement };
  }

  it('shows the user details', async () => {
    const { el } = await open(TELLER);

    expect(el.textContent).toContain('teller@bank.com');
    expect(el.textContent).toContain(OTHER_ID);
    expect(el.textContent).toContain('CUSTOMER');
    expect(el.querySelector('.status')?.textContent).toContain('Disabled');
    expect(el.querySelector('.status--off')).not.toBeNull();
  });

  it('links to the edit page for the user', async () => {
    const { el } = await open(TELLER);

    const edit = Array.from(el.querySelectorAll<HTMLAnchorElement>('a')).find((a) => a.textContent?.trim() === 'Edit');
    expect(edit?.getAttribute('href')).toBe('/users/u2/edit');
  });

  it('hides edit and delete without the matching permissions', async () => {
    permissions = [];
    const { el } = await open(TELLER);

    expect(Array.from(el.querySelectorAll('a')).map((a) => a.textContent?.trim())).not.toContain('Edit');
    expect(Array.from(el.querySelectorAll('button')).map((b) => b.textContent?.trim())).not.toContain('Delete');
  });

  it('disables delete for the signed-in user', async () => {
    const self: ManagedUser = { ...TELLER, id: 'me', customerId: SELF_ID, email: 'me@bank.com', enabled: true };
    const { harness, el } = await open(self);
    harness.detectChanges();

    expect(el.querySelector('.badge')?.textContent).toContain('You');
    expect(buttonWithText(el, 'Delete').disabled).toBe(true);
  });

  it('deletes after confirmation and returns to the list', async () => {
    const router = TestBed.inject(Router);
    const { harness, el } = await open(TELLER);

    buttonWithText(el, 'Delete').click();
    harness.detectChanges();
    buttonWithText(el, 'Confirm delete').click();

    http.expectOne('/api/v1/auth/csrf').flush(null, { status: 204, statusText: 'No Content' });
    http.expectOne({ method: 'DELETE', url: '/api/v1/auth/users/u2' }).flush(null, {
      status: 204,
      statusText: 'No Content',
    });
    await new Promise((resolve) => setTimeout(resolve));

    expect(router.url).toBe('/users');
  });

  it('keeps the user on the page when cancelling the delete', async () => {
    const { harness, el } = await open(TELLER);

    buttonWithText(el, 'Delete').click();
    harness.detectChanges();
    buttonWithText(el, 'Cancel').click();
    harness.detectChanges();

    expect(el.textContent).toContain('teller@bank.com');
    expect(buttonWithText(el, 'Delete')).toBeTruthy();
  });
});

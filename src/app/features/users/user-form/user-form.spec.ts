import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { ManagedUser } from '../../../core/auth/auth.models';
import { AuthService } from '../../../core/auth/auth.service';
import { UserForm } from './user-form';

const SELF_ID = '3f2b8c1e-9a4d-4e7b-8f1a-2c3d4e5f6a7b';
const OTHER_ID = '7a1d2e3f-0000-4000-8000-000000000002';
const TELLER: ManagedUser = {
  id: 'u2',
  customerId: OTHER_ID,
  email: 'teller@bank.com',
  role: 'CUSTOMER',
  enabled: true,
  createdAt: '2025-01-02T10:00:00',
};

@Component({ template: '' })
class Placeholder {}

function settle(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve));
}

/** The role names the backend returns from GET /api/v1/auth/users/roles, in display order. */
const ROLE_NAMES = ['CUSTOMER', 'MANAGER', 'ADMIN'];

function flushRoles(): void {
  TestBed.inject(HttpTestingController).expectOne('/api/v1/auth/users/roles').flush(ROLE_NAMES);
}

function setInput(el: HTMLElement, selector: string, value: string): void {
  const input = el.querySelector<HTMLInputElement>(selector)!;
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

function setSelect(el: HTMLElement, selector: string, value: string): void {
  const select = el.querySelector<HTMLSelectElement>(selector)!;
  select.value = value;
  select.dispatchEvent(new Event('change'));
}

describe('UserForm', () => {
  let http: HttpTestingController;
  let isAdmin: boolean;

  beforeEach(() => {
    isAdmin = true;
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'users', component: Placeholder },
          { path: 'users/new', component: UserForm },
          { path: 'users/:id', component: Placeholder },
          { path: 'users/:id/edit', component: UserForm },
        ]),
        {
          provide: AuthService,
          useValue: {
            customerId: signal<string | null>(SELF_ID),
            hasRole: (role: string) => role === 'ADMIN' && isAdmin,
          },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  async function openCreate() {
    const harness = await RouterTestingHarness.create('/users/new');
    flushRoles();
    harness.detectChanges();
    return { harness, el: harness.routeNativeElement as HTMLElement };
  }

  async function openEdit(user: ManagedUser) {
    const harness = await RouterTestingHarness.create(`/users/${user.id}/edit`);
    flushRoles();
    http.expectOne(`/api/v1/auth/users/${user.id}`).flush(user);
    harness.detectChanges();
    return { harness, el: harness.routeNativeElement as HTMLElement };
  }

  function submit(el: HTMLElement) {
    el.querySelector<HTMLButtonElement>('button[type=submit]')!.click();
  }

  describe('create mode', () => {
    it('shows the create heading and requires a customer ID, email and password', async () => {
      const { harness, el } = await openCreate();
      harness.detectChanges();

      expect(el.querySelector('h1')?.textContent).toContain('New user');

      submit(el);
      harness.detectChanges();

      expect(el.textContent).toContain('Customer ID is required.');
      expect(el.textContent).toContain('Email is required.');
      expect(el.textContent).toContain('Password is required.');
    });

    it('rejects a customer ID that is not a UUID', async () => {
      const { harness, el } = await openCreate();
      setInput(el, '#customerId', 'not-a-uuid');
      submit(el);
      harness.detectChanges();

      expect(el.textContent).toContain('Enter a valid customer ID (UUID).');
    });

    it('creates a user after priming CSRF, then opens the new user', async () => {
      const router = TestBed.inject(Router);
      const { harness, el } = await openCreate();
      setInput(el, '#customerId', OTHER_ID);
      setInput(el, '#email', 'teller@bank.com');
      setInput(el, '#password', 'longenough');
      setInput(el, '#confirmPassword', 'longenough');
      setSelect(el, '#role', 'MANAGER');
      submit(el);

      http.expectOne('/api/v1/auth/csrf').flush(null, { status: 204, statusText: 'No Content' });
      const req = http.expectOne('/api/v1/auth/users');
      expect(req.request.body).toEqual({
        customerId: OTHER_ID,
        email: 'teller@bank.com',
        password: 'longenough',
        role: 'MANAGER',
      });
      req.flush({ ...TELLER, id: 'u9' });
      await settle();

      expect(router.url).toBe('/users/u9');
      harness.detectChanges();
    });

    it('does not send anything when the passwords differ', async () => {
      const { harness, el } = await openCreate();
      setInput(el, '#customerId', OTHER_ID);
      setInput(el, '#email', 'teller@bank.com');
      setInput(el, '#password', 'longenough');
      setInput(el, '#confirmPassword', 'different1');
      submit(el);
      harness.detectChanges();

      expect(el.textContent).toContain('Passwords do not match.');
    });

    it('offers every role except ADMIN to a manager', async () => {
      isAdmin = false;
      const { el } = await openCreate();

      const options = Array.from(el.querySelectorAll<HTMLOptionElement>('#role option')).map((o) => o.value);
      expect(options).toEqual(['CUSTOMER', 'MANAGER']);
    });

    it('offers every role to an admin', async () => {
      const { el } = await openCreate();

      const options = Array.from(el.querySelectorAll<HTMLOptionElement>('#role option')).map((o) => o.value);
      expect(options).toEqual(['CUSTOMER', 'MANAGER', 'ADMIN']);
    });

    it('blocks submit and shows an error when the roles cannot be loaded', async () => {
      const harness = await RouterTestingHarness.create('/users/new');
      TestBed.inject(HttpTestingController)
        .expectOne('/api/v1/auth/users/roles')
        .flush('down', { status: 500, statusText: 'Server Error' });
      harness.detectChanges();

      expect(harness.routeNativeElement!.textContent).toContain('Could not load the roles. Please try again.');
      expect(harness.routeNativeElement!.querySelector('form')).toBeNull();
    });
  });

  describe('edit mode', () => {
    it('loads the user, locks the customer ID and leaves the password optional', async () => {
      const { harness, el } = await openEdit(TELLER);
      harness.detectChanges();

      expect(el.querySelector('h1')?.textContent).toContain('Edit user');
      expect(el.querySelector<HTMLInputElement>('#customerId')!.disabled).toBe(true);
      expect(el.querySelector<HTMLInputElement>('#email')!.value).toBe('teller@bank.com');
      expect(el.textContent).toContain('Leave the password blank to keep it.');
    });

    it('does not send a request when nothing has changed', async () => {
      const { harness, el } = await openEdit(TELLER);
      submit(el);
      harness.detectChanges();

      expect(el.textContent).toContain('No changes to save.');
    });

    it('sends null for unchanged fields and only the changed email', async () => {
      const { el } = await openEdit(TELLER);
      setInput(el, '#email', 'renamed@bank.com');
      submit(el);

      http.expectOne('/api/v1/auth/csrf').flush(null, { status: 204, statusText: 'No Content' });
      const req = http.expectOne({ method: 'PUT', url: '/api/v1/auth/users/u2' });
      expect(req.request.body).toEqual({ email: 'renamed@bank.com', password: null, role: null, enabled: null });
      req.flush({ ...TELLER, email: 'renamed@bank.com' });
    });

    it('sends a changed role and enabled flag', async () => {
      const { el } = await openEdit(TELLER);
      setSelect(el, '#role', 'MANAGER');
      el.querySelector<HTMLInputElement>('#enabled')!.click();
      submit(el);

      http.expectOne('/api/v1/auth/csrf').flush(null, { status: 204, statusText: 'No Content' });
      const req = http.expectOne({ method: 'PUT', url: '/api/v1/auth/users/u2' });
      expect(req.request.body).toEqual({ email: null, password: null, role: 'MANAGER', enabled: false });
      req.flush({ ...TELLER, role: 'MANAGER', enabled: false });
    });

    it('locks role and enabled when editing the signed-in user', async () => {
      const self: ManagedUser = { ...TELLER, id: 'me', customerId: SELF_ID, email: 'me@bank.com', role: 'ADMIN' };
      const { harness, el } = await openEdit(self);
      harness.detectChanges();

      expect(el.querySelector<HTMLSelectElement>('#role')!.disabled).toBe(true);
      expect(el.querySelector<HTMLInputElement>('#enabled')!.disabled).toBe(true);
      expect(el.textContent).toContain('You cannot change your own role.');
      expect(el.textContent).toContain('You cannot disable your own account.');
    });
  });
});

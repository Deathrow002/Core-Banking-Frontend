import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SignUp } from './sign-up';

const CUSTOMER_ID = '3f2b8c1e-9a4d-4e7b-8f1a-2c3d4e5f6a7b';

describe('SignUp', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SignUp],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function render() {
    const fixture = TestBed.createComponent(SignUp);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  function fill(el: HTMLElement, values: { customerId: string; email: string; password: string; confirm: string }) {
    const set = (selector: string, value: string) => {
      const input = el.querySelector<HTMLInputElement>(selector)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    set('#customerId', values.customerId);
    set('#email', values.email);
    set('#password', values.password);
    set('#confirmPassword', values.confirm);
  }

  function submit(el: HTMLElement) {
    el.querySelector<HTMLButtonElement>('button[type=submit]')!.click();
  }

  function answerCsrf() {
    http.expectOne('/api/v1/auth/csrf').flush(null, { status: 204, statusText: 'No Content' });
  }

  it('shows validation errors and does not call the API when empty', async () => {
    const { fixture, el } = render();

    submit(el);
    await fixture.whenStable();

    expect(el.textContent).toContain('Customer ID is required.');
    expect(el.textContent).toContain('Email is required.');
    expect(el.textContent).toContain('Password is required.');
    http.expectNone('/api/v1/auth/csrf');
    http.expectNone('/api/v1/auth/register');
  });

  it('rejects a customer ID that is not a UUID', async () => {
    const { fixture, el } = render();
    fill(el, { customerId: 'not-a-uuid', email: 'new@bank.com', password: 'longenough', confirm: 'longenough' });

    submit(el);
    await fixture.whenStable();

    expect(el.textContent).toContain('Enter a valid customer ID (UUID).');
    http.expectNone('/api/v1/auth/register');
  });

  it('rejects passwords that do not match', async () => {
    const { fixture, el } = render();
    fill(el, { customerId: CUSTOMER_ID, email: 'new@bank.com', password: 'longenough', confirm: 'different1' });

    submit(el);
    await fixture.whenStable();

    expect(el.textContent).toContain('Passwords do not match.');
    http.expectNone('/api/v1/auth/register');
  });

  it('rejects passwords shorter than the backend minimum', async () => {
    const { fixture, el } = render();
    fill(el, { customerId: CUSTOMER_ID, email: 'new@bank.com', password: 'short', confirm: 'short' });

    submit(el);
    await fixture.whenStable();

    expect(el.textContent).toContain('Password must be between 8 and 72 characters.');
    http.expectNone('/api/v1/auth/register');
  });

  it('creates the login, shows confirmation and clears the form', async () => {
    const { fixture, el } = render();
    fill(el, { customerId: CUSTOMER_ID, email: 'new@bank.com', password: 'longenough', confirm: 'longenough' });

    submit(el);
    answerCsrf();
    const req = http.expectOne('/api/v1/auth/register');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      customerId: CUSTOMER_ID,
      email: 'new@bank.com',
      password: 'longenough',
    });
    req.flush({ email: 'new@bank.com', customerId: CUSTOMER_ID, role: 'CUSTOMER' });
    await fixture.whenStable();

    expect(el.querySelector('[role=status]')?.textContent).toContain('Login created for new@bank.com.');
    expect(el.querySelector<HTMLInputElement>('#email')!.value).toBe('');
    expect(el.querySelector<HTMLInputElement>('#password')!.value).toBe('');
  });

  it('shows the server reason when the customer is rejected', async () => {
    const { fixture, el } = render();
    fill(el, { customerId: CUSTOMER_ID, email: 'new@bank.com', password: 'longenough', confirm: 'longenough' });

    submit(el);
    answerCsrf();
    http
      .expectOne('/api/v1/auth/register')
      .flush('User already exists with email new@bank.com', { status: 400, statusText: 'Bad Request' });
    await fixture.whenStable();

    expect(el.querySelector('[role=alert]')?.textContent).toContain('User already exists with email new@bank.com');
  });

  it('explains the permission rule when the caller is not staff', async () => {
    const { fixture, el } = render();
    fill(el, { customerId: CUSTOMER_ID, email: 'new@bank.com', password: 'longenough', confirm: 'longenough' });

    submit(el);
    answerCsrf();
    http.expectOne('/api/v1/auth/register').flush(null, { status: 403, statusText: 'Forbidden' });
    await fixture.whenStable();

    expect(el.querySelector('[role=alert]')?.textContent).toContain('Only administrators and managers can create logins.');
  });
});

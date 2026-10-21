import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Login } from './login';

describe('Login', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function render() {
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  function fill(el: HTMLElement, email: string, password: string) {
    const emailInput = el.querySelector<HTMLInputElement>('#email')!;
    const passwordInput = el.querySelector<HTMLInputElement>('#password')!;
    emailInput.value = email;
    emailInput.dispatchEvent(new Event('input'));
    passwordInput.value = password;
    passwordInput.dispatchEvent(new Event('input'));
  }

  function answerLogin(response: object | string, options?: { status: number; statusText: string }) {
    http.expectOne('/api/v1/auth/csrf').flush(null, { status: 204, statusText: 'No Content' });
    http.expectOne('/api/v1/auth/login').flush(response, options);
  }

  it('shows validation errors and does not call the API when empty', async () => {
    const { fixture, el } = render();

    el.querySelector<HTMLButtonElement>('button[type=submit]')!.click();
    await fixture.whenStable();

    expect(el.textContent).toContain('Email is required.');
    expect(el.textContent).toContain('Password is required.');
    http.expectNone('/api/v1/auth/csrf');
    http.expectNone('/api/v1/auth/login');
  });

  it('shows an error message when credentials are rejected', async () => {
    const { fixture, el } = render();
    fill(el, 'jane@bank.com', 'wrong');

    el.querySelector<HTMLButtonElement>('button[type=submit]')!.click();
    answerLogin('Invalid email or password', { status: 400, statusText: 'Bad Request' });
    await fixture.whenStable();

    expect(el.querySelector('[role=alert]')?.textContent).toContain('Invalid email or password.');
  });

  it('navigates home after a successful login', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const { fixture, el } = render();
    fill(el, 'jane@bank.com', 'secret');

    el.querySelector<HTMLButtonElement>('button[type=submit]')!.click();
    answerLogin({ username: 'jane@bank.com', customerId: 'c-1', roles: ['ROLE_CUSTOMER'] });
    await fixture.whenStable();

    expect(navigate).toHaveBeenCalledWith('/home');
  });
});

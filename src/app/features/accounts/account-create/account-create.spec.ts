import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AccountCreate } from './account-create';

const CUSTOMER = {
  customerId: '3f2b8c1e-9a4d-4e7b-8f1a-2c3d4e5f6a7b',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@bank.com',
};
const PAGE = { content: [CUSTOMER], totalElements: 1, totalPages: 1, number: 0, size: 10 };
const LOOKUPS = { accountTypes: ['SAVING', 'CURRENT'], currencyTypes: ['THB', 'USD'] };

describe('AccountCreate', () => {
  let fixture: ComponentFixture<AccountCreate>;
  let http: HttpTestingController;
  let el: HTMLElement;

  beforeEach(async () => {
    vi.useFakeTimers();
    await TestBed.configureTestingModule({
      imports: [AccountCreate],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountCreate);
    http = TestBed.inject(HttpTestingController);
    el = fixture.nativeElement as HTMLElement;
    http.expectOne('/accounts/lookups').flush(LOOKUPS);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it('offers the account types and currencies returned by the lookup service', () => {
    const options = (id: string) =>
      Array.from(el.querySelectorAll<HTMLOptionElement>(`#${id} option`)).map((o) => o.value);

    expect(options('accountType')).toEqual(['SAVING', 'CURRENT']);
    expect(options('currency')).toEqual(['THB', 'USD']);
  });

  it('keeps submit disabled until a customer is selected', () => {
    const button = el.querySelector<HTMLButtonElement>('button[type="submit"]');
    expect(button?.disabled).toBe(true);
  });

  function typeInSearch(text: string): void {
    const input = el.querySelector<HTMLInputElement>('#customer-search') as HTMLInputElement;
    input.value = text;
    input.dispatchEvent(new Event('input'));
  }

  function findAndSelectAda(): void {
    typeInSearch('ada');
    vi.advanceTimersByTime(300);
    fixture.detectChanges();
    http
      .expectOne((r) => r.url === '/customers/search' && r.params.get('query') === 'ada')
      .flush(PAGE);
    fixture.detectChanges();
    el.querySelector<HTMLButtonElement>('.account-create__result')?.click();
    fixture.detectChanges();
  }

  function submitForm(): void {
    el.querySelector('form')?.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  it('shows matching customers after a debounced search', () => {
    typeInSearch('ada');
    vi.advanceTimersByTime(300);
    fixture.detectChanges();

    http
      .expectOne((r) => r.url === '/customers/search' && r.params.get('query') === 'ada')
      .flush(PAGE);
    fixture.detectChanges();

    expect(el.querySelector('.account-create__result')?.textContent).toContain('Ada Lovelace');
  });

  it('does not search for a single character', () => {
    typeInSearch('a');
    vi.advanceTimersByTime(300);
    fixture.detectChanges();

    expect(el.querySelector('.account-create__results')).toBeNull();
    expect(el.textContent).not.toContain('No customers match');
  });

  it('shows an empty-state message when nothing matches', () => {
    typeInSearch('zzz');
    vi.advanceTimersByTime(300);
    fixture.detectChanges();
    http
      .expectOne((r) => r.url === '/customers/search')
      .flush({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 });
    fixture.detectChanges();

    expect(el.textContent).toContain('No customers match that search.');
  });

  it('asks for a customer before submitting', () => {
    submitForm();

    expect(el.querySelector('.alert')?.textContent).toContain('Select a customer');
    http.expectNone('/accounts/createAccount');
  });

  it('creates the account for the selected customer and shows its id', () => {
    findAndSelectAda();
    submitForm();

    http.expectOne('/api/v1/auth/csrf').flush(null, { status: 204, statusText: 'No Content' });
    const req = http.expectOne('/accounts/createAccount');
    expect(req.request.body).toEqual({
      customerId: CUSTOMER.customerId,
      balance: 0,
      currency: 'THB',
      accountType: 'SAVING',
    });
    req.flush(
      {
        accountId: 'a1',
        customerId: CUSTOMER.customerId,
        balance: 0,
        currency: 'THB',
        accountType: 'SAVING',
      },
      { status: 201, statusText: 'Created' },
    );
    fixture.detectChanges();

    expect(el.querySelector('[role=status]')?.textContent).toContain('a1');
    expect(el.querySelector('.account-create__selected')).toBeNull();
  });

  it('shows the service message when the customer is unknown', () => {
    findAndSelectAda();
    submitForm();

    http.expectOne('/api/v1/auth/csrf').flush(null, { status: 204, statusText: 'No Content' });
    http
      .expectOne('/accounts/createAccount')
      .flush(
        { status: 409, error: 'Conflict', message: 'Customer ID does not exist' },
        { status: 409, statusText: 'Conflict' },
      );
    fixture.detectChanges();

    expect(el.querySelector('.alert')?.textContent).toContain('Customer ID does not exist');
    expect(el.querySelector('.account-create__selected')).not.toBeNull();
  });
});

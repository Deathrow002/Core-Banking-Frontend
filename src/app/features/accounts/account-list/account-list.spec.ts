import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AccountPage } from '../../../core/accounts/account.models';
import { AuthService } from '../../../core/auth/auth.service';
import { AccountList } from './account-list';

const PAGE: AccountPage = {
  content: [
    { accountId: 'a1', customerId: 'c1', balance: 1500.5, currency: 'USD', accountType: 'Savings' },
  ],
  totalElements: 1,
  totalPages: 1,
  number: 0,
  size: 10,
};

function buttonWithText(el: HTMLElement, text: string): HTMLButtonElement {
  const match = Array.from(el.querySelectorAll<HTMLButtonElement>('button')).find(
    (button) => button.textContent?.trim() === text,
  );
  if (!match) {
    throw new Error(`No button with text "${text}"`);
  }
  return match;
}

describe('AccountList', () => {
  let http: HttpTestingController;
  let permissions: string[];

  beforeEach(async () => {
    permissions = ['PERM_ADD', 'PERM_EDIT', 'PERM_DELETE'];
    await TestBed.configureTestingModule({
      imports: [AccountList],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { hasPermission: (p: string) => permissions.includes(p) } },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function render() {
    const fixture = TestBed.createComponent(AccountList);
    fixture.detectChanges();
    http.expectOne((r) => r.url === '/accounts/search').flush(PAGE);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  it('lists accounts with Add and Edit actions', () => {
    const { el } = render();
    expect(el.textContent).toContain('1,500.50 USD');
    expect(el.querySelector('a[href="/accounts/new"]')).not.toBeNull();
    expect(el.querySelector('a[href="/accounts/a1/edit"]')).not.toBeNull();
  });

  it('deletes after confirmation', () => {
    const { fixture, el } = render();
    buttonWithText(el, 'Delete').click();
    fixture.detectChanges();
    buttonWithText(el, 'Confirm delete').click();

    http.expectOne('/api/v1/auth/csrf').flush(null);
    const del = http.expectOne((r) => r.method === 'DELETE' && r.url === '/accounts/deleteAccount');
    expect(del.request.params.get('accNo')).toBe('a1');
    del.flush('Account deleted successfully.');
    http.expectOne((r) => r.url === '/accounts/search').flush({ ...PAGE, content: [], totalElements: 0 });
    fixture.detectChanges();
    expect(el.textContent).toContain('Account deleted.');
  });

  it('opens an account inquiry with the owning customer', () => {
    const { fixture, el } = render();
    buttonWithText(el, 'a1').click();
    fixture.detectChanges();
    http.expectOne((r) => r.url === '/accounts/getAccount' && r.params.get('accNo') === 'a1').flush(PAGE.content[0]);
    http
      .expectOne((r) => r.url === '/customers' && r.params.get('customerId') === 'c1')
      .flush({ customerId: 'c1', firstName: 'Ada', lastName: 'Lovelace', email: 'ada@bank.com', status: 'Active' });
    fixture.detectChanges();
    const panel = el.querySelector('[aria-label="Account inquiry"]');
    expect(panel?.textContent).toContain('Savings');
    expect(panel?.textContent).toContain('Ada Lovelace');
  });

  it('hides actions without permissions', () => {
    permissions = [];
    const { el } = render();
    expect(el.querySelector('a[href="/accounts/new"]')).toBeNull();
    expect(el.textContent).not.toContain('Delete');
  });
});

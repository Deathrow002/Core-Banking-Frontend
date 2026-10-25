import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { CustomerPage } from '../../../core/customers/customer.models';
import { CustomerList } from './customer-list';

const PAGE: CustomerPage = {
  content: [
    {
      customerId: 'c1',
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@bank.com',
      nationalId: '123',
      phoneNumber: '555',
      status: 'Active',
    },
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

describe('CustomerList', () => {
  let http: HttpTestingController;
  let permissions: string[];

  beforeEach(async () => {
    permissions = ['PERM_ADD', 'PERM_EDIT', 'PERM_DELETE'];
    await TestBed.configureTestingModule({
      imports: [CustomerList],
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
    const fixture = TestBed.createComponent(CustomerList);
    fixture.detectChanges();
    http.expectOne((r) => r.url === '/customers/search').flush(PAGE);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  it('lists customers with an Add action and no row-level Edit', () => {
    const { el } = render();
    expect(el.textContent).toContain('Ada Lovelace');
    expect(el.querySelector('a[href="/customers/new"]')).not.toBeNull();
    expect(el.querySelector('tbody a.link')).toBeNull();
  });

  it('edits a customer from the inquiry panel', () => {
    const { fixture, el } = render();
    buttonWithText(el, 'Ada Lovelace').click();
    fixture.detectChanges();
    http.expectOne((r) => r.method === 'GET' && r.url === '/customers').flush({
      ...PAGE.content[0],
      dateOfBirth: '1990-01-01',
    });
    fixture.detectChanges();

    buttonWithText(el, 'Edit').click();
    fixture.detectChanges();
    const phone = el.querySelector<HTMLInputElement>('#edit-phone')!;
    expect(phone.value).toBe('555');
    phone.value = '999';
    phone.dispatchEvent(new Event('input'));
    el.querySelector('.inquiry form')!.dispatchEvent(new Event('submit'));

    http.expectOne('/api/v1/auth/csrf').flush(null);
    const put = http.expectOne((r) => r.method === 'PUT' && r.url === '/customers');
    expect(put.request.params.get('customerId')).toBe('c1');
    expect(put.request.body.phoneNumber).toBe('999');
    put.flush({ ...PAGE.content[0], phoneNumber: '999' });
    http.expectOne((r) => r.url === '/customers/search').flush(PAGE);
    fixture.detectChanges();
    expect(el.textContent).toContain('Customer updated.');
    expect(el.querySelector('#edit-phone')).toBeNull();
  });

  it('searches with the entered query', () => {
    const { fixture, el } = render();
    const input = el.querySelector<HTMLInputElement>('#customer-query')!;
    input.value = 'ada';
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    http.expectOne((r) => r.url === '/customers/search' && r.params.get('query') === 'ada').flush(PAGE);
  });

  it('deletes after confirmation', () => {
    const { fixture, el } = render();
    buttonWithText(el, 'Delete').click();
    fixture.detectChanges();
    buttonWithText(el, 'Confirm delete').click();

    http.expectOne('/api/v1/auth/csrf').flush(null);
    const del = http.expectOne((r) => r.method === 'DELETE' && r.url === '/customers');
    expect(del.request.params.get('customerId')).toBe('c1');
    del.flush(null);
    http.expectOne((r) => r.url === '/customers/search').flush({ ...PAGE, content: [], totalElements: 0 });
    fixture.detectChanges();
    expect(el.textContent).toContain('Deleted Ada Lovelace.');
  });

  it('opens a customer inquiry when the name is clicked', () => {
    const { fixture, el } = render();
    buttonWithText(el, 'Ada Lovelace').click();
    fixture.detectChanges();
    http
      .expectOne((r) => r.method === 'GET' && r.url === '/customers' && r.params.get('customerId') === 'c1')
      .flush({
        ...PAGE.content[0],
        dateOfBirth: '1990-01-01',
        addresses: [
          { address: '1 Main', subDistrict: 's', district: 'd', city: 'Bangkok', country: 'TH', zipCode: '10110', addressType: 'Present' },
        ],
      });
    fixture.detectChanges();
    const panel = el.querySelector('[aria-label="Customer inquiry"]');
    expect(panel?.textContent).toContain('1990-01-01');
    expect(panel?.textContent).toContain('Bangkok');
  });

  it('opens the inquiry when a row cell is clicked', () => {
    const { fixture, el } = render();
    el.querySelector<HTMLElement>('tbody td:nth-child(3)')!.click();
    fixture.detectChanges();
    http.expectOne((r) => r.url === '/customers').flush(PAGE.content[0]);
    fixture.detectChanges();
    expect(el.querySelector('[aria-label="Customer inquiry"]')).not.toBeNull();
  });

  it('hides actions without permissions', () => {
    permissions = [];
    const { el } = render();
    expect(el.querySelector('a[href="/customers/new"]')).toBeNull();
    expect(el.textContent).not.toContain('Delete');
  });
});

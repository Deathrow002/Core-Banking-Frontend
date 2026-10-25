import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CustomerCreate } from './customer-create';

describe('CustomerCreate', () => {
  let fixture: ComponentFixture<CustomerCreate>;
  let http: HttpTestingController;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomerCreate],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(CustomerCreate);
    http = TestBed.inject(HttpTestingController);
    el = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  function setField(selector: string, value: string): void {
    const field = el.querySelector(selector) as HTMLInputElement | HTMLSelectElement;
    field.value = value;
    field.dispatchEvent(new Event(field instanceof HTMLSelectElement ? 'change' : 'input'));
  }

  function fillValidForm(): void {
    setField('#firstName', 'Ada');
    setField('#lastName', 'Lovelace');
    setField('#email', 'ada@bank.com');
    setField('#phoneNumber', '0812345678');
    setField('#nationalId', '1234567890123');
    setField('#dateOfBirth', '1990-05-14');
    setField('#address-0-address', '1 Sukhumvit Road');
    setField('#address-0-subDistrict', 'Khlong Toei');
    setField('#address-0-district', 'Khlong Toei');
    setField('#address-0-city', 'Bangkok');
    setField('#address-0-country', 'Thailand');
    setField('#address-0-zipCode', '10110');
    fixture.detectChanges();
  }

  function submitForm(): void {
    el.querySelector('form')?.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  function addressBlocks(): NodeListOf<HTMLElement> {
    return el.querySelectorAll<HTMLElement>('.customer-create__address');
  }

  it('asks for the required fields before submitting', () => {
    submitForm();

    expect(el.querySelector('.alert')?.textContent).toContain(
      'Please complete the highlighted fields.',
    );
    expect(el.querySelector('#firstName-error')?.textContent).toContain('required');
    http.expectNone('/customers');
  });

  it('rejects a malformed email address', () => {
    fillValidForm();
    setField('#email', 'not-an-email');
    submitForm();

    expect(el.querySelector('#email-error')?.textContent).toContain('valid email');
    http.expectNone('/customers');
  });

  it('creates the customer with an address and shows the new id', () => {
    fillValidForm();
    submitForm();

    http.expectOne('/api/v1/auth/csrf').flush(null, { status: 204, statusText: 'No Content' });
    const req = http.expectOne('/customers');
    expect(req.request.body).toEqual({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@bank.com',
      phoneNumber: '0812345678',
      nationalId: '1234567890123',
      dateOfBirth: '1990-05-14',
      status: 'Active',
      addresses: [
        {
          address: '1 Sukhumvit Road',
          subDistrict: 'Khlong Toei',
          district: 'Khlong Toei',
          city: 'Bangkok',
          country: 'Thailand',
          zipCode: '10110',
          addressType: 'Present',
        },
      ],
    });
    req.flush(
      { customerId: 'c1', firstName: 'Ada', lastName: 'Lovelace' },
      { status: 201, statusText: 'Created' },
    );
    fixture.detectChanges();

    expect(el.querySelector('[role=status]')?.textContent).toContain('c1');
    expect(el.querySelector<HTMLInputElement>('#firstName')?.value).toBe('');
    expect(addressBlocks().length).toBe(1);
  });

  it('shows the duplicate national ID message from the service', () => {
    fillValidForm();
    submitForm();

    http.expectOne('/api/v1/auth/csrf').flush(null, { status: 204, statusText: 'No Content' });
    http
      .expectOne('/customers')
      .flush(
        { status: 409, error: 'Conflict', message: 'National ID already exists' },
        { status: 409, statusText: 'Conflict' },
      );
    fixture.detectChanges();

    expect(el.querySelector('.alert')?.textContent).toContain('National ID already exists');
    expect(el.querySelector<HTMLInputElement>('#firstName')?.value).toBe('Ada');
  });

  it('adds and removes address blocks, keeping at least one', () => {
    expect(addressBlocks().length).toBe(1);
    expect(el.querySelector('.customer-create__address .button--secondary')).toBeNull();

    el.querySelector<HTMLButtonElement>('.customer-create__add')?.click();
    fixture.detectChanges();
    expect(addressBlocks().length).toBe(2);

    el.querySelector<HTMLButtonElement>('.customer-create__address .button--secondary')?.click();
    fixture.detectChanges();
    expect(addressBlocks().length).toBe(1);
  });
});

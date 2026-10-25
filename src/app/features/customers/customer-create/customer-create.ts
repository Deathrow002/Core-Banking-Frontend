import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import {
  ADDRESS_TYPES,
  AddressType,
  CUSTOMER_STATUSES,
  CreatedCustomer,
  CustomerStatus,
} from '../../../core/customers/customer.models';
import {
  CustomerService,
  toCustomerCreateErrorMessage,
} from '../../../core/customers/customer.service';
import { Icon } from '../../../shared/icon/icon';

const DEFAULT_STATUS: CustomerStatus = 'Active';
const DEFAULT_ADDRESS_TYPE: AddressType = 'Present';

const ADDRESS_TEXT_FIELDS = [
  { name: 'address', label: 'Address' },
  { name: 'subDistrict', label: 'Sub-district' },
  { name: 'district', label: 'District' },
  { name: 'city', label: 'City' },
  { name: 'country', label: 'Country' },
  { name: 'zipCode', label: 'Zip code' },
] as const;

/** The backend rejects an empty addresses list and null address fields, so every address field is required. */
function createAddressGroup(fb: NonNullableFormBuilder) {
  return fb.group({
    address: ['', Validators.required],
    subDistrict: ['', Validators.required],
    district: ['', Validators.required],
    city: ['', Validators.required],
    country: ['', Validators.required],
    zipCode: ['', Validators.required],
    addressType: [DEFAULT_ADDRESS_TYPE, Validators.required],
  });
}

@Component({
  selector: 'app-customer-create',
  imports: [ReactiveFormsModule, RouterLink, Icon],
  templateUrl: './customer-create.html',
  styleUrl: './customer-create.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerCreate {
  private readonly customers = inject(CustomerService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly statuses = CUSTOMER_STATUSES;
  protected readonly addressTypes = ADDRESS_TYPES;
  protected readonly addressTextFields = ADDRESS_TEXT_FIELDS;

  protected readonly form = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phoneNumber: ['', Validators.required],
    nationalId: ['', Validators.required],
    dateOfBirth: ['', Validators.required],
    status: [DEFAULT_STATUS, Validators.required],
    addresses: this.fb.array([createAddressGroup(this.fb)]),
  });
  protected readonly addresses: FormArray<ReturnType<typeof createAddressGroup>> =
    this.form.controls.addresses;

  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly created = signal<CreatedCustomer | null>(null);

  protected errorFor(control: AbstractControl): string | null {
    if (!control.touched || control.valid) {
      return null;
    }
    return control.hasError('email') ? 'Enter a valid email address.' : 'This field is required.';
  }

  protected addAddress(): void {
    this.addresses.push(createAddressGroup(this.fb));
  }

  protected removeAddress(index: number): void {
    if (this.addresses.length > 1) {
      this.addresses.removeAt(index);
    }
  }

  protected submit(): void {
    if (this.submitting()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage.set('Please complete the highlighted fields.');
      return;
    }

    const { addresses, ...customer } = this.form.getRawValue();
    this.errorMessage.set(null);
    this.created.set(null);
    this.submitting.set(true);

    this.customers
      .create({ ...customer, addresses })
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (createdCustomer) => {
          this.created.set(createdCustomer);
          this.resetForm();
        },
        error: (error: unknown) =>
          this.errorMessage.set(
            toCustomerCreateErrorMessage(error, 'Could not create the customer. Please try again.'),
          ),
      });
  }

  private resetForm(): void {
    this.form.reset();
    this.addresses.clear();
    this.addresses.push(createAddressGroup(this.fb));
  }
}

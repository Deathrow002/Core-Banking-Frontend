import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { PERMISSIONS } from '../../../core/auth/auth.models';
import { AuthService } from '../../../core/auth/auth.service';
import {
  CUSTOMER_STATUSES,
  CustomerPage,
  CustomerStatus,
  CustomerSummary,
} from '../../../core/customers/customer.models';
import {
  CustomerService,
  toCustomerCreateErrorMessage,
  toCustomerErrorMessage,
} from '../../../core/customers/customer.service';
import { Icon } from '../../../shared/icon/icon';

const PAGE_SIZE = 10;

@Component({
  selector: 'app-customer-list',
  imports: [ReactiveFormsModule, RouterLink, Icon],
  templateUrl: './customer-list.html',
  styleUrl: './customer-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerList {
  private readonly customers = inject(CustomerService);
  private readonly auth = inject(AuthService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** The backend enforces these permissions; hiding the actions only avoids offering calls that will fail. */
  protected readonly canAdd = this.auth.hasPermission(PERMISSIONS.add);
  protected readonly canEdit = this.auth.hasPermission(PERMISSIONS.edit);
  protected readonly canDelete = this.auth.hasPermission(PERMISSIONS.delete);

  protected readonly query = signal('');
  protected readonly pageIndex = signal(0);
  protected readonly data = signal<CustomerPage | null>(null);
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly pendingDeleteId = signal<string | null>(null);
  protected readonly deletingId = signal<string | null>(null);
  protected readonly inquiry = signal<CustomerSummary | null>(null);
  protected readonly inquiring = signal(false);
  protected readonly inquiryError = signal<string | null>(null);
  protected readonly editing = signal(false);
  protected readonly saving = signal(false);
  protected readonly statuses = CUSTOMER_STATUSES;

  protected readonly form = inject(NonNullableFormBuilder).group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phoneNumber: ['', Validators.required],
    nationalId: ['', Validators.required],
    dateOfBirth: ['', Validators.required],
    status: ['Active' as CustomerStatus, Validators.required],
  });

  protected readonly rows = computed(() => this.data()?.content ?? []);
  protected readonly total = computed(() => this.data()?.totalElements ?? 0);
  protected readonly totalPages = computed(() => Math.max(1, this.data()?.totalPages ?? 1));
  protected readonly canPrevious = computed(() => this.pageIndex() > 0);
  protected readonly canNext = computed(() => this.pageIndex() + 1 < this.totalPages());

  constructor() {
    this.load();
  }

  protected onSearch(event: Event, value: string): void {
    event.preventDefault();
    this.query.set(value.trim());
    this.pageIndex.set(0);
    this.load();
  }

  protected goTo(index: number): void {
    this.pageIndex.set(index);
    this.load();
  }

  /** Row clicks open the inquiry; clicks on the row's own links and buttons keep their own behaviour. */
  protected onRowClick(event: Event, customer: CustomerSummary): void {
    if (!(event.target as HTMLElement).closest('a, button')) {
      this.openInquiry(customer);
    }
  }

  /** Loads the customer's full record (including addresses) into the inquiry panel. */
  protected openInquiry(customer: CustomerSummary): void {
    this.scrollToInquiry();
    this.inquiry.set(customer);
    this.editing.set(false);
    this.inquiryError.set(null);
    this.inquiring.set(true);
    this.customers
      .get(customer.customerId)
      .pipe(finalize(() => this.inquiring.set(false)))
      .subscribe({
        next: (details) => this.inquiry.set(details),
        error: (error: unknown) =>
          this.inquiryError.set(
            toCustomerErrorMessage(error, 'Could not retrieve the customer. Please try again.'),
          ),
      });
  }

  protected closeInquiry(): void {
    this.inquiry.set(null);
    this.inquiryError.set(null);
    this.editing.set(false);
  }

  /** Switches the inquiry panel into edit mode, prefilled from the inquiry record. */
  protected startEdit(): void {
    const customer = this.inquiry();
    if (!customer) {
      return;
    }
    this.form.reset({
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phoneNumber: customer.phoneNumber ?? '',
      nationalId: customer.nationalId ?? '',
      dateOfBirth: (customer.dateOfBirth ?? '').slice(0, 10),
      status: customer.status ?? 'Active',
    });
    this.inquiryError.set(null);
    this.editing.set(true);
  }

  protected cancelEdit(): void {
    this.editing.set(false);
    this.inquiryError.set(null);
  }

  protected saveEdit(): void {
    const customer = this.inquiry();
    if (!customer || this.saving()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.inquiryError.set(null);
    this.customers
      .update(customer.customerId, this.form.getRawValue())
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (updated) => {
          this.inquiry.set({ ...customer, ...updated, addresses: customer.addresses });
          this.editing.set(false);
          this.successMessage.set('Customer updated.');
          this.load();
        },
        error: (error: unknown) =>
          this.inquiryError.set(
            toCustomerCreateErrorMessage(error, 'Could not save the customer. Please try again.'),
          ),
      });
  }

  private scrollToInquiry(): void {
    setTimeout(() =>
      this.host.nativeElement.querySelector('.inquiry')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }),
    );
  }

  protected requestDelete(customer: CustomerSummary): void {
    this.successMessage.set(null);
    this.pendingDeleteId.set(customer.customerId);
  }

  protected cancelDelete(): void {
    this.pendingDeleteId.set(null);
  }

  protected confirmDelete(customer: CustomerSummary): void {
    this.deletingId.set(customer.customerId);
    this.errorMessage.set(null);

    this.customers
      .delete(customer.customerId)
      .pipe(
        finalize(() => {
          this.deletingId.set(null);
          this.pendingDeleteId.set(null);
        }),
      )
      .subscribe({
        next: () => {
          this.successMessage.set(`Deleted ${customer.firstName} ${customer.lastName}.`);
          if (this.rows().length === 1 && this.pageIndex() > 0) {
            this.pageIndex.update((index) => index - 1);
          }
          this.load();
        },
        error: (error: unknown) =>
          this.errorMessage.set(
            toCustomerErrorMessage(error, 'Could not delete the customer. Please try again.'),
          ),
      });
  }

  private load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.customers
      .search(this.query(), this.pageIndex(), PAGE_SIZE)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (page) => this.data.set(page),
        error: (error: unknown) =>
          this.errorMessage.set(
            toCustomerErrorMessage(error, 'Could not load customers. Please try again.'),
          ),
      });
  }
}

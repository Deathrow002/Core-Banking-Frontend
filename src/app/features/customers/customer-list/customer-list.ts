import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { PERMISSIONS } from '../../../core/auth/auth.models';
import { AuthService } from '../../../core/auth/auth.service';
import { CustomerPage, CustomerSummary } from '../../../core/customers/customer.models';
import { CustomerService, toCustomerErrorMessage } from '../../../core/customers/customer.service';
import { Icon } from '../../../shared/icon/icon';

const PAGE_SIZE = 10;

@Component({
  selector: 'app-customer-list',
  imports: [RouterLink, Icon],
  templateUrl: './customer-list.html',
  styleUrl: './customer-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerList {
  private readonly customers = inject(CustomerService);
  private readonly auth = inject(AuthService);

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

  /** Loads the customer's full record (including addresses) into the inquiry panel. */
  protected openInquiry(customer: CustomerSummary): void {
    this.inquiry.set(customer);
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

import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import { Account, AccountPage } from '../../../core/accounts/account.models';
import { AccountService, toAccountErrorMessage } from '../../../core/accounts/account.service';
import { PERMISSIONS } from '../../../core/auth/auth.models';
import { AuthService } from '../../../core/auth/auth.service';
import { CustomerSummary } from '../../../core/customers/customer.models';
import { CustomerService } from '../../../core/customers/customer.service';
import { Icon } from '../../../shared/icon/icon';

const PAGE_SIZE = 10;

@Component({
  selector: 'app-account-list',
  imports: [DecimalPipe, RouterLink, Icon],
  templateUrl: './account-list.html',
  styleUrl: './account-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountList {
  private readonly accounts = inject(AccountService);
  private readonly customers = inject(CustomerService);
  private readonly auth = inject(AuthService);

  /** The backend enforces these permissions; hiding the actions only avoids offering calls that will fail. */
  protected readonly canAdd = this.auth.hasPermission(PERMISSIONS.add);
  protected readonly canEdit = this.auth.hasPermission(PERMISSIONS.edit);
  protected readonly canDelete = this.auth.hasPermission(PERMISSIONS.delete);

  protected readonly query = signal('');
  protected readonly pageIndex = signal(0);
  protected readonly data = signal<AccountPage | null>(null);
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly pendingDeleteId = signal<string | null>(null);
  protected readonly deletingId = signal<string | null>(null);
  protected readonly inquiry = signal<Account | null>(null);
  protected readonly inquiryCustomer = signal<CustomerSummary | null>(null);
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

  /** Loads the account's current record together with its owning customer. */
  protected openInquiry(account: Account): void {
    this.inquiry.set(account);
    this.inquiryCustomer.set(null);
    this.inquiryError.set(null);
    this.inquiring.set(true);
    forkJoin({
      account: this.accounts.get(account.accountId),
      customer: this.customers.get(account.customerId).pipe(catchError(() => of(null))),
    })
      .pipe(finalize(() => this.inquiring.set(false)))
      .subscribe({
        next: ({ account: details, customer }) => {
          this.inquiry.set(details);
          this.inquiryCustomer.set(customer);
        },
        error: (error: unknown) =>
          this.inquiryError.set(
            toAccountErrorMessage(error, 'Could not retrieve the account. Please try again.'),
          ),
      });
  }

  protected closeInquiry(): void {
    this.inquiry.set(null);
    this.inquiryCustomer.set(null);
    this.inquiryError.set(null);
  }

  protected requestDelete(account: Account): void {
    this.successMessage.set(null);
    this.pendingDeleteId.set(account.accountId);
  }

  protected cancelDelete(): void {
    this.pendingDeleteId.set(null);
  }

  protected confirmDelete(account: Account): void {
    this.deletingId.set(account.accountId);
    this.errorMessage.set(null);

    this.accounts
      .delete(account.accountId)
      .pipe(
        finalize(() => {
          this.deletingId.set(null);
          this.pendingDeleteId.set(null);
        }),
      )
      .subscribe({
        next: () => {
          this.successMessage.set('Account deleted.');
          if (this.rows().length === 1 && this.pageIndex() > 0) {
            this.pageIndex.update((index) => index - 1);
          }
          this.load();
        },
        error: (error: unknown) =>
          this.errorMessage.set(
            toAccountErrorMessage(error, 'Could not delete the account. Please try again.'),
          ),
      });
  }

  private load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.accounts
      .search(this.query(), this.pageIndex(), PAGE_SIZE)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (page) => this.data.set(page),
        error: (error: unknown) =>
          this.errorMessage.set(
            toAccountErrorMessage(error, 'Could not load accounts. Please try again.'),
          ),
      });
  }
}

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  map,
  Observable,
  of,
  switchMap,
} from 'rxjs';
import { Account } from '../../../core/accounts/account.models';
import { AccountService, toAccountErrorMessage } from '../../../core/accounts/account.service';
import { CustomerSummary } from '../../../core/customers/customer.models';
import { CustomerService, toCustomerErrorMessage } from '../../../core/customers/customer.service';
import { Icon } from '../../../shared/icon/icon';

const MIN_QUERY_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 300;
const DEFAULT_ACCOUNT_TYPE = 'SAVING';
const DEFAULT_CURRENCY = 'THB';

@Component({
  selector: 'app-account-create',
  imports: [ReactiveFormsModule, RouterLink, Icon],
  templateUrl: './account-create.html',
  styleUrl: './account-create.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountCreate {
  private readonly accounts = inject(AccountService);
  private readonly customers = inject(CustomerService);

  protected readonly accountTypes = signal<string[]>([]);
  protected readonly currencyTypes = signal<string[]>([]);
  protected readonly lookupsLoaded = signal(false);
  protected readonly lookupError = signal<string | null>(null);
  protected readonly minQueryLength = MIN_QUERY_LENGTH;

  protected readonly search = new FormControl('', { nonNullable: true });
  protected readonly searching = signal(false);
  protected readonly searchError = signal<string | null>(null);
  /** null means no search has run yet or the query is too short; an empty array means no matches. */
  protected readonly results = signal<CustomerSummary[] | null>(null);
  protected readonly selected = signal<CustomerSummary | null>(null);
  protected readonly inquiry = signal<CustomerSummary | null>(null);
  protected readonly inquiring = signal(false);
  protected readonly inquiryError = signal<string | null>(null);
  /** A customer whose inquiry shows a non-Active status cannot receive a new account. */
  protected readonly inquiryBlocked = computed(() => {
    const status = this.inquiry()?.status;
    return !!status && status !== 'Active';
  });

  protected readonly form = inject(NonNullableFormBuilder).group({
    accountType: [DEFAULT_ACCOUNT_TYPE, [Validators.required]],
    currency: [DEFAULT_CURRENCY, [Validators.required]],
    balance: [0, [Validators.required, Validators.min(0)]],
  });

  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly created = signal<Account | null>(null);

  constructor() {
    this.accounts
      .lookups()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (lookups) => {
          this.accountTypes.set(lookups.accountTypes);
          this.currencyTypes.set(lookups.currencyTypes);
          this.form.patchValue(this.defaultValues());
          this.lookupsLoaded.set(true);
        },
        error: (error: unknown) =>
          this.lookupError.set(
            toAccountErrorMessage(
              error,
              'Could not load account types and currencies. Please try again.',
            ),
          ),
      });

    this.search.valueChanges
      .pipe(
        map((query) => query.trim()),
        debounceTime(SEARCH_DEBOUNCE_MS),
        distinctUntilChanged(),
        switchMap((query) => this.findCustomers(query)),
        takeUntilDestroyed(),
      )
      .subscribe((customers) => this.results.set(customers));
  }

  protected select(customer: CustomerSummary): void {
    this.selected.set(customer);
    this.inquiry.set(null);
    this.inquiryError.set(null);
    this.errorMessage.set(null);
  }

  protected clearSelection(): void {
    this.selected.set(null);
    this.inquiry.set(null);
    this.inquiryError.set(null);
  }

  /** Fetches the customer's current record so staff can validate it before opening an account. */
  protected inquire(): void {
    const customer = this.selected();
    if (!customer || this.inquiring()) {
      return;
    }
    this.inquiring.set(true);
    this.inquiryError.set(null);
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

  protected submit(): void {
    if (this.submitting()) {
      return;
    }
    const customer = this.selected();
    if (!customer) {
      this.errorMessage.set('Select a customer before creating an account.');
      return;
    }
    if (this.inquiryBlocked()) {
      this.errorMessage.set('This customer is not Active, so an account cannot be opened.');
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    this.errorMessage.set(null);
    this.created.set(null);
    this.submitting.set(true);

    this.accounts
      .create({
        customerId: customer.customerId,
        balance: raw.balance,
        currency: raw.currency,
        accountType: raw.accountType,
      })
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (account) => {
          this.created.set(account);
          this.resetForm();
        },
        error: (error: unknown) =>
          this.errorMessage.set(
            toAccountErrorMessage(error, 'Could not create the account. Please try again.'),
          ),
      });
  }

  private findCustomers(query: string): Observable<CustomerSummary[] | null> {
    this.searchError.set(null);
    if (query.length < MIN_QUERY_LENGTH) {
      this.searching.set(false);
      return of(null);
    }

    this.searching.set(true);
    return this.customers.search(query).pipe(
      map((page) => page.content),
      catchError((error: unknown) => {
        this.searchError.set(
          toCustomerErrorMessage(error, 'Could not search customers. Please try again.'),
        );
        return of(null);
      }),
      finalize(() => this.searching.set(false)),
    );
  }

  private resetForm(): void {
    this.form.reset(this.defaultValues());
    this.selected.set(null);
    this.inquiry.set(null);
    this.inquiryError.set(null);
    this.searchError.set(null);
    this.search.setValue('');
  }

  /** Prefers the usual defaults, falling back to the first code the lookup tables provide. */
  private defaultValues(): { accountType: string; currency: string } {
    return {
      accountType: pickDefault(this.accountTypes(), DEFAULT_ACCOUNT_TYPE),
      currency: pickDefault(this.currencyTypes(), DEFAULT_CURRENCY),
    };
  }
}

function pickDefault(options: string[], preferred: string): string {
  return options.includes(preferred) ? preferred : (options[0] ?? preferred);
}

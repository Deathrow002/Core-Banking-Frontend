import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AccountService, toAccountErrorMessage } from '../../../core/accounts/account.service';
import { Icon } from '../../../shared/icon/icon';

@Component({
  selector: 'app-account-edit',
  imports: [ReactiveFormsModule, RouterLink, Icon],
  templateUrl: './account-edit.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountEdit {
  private readonly accounts = inject(AccountService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(NonNullableFormBuilder);

  private readonly id = this.route.snapshot.paramMap.get('id') ?? '';

  protected readonly customerId = signal('');
  protected readonly accountTypes = signal<string[]>([]);
  protected readonly currencyTypes = signal<string[]>([]);
  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = this.fb.group({
    accountType: ['', Validators.required],
    currency: ['', Validators.required],
    balance: [0, [Validators.required, Validators.min(0)]],
  });

  constructor() {
    this.accounts.lookups().subscribe({
      next: (lookups) => {
        this.accountTypes.set(lookups.accountTypes);
        this.currencyTypes.set(lookups.currencyTypes);
      },
      error: () => this.errorMessage.set('Could not load account options. Please try again.'),
    });

    this.accounts
      .get(this.id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (account) => {
          this.customerId.set(account.customerId);
          this.form.patchValue({
            accountType: account.accountType,
            currency: account.currency,
            balance: account.balance,
          });
        },
        error: () => this.errorMessage.set('Could not load the account. Please try again.'),
      });
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.errorMessage.set(null);

    this.accounts
      .update({ accountId: this.id, ...this.form.getRawValue() })
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => void this.router.navigate(['/accounts']),
        error: (error: unknown) =>
          this.errorMessage.set(
            toAccountErrorMessage(error, 'Could not save the account. Please try again.'),
          ),
      });
  }
}

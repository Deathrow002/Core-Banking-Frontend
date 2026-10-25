import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { CUSTOMER_STATUSES, CustomerStatus } from '../../../core/customers/customer.models';
import {
  CustomerService,
  toCustomerCreateErrorMessage,
} from '../../../core/customers/customer.service';
import { Icon } from '../../../shared/icon/icon';

@Component({
  selector: 'app-customer-edit',
  imports: [ReactiveFormsModule, RouterLink, Icon],
  templateUrl: './customer-edit.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerEdit {
  private readonly customers = inject(CustomerService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(NonNullableFormBuilder);

  private readonly id = this.route.snapshot.paramMap.get('id') ?? '';

  protected readonly statuses = CUSTOMER_STATUSES;
  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phoneNumber: ['', Validators.required],
    nationalId: ['', Validators.required],
    dateOfBirth: ['', Validators.required],
    status: ['Active' as CustomerStatus, Validators.required],
  });

  constructor() {
    this.load();
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.errorMessage.set(null);

    this.customers
      .update(this.id, this.form.getRawValue())
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => void this.router.navigate(['/customers']),
        error: (error: unknown) =>
          this.errorMessage.set(
            toCustomerCreateErrorMessage(error, 'Could not save the customer. Please try again.'),
          ),
      });
  }

  private load(): void {
    this.customers
      .get(this.id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (customer) =>
          this.form.patchValue({
            firstName: customer.firstName,
            lastName: customer.lastName,
            email: customer.email,
            phoneNumber: customer.phoneNumber ?? '',
            nationalId: customer.nationalId ?? '',
            dateOfBirth: (customer.dateOfBirth ?? '').slice(0, 10),
            status: customer.status ?? 'Active',
          }),
        error: () => this.errorMessage.set('Could not load the customer. Please try again.'),
      });
  }
}

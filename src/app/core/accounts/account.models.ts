/** Mirrors com.account.model.AccountType */
export const ACCOUNT_TYPES = ['SAVING', 'CURRENT', 'FIXED', 'RECURRING', 'NRI', 'LOAN'] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

/** Mirrors com.account.model.CurrencyType */
export const CURRENCY_TYPES = ['THB', 'USD', 'SGD', 'JPY', 'CNY', 'GBP', 'EUR'] as const;
export type CurrencyType = (typeof CURRENCY_TYPES)[number];

/** Mirrors com.account.model.DTO.AccountDTO as sent to POST /accounts/createAccount. */
export interface AccountCreatePayload {
  customerId: string;
  balance: number;
  currency: CurrencyType;
  accountType: AccountType;
}

/** The created account returned by the Account service. */
export interface Account {
  accountId: string;
  customerId: string;
  balance: number;
  currency: CurrencyType;
  accountType: AccountType;
}

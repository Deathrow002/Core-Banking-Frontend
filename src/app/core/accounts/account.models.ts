/** Account type and currency codes, loaded from the Account service lookup tables. */
export interface AccountLookups {
  accountTypes: string[];
  currencyTypes: string[];
}

export type AccountType = string;
export type CurrencyType = string;

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

/** Mirrors com.account.model.DTO.AccountPage. */
export interface AccountPage {
  content: Account[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

/** Body of PUT /accounts/updateAccount. */
export interface AccountUpdatePayload {
  accountId: string;
  balance: number;
  currency: CurrencyType;
  accountType: AccountType;
}

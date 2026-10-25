/** The fields the staff picker needs from a Customer; the search response carries more, which is not used. */
export interface CustomerSummary {
  customerId: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  nationalId?: string;
  dateOfBirth?: string;
  status?: CustomerStatus;
  addresses?: AddressPayload[];
}

/** Fields PUT /customers updates (addresses are not changed by an update). */
export interface CustomerUpdatePayload {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  nationalId: string;
  dateOfBirth: string;
  status: CustomerStatus;
}

/** Mirrors com.customer.model.DTO.CustomerPage. */
export interface CustomerPage {
  content: CustomerSummary[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

/** Mirrors com.customer.model.StatusType. */
export const CUSTOMER_STATUSES = ['Active', 'Inactive', 'Suspended', 'Closed'] as const;
export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];

/** Mirrors com.customer.model.AddressType. */
export const ADDRESS_TYPES = ['Cradle', 'WorkPlace', 'Present'] as const;
export type AddressType = (typeof ADDRESS_TYPES)[number];

/** Mirrors com.customer.model.Address as sent inside a customer create request. */
export interface AddressPayload {
  address: string;
  subDistrict: string;
  district: string;
  city: string;
  country: string;
  zipCode: string;
  addressType: AddressType;
}

/** Mirrors the Customer fields that POST /customers requires. dateOfBirth is yyyy-MM-dd. */
export interface CustomerCreatePayload {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  nationalId: string;
  dateOfBirth: string;
  status: CustomerStatus;
  addresses: AddressPayload[];
}

/** The created customer returned by the Customer service. */
export interface CreatedCustomer {
  customerId: string;
  firstName: string;
  lastName: string;
}

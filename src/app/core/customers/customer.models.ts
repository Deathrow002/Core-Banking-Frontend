/** The fields the staff picker needs from a Customer; the search response carries more, which is not used. */
export interface CustomerSummary {
  customerId: string;
  firstName: string;
  lastName: string;
  email: string;
}

/** Mirrors com.customer.model.DTO.CustomerPage. */
export interface CustomerPage {
  content: CustomerSummary[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

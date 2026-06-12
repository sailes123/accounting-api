export type ListTransactionsType =
  (typeof ListTransactionsType)[keyof typeof ListTransactionsType];

export const ListTransactionsType = {
  income: "income",
  expense: "expense",
  udharo: "udharo",
} as const;

export type ListTransactionsParams = {
  type?: ListTransactionsType;
  customerId?: number;
};

export interface Transaction {
  id: number;
  billNo: string;
  title: string;
  amount: number;
  type: TransactionType;
  date: string;
  /** @nullable */
  customerId?: number | null;
  /** @nullable */
  customerName?: string | null;
  /** @nullable */
  customerPhone?: string | null;
  /** @nullable */
  paymentMode?: TransactionPaymentMode;
  createdAt: string;
}

export interface TransactionInput {
  /** @minLength 1 */
  title: string;
  amount: number;
  type: TransactionInputType;
  date: string;
  /** @nullable */
  customerId?: number | null;
  /** @nullable */
  paymentMode?: TransactionInputPaymentMode;
}

export type TransactionInputPaymentMode =
  | (typeof TransactionInputPaymentMode)[keyof typeof TransactionInputPaymentMode]
  | null;

export const TransactionInputPaymentMode = {
  cash: "cash",
  mobile_banking: "mobile_banking",
  cheque: "cheque",
  wallet: "wallet",
  esewa: "esewa",
} as const;

export type TransactionInputType =
  (typeof TransactionInputType)[keyof typeof TransactionInputType];

export const TransactionInputType = {
  income: "income",
  expense: "expense",
  udharo: "udharo",
} as const;

export type TransactionPaymentMode =
  | (typeof TransactionPaymentMode)[keyof typeof TransactionPaymentMode]
  | null;

export const TransactionPaymentMode = {
  cash: "cash",
  mobile_banking: "mobile_banking",
  cheque: "cheque",
  wallet: "wallet",
  esewa: "esewa",
} as const;

export type TransactionType =
  (typeof TransactionType)[keyof typeof TransactionType];

export const TransactionType = {
  income: "income",
  expense: "expense",
  udharo: "udharo",
} as const;

export interface TransactionUpdate {
  /** @minLength 1 */
  title?: string;
  amount?: number;
  type?: TransactionUpdateType;
  date?: string;
  /** @nullable */
  customerId?: number | null;
  /** @nullable */
  paymentMode?: TransactionUpdatePaymentMode;
}

export type TransactionUpdatePaymentMode =
  | (typeof TransactionUpdatePaymentMode)[keyof typeof TransactionUpdatePaymentMode]
  | null;

export const TransactionUpdatePaymentMode = {
  cash: "cash",
  mobile_banking: "mobile_banking",
  cheque: "cheque",
  wallet: "wallet",
  esewa: "esewa",
} as const;

export type TransactionUpdateType =
  (typeof TransactionUpdateType)[keyof typeof TransactionUpdateType];

export const TransactionUpdateType = {
  income: "income",
  expense: "expense",
  udharo: "udharo",
} as const;

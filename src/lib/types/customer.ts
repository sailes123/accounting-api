export interface Customer {
    id: number;
    name: string;
    phone: string;
    address: string;
    balance: number;
    createdAt: string;
  }

  export interface CustomerInput {
    /** @minLength 1 */
    name: string;
    phone: string;
    address: string;
    balance?: number;
  }

  export interface CustomerUpdate {
    /** @minLength 1 */
    name?: string;
    phone?: string;
    address?: string;
    balance?: number;
  }
  

export interface Product {
    id: number;
    name: string;
    stock: number;
    sellingPrice: number;
    purchasePrice: number;
    createdAt: string;
  }
 
  export interface ProductInput {
    /** @minLength 1 */
    name: string;
    stock: number;
    sellingPrice: number;
    purchasePrice: number;
  }

  export interface ProductUpdate {
    /** @minLength 1 */
    name?: string;
    stock?: number;
    sellingPrice?: number;
    purchasePrice?: number;
  }

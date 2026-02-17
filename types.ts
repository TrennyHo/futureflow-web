export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE'
}

export enum PaymentMethod {
  CASH = 'CASH',
  CREDIT_CARD = 'CREDIT_CARD'
}

export type Category = string;

// ⭐ 新增：預算額度型別
export interface CategoryBudget {
  category: string;
  limit: number;
}

export interface Account {
  id: string;
  name: string;
  balance: number; // 建議直接用 balance 代表當前餘額
  initialBalance: number;
  currency?: string;
  exchangeRate?: number;
}

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  category: Category;
  note: string;
  date: string;
  paymentMethod: PaymentMethod;
  accountId?: string;
  creditCardId?: string;
}

export interface CreditCard {
  id: string;
  name: string;
  closingDay: number;
  paymentDay: number;
  color: string;
}

export interface CreditCardDebt {
  id: string;
  cardName: string;
  totalDebt: number;
  remainingAmount: number;
  installmentTotal: number;
  installmentCurrent: number;
  monthlyPayment: number; // 修正命名以與 App.tsx 邏輯對齊
  paymentDay: number;
  isPaidThisMonth: boolean;
}

export interface RecurringExpense {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  dayOfMonth: number;
  category: Category;
  paymentMethod: PaymentMethod;
  accountId?: string;
  creditCardId?: string;
}

export interface SavingsPlan {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  allocationPercentage: number;
  startDate: string;
  color: string;
}

export interface FixedAsset {
  id: string;
  name: string;
  value: number;
}

// ⭐ 統一後的 InitialData：帝國資產與預算的核心
export interface InitialData {
  accounts: Account[];
  fixedAssets: FixedAsset[];
  categoryBudgets?: CategoryBudget[]; // 預算連動中心
  isPremium?: boolean;
  createdAt?: number;
}
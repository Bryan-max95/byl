export interface User {
  id: number;
  username: string;
}

export interface Category {
  id: number;
  name: string;
  type: 'income' | 'expense' | 'wedding';
  is_active: boolean;
}

export interface Movement {
  id: number;
  amount: number;
  category_id: number;
  category_name: string;
  description: string;
  date: string;
  username: string;
  created_at: string;
}

export interface WeddingBudget {
  id: number;
  total_budget: number;
  budget_currency: string;
  event_date: string;
  notes: string;
}

export interface DashboardStats {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  wedding: {
    budget: number;
    spent: number;
    remaining: number;
    percent: number;
  };
}

export interface AuditLog {
  id: number;
  username: string;
  action: string;
  entity: string;
  created_at: string;
  ip_address: string;
}

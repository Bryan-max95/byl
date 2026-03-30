import React from 'react';
import { 
  Heart, 
  Plus, 
  Calendar, 
  Tag, 
  FileText, 
  Loader2, 
  X,
  Settings,
  TrendingUp,
  TrendingDown,
  Clock
} from 'lucide-react';
import type { WeddingBudget, Movement, Category } from '../types';

interface WeddingProps {
  budget: WeddingBudget | null;
  expenses: Movement[];
  categories: Category[];
  onAddExpense: (data: any) => Promise<void>;
  onUpdateBudget: (data: any) => Promise<void>;
}

export default function Wedding({ budget, expenses, categories, onAddExpense, onUpdateBudget }: WeddingProps) {
  const [isExpenseModalOpen, setIsExpenseModalOpen] = React.useState(false);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  const [expenseForm, setExpenseForm] = React.useState({
    amount: '',
    category_id: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [budgetForm, setBudgetForm] = React.useState({
    total_budget: budget?.total_budget || '',
    budget_currency: budget?.budget_currency || 'USD',
    event_date: budget?.event_date || '',
    notes: budget?.notes || ''
  });

  const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const remaining = (budget?.total_budget || 0) - totalSpent;
  const percentUsed = budget?.total_budget ? (totalSpent / budget.total_budget) * 100 : 0;

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onAddExpense(expenseForm);
      setIsExpenseModalOpen(false);
      setExpenseForm({ amount: '', category_id: '', description: '', date: new Date().toISOString().split('T')[0] });
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onUpdateBudget(budgetForm);
      setIsBudgetModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-pink-50 rounded-2xl border border-pink-100 flex items-center justify-center text-pink-600 shadow-sm">
            <Heart size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-neutral-900">Proyecto Boda</h2>
            <p className="text-sm text-neutral-500">Gestión de presupuesto y gastos del evento</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={() => setIsBudgetModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-neutral-200 text-neutral-700 rounded-2xl font-bold transition-all hover:bg-neutral-50 shadow-sm"
          >
            <Settings size={20} />
            Configurar Presupuesto
          </button>
          <button
            onClick={() => setIsExpenseModalOpen(true)}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-pink-100"
          >
            <Plus size={20} />
            Registrar Gasto
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
          <p className="text-sm font-medium text-neutral-500 mb-1">Presupuesto Total</p>
          <p className="text-2xl font-bold text-neutral-900">${Number(budget?.total_budget || 0).toLocaleString()}</p>
          <div className="mt-4 flex items-center gap-2 text-xs text-neutral-500">
            <Calendar size={14} />
            <span>Fecha: {budget?.event_date ? new Date(budget.event_date).toLocaleDateString() : 'No definida'}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
          <p className="text-sm font-medium text-neutral-500 mb-1">Total Gastado</p>
          <p className="text-2xl font-bold text-pink-600">${totalSpent.toLocaleString()}</p>
          <div className="mt-4 w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-pink-500 h-full transition-all duration-500" 
              style={{ width: `${Math.min(percentUsed, 100)}%` }}
            />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
          <p className="text-sm font-medium text-neutral-500 mb-1">Dinero Restante</p>
          <p className="text-2xl font-bold text-green-600">${remaining.toLocaleString()}</p>
          <p className="mt-4 text-xs text-neutral-500">
            {percentUsed.toFixed(1)}% del presupuesto utilizado
          </p>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-neutral-100">
          <h3 className="text-lg font-bold text-neutral-900">Historial de Gastos de Boda</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-neutral-50 text-neutral-500 text-xs font-semibold uppercase tracking-wider">
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Categoría</th>
                <th className="px-6 py-4">Descripción</th>
                <th className="px-6 py-4">Registrado por</th>
                <th className="px-6 py-4 text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {expenses.map((e) => (
                <tr key={e.id} className="hover:bg-neutral-50 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-sm text-neutral-600 font-medium">
                      <Calendar size={14} className="text-neutral-400" />
                      {new Date(e.date).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-pink-50 text-pink-700 border border-pink-100">
                      {e.category_name}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="text-neutral-400 shrink-0" />
                      <p className="text-sm text-neutral-600 truncate max-w-xs">{e.description || '-'}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-neutral-100 rounded-full flex items-center justify-center text-[10px] font-bold text-neutral-600 uppercase">
                        {e.username[0]}
                      </div>
                      <span className="text-sm font-medium text-neutral-900">{e.username}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <span className="text-sm font-bold text-neutral-900">
                      ${Number(e.amount).toLocaleString()}
                    </span>
                  </td>
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-neutral-500 text-sm">
                    No hay gastos registrados para la boda aún
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-neutral-100 flex items-center justify-between bg-pink-50/30">
              <h3 className="text-xl font-bold text-neutral-900">Nuevo Gasto de Boda</h3>
              <button onClick={() => setIsExpenseModalOpen(false)} className="p-2 text-neutral-400 hover:text-neutral-600 rounded-xl transition-all">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddExpense} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-neutral-700 ml-1">Monto</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({...expenseForm, amount: e.target.value})}
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none text-neutral-900 font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-neutral-700 ml-1">Fecha</label>
                  <input
                    type="date"
                    required
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm({...expenseForm, date: e.target.value})}
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none text-neutral-900"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-neutral-700 ml-1">Categoría</label>
                <select
                  required
                  value={expenseForm.category_id}
                  onChange={(e) => setExpenseForm({...expenseForm, category_id: e.target.value})}
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none text-neutral-900"
                >
                  <option value="">Seleccionar categoría...</option>
                  {categories.filter(c => c.type === 'wedding').map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-neutral-700 ml-1">Descripción</label>
                <textarea
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({...expenseForm, description: e.target.value})}
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none text-neutral-900 min-h-[100px] resize-none"
                />
              </div>
              <div className="pt-4 flex gap-4">
                <button type="button" onClick={() => setIsExpenseModalOpen(false)} className="flex-1 py-4 bg-neutral-100 text-neutral-700 rounded-2xl font-bold">Cancelar</button>
                <button type="submit" disabled={isLoading} className="flex-1 py-4 bg-pink-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2">
                  {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Guardar Gasto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Budget Modal */}
      {isBudgetModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-neutral-900">Configurar Presupuesto</h3>
              <button onClick={() => setIsBudgetModalOpen(false)} className="p-2 text-neutral-400 hover:text-neutral-600 rounded-xl transition-all">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleUpdateBudget} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-neutral-700 ml-1">Presupuesto Total</label>
                  <input
                    type="number"
                    required
                    value={budgetForm.total_budget}
                    onChange={(e) => setBudgetForm({...budgetForm, total_budget: e.target.value})}
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-neutral-900 font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-neutral-700 ml-1">Fecha del Evento</label>
                  <input
                    type="date"
                    value={budgetForm.event_date}
                    onChange={(e) => setBudgetForm({...budgetForm, event_date: e.target.value})}
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-neutral-900"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-neutral-700 ml-1">Notas Adicionales</label>
                <textarea
                  value={budgetForm.notes}
                  onChange={(e) => setBudgetForm({...budgetForm, notes: e.target.value})}
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-neutral-900 min-h-[100px] resize-none"
                />
              </div>
              <div className="pt-4 flex gap-4">
                <button type="button" onClick={() => setIsBudgetModalOpen(false)} className="flex-1 py-4 bg-neutral-100 text-neutral-700 rounded-2xl font-bold">Cancelar</button>
                <button type="submit" disabled={isLoading} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2">
                  {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Actualizar Configuración'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

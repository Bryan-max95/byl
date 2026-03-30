import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Heart, 
  ArrowUpRight, 
  ArrowDownRight,
  Calendar,
  Clock
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import type { DashboardStats, Movement } from '../types';

interface DashboardProps {
  stats: DashboardStats | null;
  recentMovements: Movement[];
}

export default function Dashboard({ stats, recentMovements }: DashboardProps) {
  if (!stats) return <div className="animate-pulse space-y-8">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[1,2,3,4].map(i => <div key={i} className="h-32 bg-white rounded-2xl border border-neutral-200" />)}
    </div>
    <div className="h-96 bg-white rounded-2xl border border-neutral-200" />
  </div>;

  const chartData = [
    { name: 'Ingresos', value: stats.totalIncome, color: '#4f46e5' },
    { name: 'Gastos', value: stats.totalExpense, color: '#ef4444' },
  ];

  const weddingData = [
    { name: 'Gastado', value: stats.wedding.spent, color: '#ec4899' },
    { name: 'Restante', value: stats.wedding.remaining, color: '#fbcfe8' },
  ];

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
              <Wallet size={20} />
            </div>
            <span className="text-xs font-medium text-neutral-500">Balance Total</span>
          </div>
          <p className="text-2xl font-bold text-neutral-900">${stats.balance.toLocaleString()}</p>
          <div className="mt-2 flex items-center gap-1 text-xs text-green-600 font-medium">
            <ArrowUpRight size={14} />
            <span>+2.4% vs mes anterior</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
              <TrendingUp size={20} />
            </div>
            <span className="text-xs font-medium text-neutral-500">Ingresos Totales</span>
          </div>
          <p className="text-2xl font-bold text-neutral-900">${stats.totalIncome.toLocaleString()}</p>
          <p className="mt-2 text-xs text-neutral-500">Suma de todos los ingresos</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-600">
              <TrendingDown size={20} />
            </div>
            <span className="text-xs font-medium text-neutral-500">Gastos Totales</span>
          </div>
          <p className="text-2xl font-bold text-neutral-900">${stats.totalExpense.toLocaleString()}</p>
          <p className="mt-2 text-xs text-neutral-500">Personales + Conjuntos</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-pink-50 rounded-xl flex items-center justify-center text-pink-600">
              <Heart size={20} />
            </div>
            <span className="text-xs font-medium text-neutral-500">Estado Boda</span>
          </div>
          <p className="text-2xl font-bold text-neutral-900">{stats.wedding.percent.toFixed(1)}%</p>
          <div className="mt-2 w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-pink-500 h-full transition-all duration-500" 
              style={{ width: `${Math.min(stats.wedding.percent, 100)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Charts */}
        <div className="lg:col-span-2 bg-white p-8 rounded-2xl border border-neutral-200 shadow-sm">
          <h3 className="text-lg font-bold text-neutral-900 mb-8">Resumen Financiero</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                <Tooltip 
                  cursor={{ fill: '#f9fafb' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={60}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-neutral-200 shadow-sm">
          <h3 className="text-lg font-bold text-neutral-900 mb-8">Presupuesto Boda</h3>
          <div className="h-[250px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={weddingData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {weddingData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-sm text-neutral-500">Gastado</p>
              <p className="text-xl font-bold text-neutral-900">${stats.wedding.spent.toLocaleString()}</p>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-500">Presupuesto Total</span>
              <span className="font-semibold text-neutral-900">${stats.wedding.budget.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-500">Disponible</span>
              <span className="font-semibold text-green-600">${stats.wedding.remaining.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Movements */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-neutral-900">Últimos Movimientos</h3>
          <button className="text-sm font-medium text-indigo-600 hover:text-indigo-700">Ver todo</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-neutral-50 text-neutral-500 text-xs font-semibold uppercase tracking-wider">
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Usuario</th>
                <th className="px-6 py-4">Categoría</th>
                <th className="px-6 py-4">Descripción</th>
                <th className="px-6 py-4 text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {recentMovements.map((m) => (
                <tr key={m.id} className="hover:bg-neutral-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-neutral-600">
                      <Calendar size={14} className="text-neutral-400" />
                      {new Date(m.date).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-neutral-100 rounded-full flex items-center justify-center text-[10px] font-bold text-neutral-600 uppercase">
                        {m.username[0]}
                      </div>
                      <span className="text-sm font-medium text-neutral-900">{m.username}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-800">
                      {m.category_name}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-neutral-600 truncate max-w-xs">{m.description || '-'}</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={cn(
                      "text-sm font-bold",
                      m.amount > 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {m.amount > 0 ? '+' : ''}${Math.abs(m.amount).toLocaleString()}
                    </span>
                  </td>
                </tr>
              ))}
              {recentMovements.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-neutral-500 text-sm">
                    No hay movimientos registrados recientemente
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

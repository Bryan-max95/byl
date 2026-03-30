import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Movements from './components/Movements';
import Wedding from './components/Wedding';
import Audit from './components/Audit';
import type { User, Category, Movement, WeddingBudget, DashboardStats, AuditLog } from './types';

export default function App() {
  const [user, setUser] = React.useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = React.useState<string | null>(localStorage.getItem('token'));
  const [stats, setStats] = React.useState<DashboardStats | null>(null);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [personalIncomes, setPersonalIncomes] = React.useState<Movement[]>([]);
  const [personalExpenses, setPersonalExpenses] = React.useState<Movement[]>([]);
  const [jointExpenses, setJointExpenses] = React.useState<Movement[]>([]);
  const [weddingBudget, setWeddingBudget] = React.useState<WeddingBudget | null>(null);
  const [weddingExpenses, setWeddingExpenses] = React.useState<Movement[]>([]);
  const [auditLogs, setAuditLogs] = React.useState<AuditLog[]>([]);

  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const res = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (res.status === 401 || res.status === 403) {
      handleLogout();
      throw new Error('Sesión expirada');
    }
    return res.json();
  };

  const loadData = async () => {
    if (!token) return;
    try {
      const [s, c, pi, pe, je, wb, we, al] = await Promise.all([
        fetchWithAuth('/api/dashboard/stats'),
        fetchWithAuth('/api/categories'),
        fetchWithAuth('/api/personal/incomes'),
        fetchWithAuth('/api/personal/expenses'),
        fetchWithAuth('/api/joint/expenses'),
        fetchWithAuth('/api/wedding/budget'),
        fetchWithAuth('/api/wedding/expenses'),
        fetchWithAuth('/api/audit'),
      ]);
      setStats(s);
      setCategories(c);
      setPersonalIncomes(pi);
      setPersonalExpenses(pe);
      setJointExpenses(je);
      setWeddingBudget(wb);
      setWeddingExpenses(we);
      setAuditLogs(al);
    } catch (err) {
      console.error('Error loading data:', err);
    }
  };

  React.useEffect(() => {
    if (token) loadData();
  }, [token]);

  const handleLogin = async (username: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (res.ok) {
      setUser(data.user);
      setToken(data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('token', data.token);
    } else {
      throw new Error(data.error);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  const handleAddMovement = async (type: string, data: any) => {
    const url = {
      income: '/api/personal/incomes',
      expense: '/api/personal/expenses',
      joint: '/api/joint/expenses',
      wedding: '/api/wedding/expenses'
    }[type];
    
    if (!url) return;

    await fetchWithAuth(url, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    await loadData();
  };

  const handleUpdateWeddingBudget = async (data: any) => {
    await fetchWithAuth('/api/wedding/budget', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    await loadData();
  };

  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <BrowserRouter>
      <Layout user={user} onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={
            <Dashboard 
              stats={stats} 
              recentMovements={[...personalIncomes, ...personalExpenses, ...jointExpenses]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 10)
              } 
            />
          } />
          <Route path="/incomes" element={
            <Movements 
              title="Ingresos Personales" 
              type="income" 
              movements={personalIncomes} 
              categories={categories.filter(c => c.type === 'income')}
              onAdd={(data) => handleAddMovement('income', data)}
            />
          } />
          <Route path="/expenses" element={
            <Movements 
              title="Gastos Personales" 
              type="expense" 
              movements={personalExpenses} 
              categories={categories.filter(c => c.type === 'expense')}
              onAdd={(data) => handleAddMovement('expense', data)}
            />
          } />
          <Route path="/joint" element={
            <Movements 
              title="Gastos Conjuntos" 
              type="joint" 
              movements={jointExpenses} 
              categories={categories.filter(c => c.type === 'expense')}
              onAdd={(data) => handleAddMovement('joint', data)}
            />
          } />
          <Route path="/wedding" element={
            <Wedding 
              budget={weddingBudget} 
              expenses={weddingExpenses} 
              categories={categories}
              onAddExpense={(data) => handleAddMovement('wedding', data)}
              onUpdateBudget={handleUpdateWeddingBudget}
            />
          } />
          <Route path="/audit" element={<Audit logs={auditLogs} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

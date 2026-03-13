import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';
import { useAuthStore } from './store/authStore';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Inventory from './pages/Inventory';
import Customers from './pages/Customers';
import AccountsPayable from './pages/AccountsPayable';
import Reports from './pages/Reports';
import Layout from './components/Layout';

const queryClient = new QueryClient();

function App() {
  const { user, setUser } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      })
      .finally(() => setLoading(loading => false));
  }, [setUser]);

  if (loading) return <div className="h-screen w-screen bg-zinc-950 flex items-center justify-center text-zinc-400">Carregando...</div>;

  return (
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-right" theme="dark" richColors />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
          <Route
            path="/"
            element={user ? <Layout /> : <Navigate to="/login" />}
          >
            <Route index element={<Dashboard />} />
            <Route path="pos" element={<POS />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="customers" element={<Customers />} />
            <Route path="accounts" element={<AccountsPayable />} />
            <Route path="reports" element={<Reports />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;

import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Users, 
  CreditCard, 
  BarChart3, 
  LogOut,
  Clock,
  User as UserIcon,
  Circle
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEffect, useState } from 'react';

export default function Layout() {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: session } = useQuery({
    queryKey: ['cashier-session'],
    queryFn: () => fetch('/api/cashier/session').then(res => res.json()),
    refetchInterval: 30000
  });

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    logout();
    navigate('/login');
  };

  const menuItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/pos', icon: ShoppingCart, label: 'PDV' },
    { path: '/inventory', icon: Package, label: 'Estoque' },
    { path: '/customers', icon: Users, label: 'Clientes' },
    { path: '/accounts', icon: CreditCard, label: 'Contas a Pagar' },
    { path: '/reports', icon: BarChart3, label: 'Relatórios' },
  ];

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-cherry rounded-xl flex items-center justify-center shadow-lg shadow-cherry/20">
              <span className="font-bold text-white text-xl">C</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-white">Cerejeira</span>
          </div>

          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    isActive 
                      ? 'bg-cherry/10 text-cherry font-medium' 
                      : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-zinc-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-zinc-400 hover:bg-red-500/10 hover:text-red-500 transition-all"
          >
            <LogOut className="w-5 h-5" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-8">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <Clock className="w-4 h-4" />
              {format(time, "dd 'de' MMMM, HH:mm:ss", { locale: ptBR })}
            </div>
            <div className="h-4 w-px bg-zinc-800" />
            <div className="flex items-center gap-2">
              <Circle className={`w-2 h-2 fill-current ${session ? 'text-cherry' : 'text-red-500'}`} />
              <span className="text-xs font-medium uppercase tracking-wider">
                Caixa: {session ? 'Aberto' : 'Fechado'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-zinc-100">{user?.name}</p>
              <p className="text-xs text-zinc-500 uppercase">{user?.role}</p>
            </div>
            <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center border border-zinc-700">
              <UserIcon className="w-5 h-5 text-zinc-400" />
            </div>
          </div>
        </header>

        {/* Page Area */}
        <div className="flex-1 overflow-auto p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

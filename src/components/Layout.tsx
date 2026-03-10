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
  Circle,
  Menu,
  X
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

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
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden relative">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col transition-transform duration-300 lg:relative lg:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-cherry rounded-xl flex items-center justify-center shadow-lg shadow-cherry/20">
                <span className="font-bold text-white text-xl">C</span>
              </div>
              <span className="text-xl font-bold tracking-tight text-white">Cerejeira</span>
            </div>
            <button 
              className="lg:hidden text-zinc-400 hover:text-white"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <X className="w-6 h-6" />
            </button>
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
      <main className="flex-1 flex flex-col overflow-hidden w-full">
        {/* Header */}
        <header className="h-16 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-4 lg:px-8 shrink-0">
          <div className="flex items-center gap-4 lg:gap-6">
            <button 
              className="lg:hidden p-2 text-zinc-400 hover:bg-zinc-800 rounded-lg"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden sm:flex items-center gap-2 text-sm text-zinc-400">
              <Clock className="w-4 h-4" />
              <span className="hidden md:inline">{format(time, "dd 'de' MMMM, HH:mm:ss", { locale: ptBR })}</span>
              <span className="md:hidden">{format(time, "HH:mm:ss")}</span>
            </div>
            <div className="hidden sm:block h-4 w-px bg-zinc-800" />
            <div className="flex items-center gap-2">
              <Circle className={`w-2 h-2 fill-current ${session ? 'text-cherry' : 'text-red-500'}`} />
              <span className="text-[10px] lg:text-xs font-medium uppercase tracking-wider">
                {session ? 'Aberto' : 'Fechado'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 lg:gap-4">
            <div className="text-right hidden xs:block">
              <p className="text-sm font-medium text-zinc-100 truncate max-w-[100px]">{user?.name}</p>
              <p className="text-[10px] text-zinc-500 uppercase">{user?.role}</p>
            </div>
            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-zinc-800 rounded-full flex items-center justify-center border border-zinc-700">
              <UserIcon className="w-4 h-4 lg:w-5 lg:h-5 text-zinc-400" />
            </div>
          </div>
        </header>

        {/* Page Area */}
        <div className="flex-1 overflow-auto p-4 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

import { Link, useLocation } from 'react-router-dom';
import { TrendingUp, BarChart3, Star, Clock, Settings } from 'lucide-react';

const navItems = [
  { path: '/', label: '今日精选', icon: TrendingUp },
  { path: '/strategy', label: '选股策略', icon: BarChart3 },
  { path: '/favorites', label: '我的收藏', icon: Star },
  { path: '/history', label: '历史记录', icon: Clock },
];

export function Header() {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-primary/80 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center shadow-lg shadow-accent/25 group-hover:shadow-accent/40 transition-shadow">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">A股智选</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(({ path, label, icon: Icon }) => {
              const isActive = location.pathname === path;
              return (
                <Link
                  key={path}
                  to={path}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                    ${isActive
                      ? 'bg-accent/20 text-accent'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <nav className="md:hidden border-t border-white/10">
        <div className="flex items-center justify-around py-2">
          {navItems.map(({ path, label, icon: Icon }) => {
            const isActive = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={`
                  flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs transition-all
                  ${isActive
                    ? 'text-accent'
                    : 'text-gray-400'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}

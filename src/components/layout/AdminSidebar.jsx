import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  LayoutDashboard, 
  Users, 
  FileText,
  Scale,
  Settings, 
  LogOut,
  ChevronLeft,
  Inbox,
  BarChart3
} from 'lucide-react';
import { base44 } from '@/api/base44Client';

const AdminSidebar = ({ user }) => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const currentPath = location.pathname;

  const menuItems = [
    { 
      label: 'Dashboard', 
      icon: LayoutDashboard, 
      path: 'AdminDashboard',
      active: currentPath.includes('/AdminDashboard')
    },
    { 
      label: 'Leads Queue', 
      icon: Inbox, 
      path: 'AdminLeads',
      active: currentPath.includes('/AdminLeads')
    },
    { 
      label: 'Cases', 
      icon: Scale, 
      path: 'AdminCases',
      active: currentPath.includes('/AdminCases')
    },
    { 
      label: 'Lawyers', 
      icon: Users, 
      path: 'AdminLawyers',
      active: currentPath.includes('/AdminLawyers')
    },
  ];

  const handleLogout = () => {
    base44.auth.logout();
  };

  return (
    <aside className={`fixed left-0 top-0 h-full bg-gray-900 border-r border-gray-800 transition-all duration-300 z-40 ${
      collapsed ? 'w-20' : 'w-64'
    }`}>
      {/* Logo */}
      <div className="h-20 flex items-center justify-between px-4 border-b border-gray-800">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <img 
              src="https://taylormadelaw.com/wp-content/uploads/2025/06/cropped-TML-concierge.png" 
              alt="TML Admin" 
              className="h-12 w-auto"
            />
          </div>
        )}
        {collapsed && (
          <img 
            src="https://taylormadelaw.com/wp-content/uploads/2025/06/cropped-TML-concierge.png" 
            alt="TML" 
            className="h-10 w-auto mx-auto"
          />
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ChevronLeft className={`w-5 h-5 text-gray-400 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* User Info */}
      {!collapsed && user && (
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3a164d] to-[#993333] flex items-center justify-center text-white font-semibold">
              {user.full_name?.charAt(0) || user.email?.charAt(0)?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user.full_name || 'Admin'}
              </p>
              <p className="text-xs text-gray-400 truncate capitalize">{user.user_type || user.role}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="p-4 space-y-2">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={createPageUrl(item.path)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
              item.active
                ? 'bg-[#3a164d] text-white shadow-lg shadow-[#3a164d]/20'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <item.icon className={`w-5 h-5 ${collapsed ? 'mx-auto' : ''}`} />
            {!collapsed && <span className="font-medium">{item.label}</span>}
          </Link>
        ))}
      </nav>

      {/* Logout */}
      <div className="absolute bottom-4 left-4 right-4">
        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 px-4 py-3 w-full text-gray-400 hover:bg-red-900/20 hover:text-red-400 rounded-xl transition-all duration-200 ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span className="font-medium">Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
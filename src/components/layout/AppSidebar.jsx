import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  LayoutDashboard, 
  Briefcase, 
  FolderOpen,
  Settings, 
  LogOut,
  ChevronLeft,
  Scale
} from 'lucide-react';
import { base44 } from '@/api/base44Client';

const AppSidebar = ({ user, lawyerProfile }) => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const currentPath = location.pathname;

  const menuItems = [
    { 
      label: 'Dashboard', 
      icon: LayoutDashboard, 
      path: 'LawyerDashboard',
      active: currentPath.includes('/LawyerDashboard')
    },
    { 
      label: 'Case Exchange', 
      icon: Scale, 
      path: 'CaseExchange',
      active: currentPath.includes('/CaseExchange')
    },
    { 
      label: 'My Cases', 
      icon: FolderOpen, 
      path: 'MyCases',
      active: currentPath.includes('/MyCases')
    },
    { 
      label: 'Settings', 
      icon: Settings, 
      path: 'LawyerSettings',
      active: currentPath.includes('/LawyerSettings')
    },
  ];

  const handleLogout = () => {
    base44.auth.logout();
  };

  return (
    <aside className={`fixed left-0 top-0 h-full bg-white border-r border-gray-200 transition-all duration-300 z-40 ${
      collapsed ? 'w-20' : 'w-64'
    }`}>
      {/* Logo */}
      <div className="h-20 flex items-center justify-between px-4 border-b border-gray-100">
        {!collapsed && (
          <Link to={createPageUrl('LawyerDashboard')} className="flex items-center">
            <span className="text-lg font-bold text-[#3a164d]" style={{ fontFamily: 'serif' }}>
              TAYLOR MADE LAW
            </span>
          </Link>
        )}
        {collapsed && (
          <span className="text-xl font-bold text-[#3a164d] mx-auto" style={{ fontFamily: 'serif' }}>
            TM
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft className={`w-5 h-5 text-gray-500 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* User Info */}
      {!collapsed && user && (
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3a164d] to-[#993333] flex items-center justify-center text-white font-semibold">
              {user.full_name?.charAt(0) || user.email?.charAt(0)?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user.full_name || 'Attorney'}
              </p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
          </div>
          {lawyerProfile && (
            <div className={`mt-2 px-2 py-1 rounded-full text-xs font-medium text-center ${
              lawyerProfile.status === 'approved' 
                ? 'bg-emerald-100 text-emerald-700'
                : lawyerProfile.status === 'pending'
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-red-100 text-red-700'
            }`}>
              {lawyerProfile.status === 'approved' ? 'Approved Attorney' : 
               lawyerProfile.status === 'pending' ? 'Pending Approval' : 'Restricted'}
            </div>
          )}
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
                : 'text-gray-600 hover:bg-gray-50 hover:text-[#3a164d]'
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
          className={`flex items-center gap-3 px-4 py-3 w-full text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all duration-200 ${
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

export default AppSidebar;
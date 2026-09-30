import React, { useState } from 'react';
import {
  Activity,
  PhoneCall,
  Bell,
  LogOut,
  Settings,
  ChevronDown,
  ShieldAlert,
  MapPin,
  Building2
} from 'lucide-react';
import { useMedMesh, ROLE_ROUTE_MAP } from '../../store/useMedMeshStore';
import { ROLE_CONFIGS } from '../../store/mockData';

export const Navbar: React.FC = () => {
  const {
    isAuthenticated,
    currentUser,
    currentRole,
    currentPath,
    navigate,
    logout,
    surgeModeActive,
    notifications,
    districts,
    selectedDistrictId,
    setSelectedDistrict,
    currentDistrict
  } = useMedMesh();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  const roleConfig = ROLE_CONFIGS[currentRole];

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      {/* Surge Mode Statewide Emergency Bar */}
      {surgeModeActive && (
        <div className="bg-red-600 text-white px-4 py-2 flex items-center justify-between text-xs font-semibold tracking-wide animate-pulse">
          <div className="flex items-center space-x-2 max-w-7xl mx-auto w-full">
            <ShieldAlert className="w-4 h-4 flex-shrink-0 animate-bounce" />
            <span>
              🚨 STATEWIDE SURGE PROTOCOL ACTIVE: Mandatory 10-minute telemetry reporting enforced across all facilities.
            </span>
          </div>
        </div>
      )}

      {/* Main Brand & Header Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div
            onClick={() => isAuthenticated ? navigate(ROLE_ROUTE_MAP[currentRole]) : navigate('/login')}
            className="flex items-center space-x-3 cursor-pointer select-none"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/30">
              <Activity className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-black text-xl tracking-tight text-slate-900">MedMesh</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping-slow mr-1.5"></span>
                  LIVE NETWORK
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Real-Time Healthcare Capacity Exchange Network
              </p>
            </div>
          </div>

          {/* District Selector Component (Requirement: [ State: Tamil Nadu ] [ District: Karur ▼ ]) */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center bg-slate-100/90 hover:bg-slate-100 border border-slate-200 rounded-xl p-1 px-2.5 transition shadow-xs">
              <div className="flex items-center space-x-1.5 text-slate-600 text-[11px] font-extrabold uppercase tracking-wider pr-2 border-r border-slate-300">
                <span className="hidden lg:inline text-slate-400 font-semibold">State:</span>
                <span className="text-slate-800">Tamil Nadu</span>
              </div>
              <div className="flex items-center pl-2 space-x-1">
                <MapPin className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                <span className="text-[11px] font-semibold text-slate-500 hidden md:inline">District:</span>
                <select
                  value={selectedDistrictId}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  className="bg-transparent text-xs font-black text-blue-700 hover:text-blue-800 cursor-pointer focus:outline-none py-1 pr-1"
                  title="Switch Healthcare District"
                >
                  <option value="dist-karur">Karur (4 Hospitals)</option>
                  <option value="dist-trichy">Tiruchirappalli (4 Hospitals)</option>
                  <option value="dist-chennai">Chennai (5 Hospitals)</option>
                  <option value="all">All Districts (Tamil Nadu)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center space-x-3">
            {/* Notifications Icon */}
            {isAuthenticated && (
              <div className="relative">
                <button
                  onClick={() => setShowNotifMenu(!showNotifMenu)}
                  className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                  title="System Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {notifications.length > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white"></span>
                  )}
                </button>

                {showNotifMenu && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in">
                    <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Notifications</span>
                      <span className="text-[11px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                        {notifications.length} unread
                      </span>
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                      {notifications.map(n => (
                        <div key={n.id} className="p-3 text-xs hover:bg-slate-50 transition">
                          <div className="flex items-center justify-between mb-1">
                            <span className={`font-bold ${
                              n.type === 'emergency' ? 'text-red-600' :
                              n.type === 'warning' ? 'text-amber-600' :
                              n.type === 'success' ? 'text-emerald-600' : 'text-blue-600'
                            }`}>
                              {n.title}
                            </span>
                            <span className="text-[10px] text-slate-400">{n.timestamp}</span>
                          </div>
                          <p className="text-slate-600 leading-snug">{n.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Emergency Hotline CTA */}
            <a
              href="tel:108"
              onClick={(e) => {
                e.preventDefault();
                alert('🚨 Emergency Hotline: Connecting caller to Tamil Nadu 108 Emergency Dispatch Command...');
              }}
              className="hidden md:flex items-center space-x-1.5 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm shadow-red-500/20 transition active:scale-95"
            >
              <PhoneCall className="w-3.5 h-3.5 animate-bounce" />
              <span>Emergency 108</span>
            </a>

            {/* Authenticated User Menu (Requirement: Profile Avatar, User Name, Role Badge, Settings, Logout) */}
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2.5 p-1.5 pr-2.5 rounded-xl hover:bg-slate-100 transition border border-slate-200"
                >
                  <img
                    src={currentUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                    alt="User"
                    className="w-8 h-8 rounded-lg object-cover border border-slate-200"
                  />
                  <div className="text-left hidden md:block">
                    <div className="text-xs font-bold text-slate-900 leading-tight flex items-center space-x-1">
                      <span>{currentUser?.name}</span>
                    </div>
                    {/* Role Badge (Requirement: Only display role badge, NO role switcher dropdown!) */}
                    <span className="inline-block mt-0.5 text-[10px] font-extrabold uppercase font-mono px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200">
                      {roleConfig?.name || currentRole}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in">
                    {/* User Identity Header */}
                    <div className="px-4 py-3 border-b border-slate-100">
                      <div className="text-xs font-bold text-slate-900">{currentUser?.name}</div>
                      <div className="text-[11px] text-slate-400 truncate">{currentUser?.email}</div>
                      <div className="mt-1.5 text-[10px] font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-bold inline-block">
                        ROLE: {currentRole}
                      </div>
                    </div>

                    {/* Settings Option (Requirement) */}
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        alert(`Account & Security Settings: Viewing security configuration for ${currentUser?.email} (${currentRole}). MFA Status: ${currentUser?.mfaEnabled ? 'Enabled' : 'Standard'}.`);
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center space-x-2.5 transition"
                    >
                      <Settings className="w-4 h-4 text-slate-500" />
                      <span>Account & Security Settings</span>
                    </button>

                    {/* Logout Option (Requirement) */}
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        logout();
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center space-x-2.5 transition border-t border-slate-100 mt-1"
                    >
                      <LogOut className="w-4 h-4 text-rose-600" />
                      <span>Sign Out (Revoke JWT Session)</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition shadow-sm"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

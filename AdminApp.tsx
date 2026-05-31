import React, { useState, useEffect, useMemo } from 'react';
import { Asset, Brand, AssetType, AssetRequest } from './types';
import * as service from './services/assetService';
import { isSupabaseConfigured, configError } from './services/supabaseClient';
import AdminPanel from './components/AdminPanel';
import AssetGrid from './components/AssetGrid';
import AdminRequestsPanel from './components/AdminRequestsPanel';
import AssetTimelinePanel from './components/AssetTimelinePanel';

type AdminViewType = 'dashboard' | 'admin-upload' | 'admin-brands' | 'admin-types' | 'all-assets' | 'admin-drafts' | 'admin-requests';

const AdminApp: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('brandhub_admin_logged_in') === 'true';
  });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [data, setData] = useState<{assets: Asset[], brands: Brand[], assetTypes: AssetType[]}>({
    assets: [],
    brands: [],
    assetTypes: []
  });
  const [assetRequests, setAssetRequests] = useState<AssetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Navigation & UI State
  const [currentView, setCurrentView] = useState<AdminViewType>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [adminViewMode, setAdminViewMode] = useState<'grid' | 'list'>('list');
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [selectedTimelineAsset, setSelectedTimelineAsset] = useState<Asset | null>(null);

  useEffect(() => {
    if (isLoggedIn) {
      checkConfigAndLoad();
    }
  }, [isLoggedIn]);

  const checkConfigAndLoad = () => {
    if (configError) {
      setLoading(false);
      setErrorMsg(configError);
    } else if (isSupabaseConfigured) {
      loadInitialData();
    } else {
      setLoading(false);
      setErrorMsg("Configuration error.");
    }
  };

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const result = await service.fetchAllData();
      const sanitizedAssets = result.assets.map((a, i) => ({ ...a, sortOrder: a.sortOrder || i }));
      const sanitizedBrands = result.brands.map((b, i) => ({ ...b, sortOrder: b.sortOrder || i }));
      const sanitizedTypes = result.assetTypes.map((t, i) => ({ ...t, sortOrder: t.sortOrder || i }));

      setData({
        assets: sanitizedAssets,
        brands: sanitizedBrands,
        assetTypes: sanitizedTypes
      });

      // Load requests separately (graceful fallback if table not created yet)
      try {
        const requests = await service.fetchAssetRequests();
        setAssetRequests(requests);
      } catch (e) {
        console.warn('asset_requests table may not exist yet:', e);
        setAssetRequests([]);
      }
    } catch (error: any) {
      setErrorMsg(error?.message || "Database connection error.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email === 'admin@werkudara.com' && password === 'admin123') {
      localStorage.setItem('brandhub_admin_logged_in', 'true');
      setIsLoggedIn(true);
      setLoginError(null);
    } else {
      setLoginError('Invalid email or password.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('brandhub_admin_logged_in');
    setIsLoggedIn(false);
    setData({ assets: [], brands: [], assetTypes: [] });
  };

  const handleSaveAsset = async (assetData: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'> & { id?: string; _changelog?: string; _versionChanged?: boolean }) => {
    try {
      if (!assetData.id) assetData.sortOrder = data.assets.length;
      
      const { _changelog, _versionChanged, ...cleanAssetData } = assetData as any;
      const saved = await service.upsertAsset(cleanAssetData);

      // If version was bumped, save to asset_versions table
      if (_versionChanged && saved.id && _changelog) {
        try {
          await service.createAssetVersion(saved.id, saved.version ?? 1, _changelog);
        } catch (e) {
          console.warn('Failed to save asset version (table may not exist yet):', e);
        }
      }

      // Record Activity Log to asset_history table
      if (editingAsset && saved.id) {
        const changes: string[] = [];
        const details: Record<string, any> = {};

        if (editingAsset.link !== cleanAssetData.link) {
          changes.push('mengunggah ulang berkas');
          details.link = { old: editingAsset.link, new: cleanAssetData.link };
        }
        if (editingAsset.version !== cleanAssetData.version) {
          changes.push(`memperbarui versi berkas ke v${cleanAssetData.version}`);
          details.version = { 
            old: editingAsset.version, 
            new: cleanAssetData.version, 
            changelog: _changelog || 'Tidak ada catatan perubahan.' 
          };
        }
        if (editingAsset.title !== cleanAssetData.title) {
          changes.push('mengubah judul');
          details.title = { old: editingAsset.title, new: cleanAssetData.title };
        }
        if (editingAsset.description !== cleanAssetData.description) {
          changes.push('mengubah deskripsi');
          details.description = { old: editingAsset.description || '—', new: cleanAssetData.description || '—' };
        }
        if (JSON.stringify(editingAsset.tags) !== JSON.stringify(cleanAssetData.tags)) {
          changes.push('mengubah tag');
          details.tags = { old: editingAsset.tags || [], new: cleanAssetData.tags || [] };
        }
        if (editingAsset.brandId !== cleanAssetData.brandId) {
          changes.push('mengubah entitas');
          const oldBrand = data.brands.find(b => b.id === editingAsset.brandId)?.name || '—';
          const newBrand = data.brands.find(b => b.id === cleanAssetData.brandId)?.name || '—';
          details.brand = { old: oldBrand, new: newBrand };
        }
        if (editingAsset.typeId !== cleanAssetData.typeId) {
          changes.push('mengubah format/tipe');
          const oldType = data.assetTypes.find(t => t.id === editingAsset.typeId)?.name || '—';
          const newType = data.assetTypes.find(t => t.id === cleanAssetData.typeId)?.name || '—';
          details.type = { old: oldType, new: newType };
        }
        if (editingAsset.status !== cleanAssetData.status) {
          changes.push(`mengubah status menjadi ${cleanAssetData.status}`);
          details.status = { old: editingAsset.status, new: cleanAssetData.status };
        }

        if (changes.length > 0) {
          let actionType: 'CREATE' | 'REUPLOAD' | 'VERSION_UPDATE' | 'UPDATE_INFO' = 'UPDATE_INFO';
          if (editingAsset.version !== cleanAssetData.version) {
            actionType = 'VERSION_UPDATE';
          } else if (editingAsset.link !== cleanAssetData.link) {
            actionType = 'REUPLOAD';
          }

          const desc = `Memperbarui aset: ${changes.join(', ')}.`;
          try {
            await service.createAssetHistoryEntry({
              assetId: saved.id,
              actionType,
              description: desc,
              details
            });
          } catch (e) {
            console.warn('Failed to save asset activity log:', e);
          }
        }
      } else if (!editingAsset && saved.id) {
        try {
          await service.createAssetHistoryEntry({
            assetId: saved.id,
            actionType: 'CREATE',
            description: 'Aset pertama kali diunggah.',
            details: {
              title: saved.title,
              version: saved.version ?? 1,
              status: saved.status
            }
          });
        } catch (e) {
          console.warn('Failed to save initial asset upload log:', e);
        }
      }

      setData(prev => {
        const index = prev.assets.findIndex(a => a.id === saved.id);
        const newAssets = [...prev.assets];
        if (index >= 0) newAssets[index] = saved;
        else newAssets.push(saved);
        return { ...prev, assets: newAssets };
      });
      
      setCurrentView('all-assets');
      setEditingAsset(null);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    const asset = data.assets.find(a => a.id === assetId);
    if (!asset) return;
    
    if (window.confirm(`Are you sure you want to delete "${asset.title}"?`)) {
        try {
            await service.deleteAsset(assetId);
            setData(prev => ({ ...prev, assets: prev.assets.filter(a => a.id !== assetId) }));
        } catch (error: any) {
            alert("Failed to delete asset: " + error.message);
        }
    }
  };

  const handleReorderBrands = async (newOrder: Brand[]) => {
    const updated = newOrder.map((b, i) => ({ ...b, sortOrder: i }));
    setData(prev => ({ ...prev, brands: updated }));
    try { await service.updateBrands(updated); } catch (e) { console.error(e); }
  };

  const handleReorderTypes = async (newOrder: AssetType[]) => {
    const updated = newOrder.map((t, i) => ({ ...t, sortOrder: i }));
    setData(prev => ({ ...prev, assetTypes: updated }));
    try { await service.updateAssetTypes(updated); } catch (e) { console.error(e); }
  };

  const filteredAssets = useMemo(() => {
    return data.assets.filter(asset => {
      const matchesSearch = searchQuery 
        ? asset.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
          asset.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
        : true;
      const matchesBrand = selectedBrandId ? asset.brandId === selectedBrandId : true;
      const matchesStatus = currentView === 'admin-drafts' ? asset.status === 'DRAFT' : true;
      return matchesSearch && matchesBrand && matchesStatus;
    }).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }, [data.assets, searchQuery, selectedBrandId, currentView]);

  // 1. Beautiful Login Screen
  if (!isLoggedIn) {
    return (
      <div className="h-screen w-full flex bg-[#0a0b0d] font-sans">
        {/* Left Side: Dynamic/Geometric Visual Area */}
        <div className="hidden lg:flex lg:w-7/12 bg-gradient-to-tr from-[#002ecc] to-[#0052ff] relative overflow-hidden items-center justify-center p-16">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent)] pointer-events-none"></div>
          <div className="absolute w-[600px] h-[600px] rounded-full border border-white/10 -top-40 -left-40 animate-pulse"></div>
          <div className="absolute w-[400px] h-[400px] rounded-full border border-white/5 bottom-20 right-20"></div>
          
          <div className="relative z-10 max-w-lg text-white">
            <div className="w-12 h-12 bg-white text-[#0052ff] rounded-full flex items-center justify-center font-bold text-lg mb-8 shadow-xl">
              WG
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight mb-4 leading-tight">
              Sistem Sentralisasi Aset Digital
            </h1>
            <p className="text-white/80 text-lg font-light leading-relaxed">
              Selamat datang di Panel Administrasi BrandHub Werkudara Group. Kelola semua aset visual, merek, entitas, dan format file di satu tempat yang aman dan terorganisir.
            </p>
          </div>
        </div>

        {/* Right Side: Sleek Login Form */}
        <div className="w-full lg:w-5/12 flex items-center justify-center p-8 bg-[#111216]">
          <div className="w-full max-w-md space-y-8">
            <div className="text-center lg:text-left">
              <div className="lg:hidden inline-flex w-10 h-10 bg-[#0052ff] text-white rounded-full items-center justify-center font-bold text-sm mb-4">
                WG
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-white">Admin Hub Login</h2>
              <p className="mt-2 text-sm text-gray-400">
                Silakan masuk dengan kredensial administrator Anda.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              {loginError && (
                <div className="bg-red-500/10 border border-red-500/30 text-[#ff4d4d] text-sm p-4 rounded-lg flex items-center gap-3">
                  <span className="text-lg">⚠️</span>
                  <span>{loginError}</span>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Alamat Email</label>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-[#1e2026] text-white border border-[#2d3139] rounded-lg outline-none text-[15px] focus:border-[#0052ff] transition-all placeholder:text-gray-600"
                  placeholder="admin@werkudara.com"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Kata Sandi</label>
                <div className="relative">
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-[#1e2026] text-white border border-[#2d3139] rounded-lg outline-none text-[15px] focus:border-[#0052ff] transition-all placeholder:text-gray-600 pr-10"
                    placeholder="••••••••"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-white transition-colors rounded-md"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button 
                type="submit"
                className="w-full py-3 px-4 bg-[#0052ff] hover:bg-[#003ecc] text-white text-[15px] font-semibold rounded-lg transition-colors shadow-lg shadow-[#0052ff]/20"
              >
                Sign In to Admin Hub
              </button>
            </form>

            <div className="text-center pt-4">
              <a href="index.html" className="text-sm font-semibold text-gray-400 hover:text-white transition-colors">
                ← Kembali ke Hub Publik
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading indicator for authenticated admin
  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#0a0b0d]">
        <div className="w-8 h-8 rounded-full animate-spin mb-4 border-2 border-gray-800 border-t-[#0052ff]"></div>
        <p className="text-sm text-gray-400 font-medium">Memuat Workspace Admin...</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#0a0b0d] p-8 text-center">
        <div className="text-red-500 text-5xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold text-white mb-2">Workspace Configuration Error</h1>
        <p className="text-gray-400 max-w-md mb-6">{errorMsg}</p>
        <button onClick={handleLogout} className="px-6 py-2.5 bg-[#0052ff] hover:bg-[#003ecc] text-white font-semibold rounded-lg transition-colors">Logout</button>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-coinbase-canvas">
      {/* Admin Left Sidebar */}
      <aside className="w-72 flex-shrink-0 bg-[#0a0b0d] text-white flex flex-col border-r border-[#1e2026]">
        <div className="p-6 h-[72px] flex items-center justify-between border-b border-[#1e2026]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#0052ff] rounded-full flex items-center justify-center font-bold text-xs">
              WG
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight">Admin Hub</h1>
              <span className="text-[10px] text-gray-400 tracking-wider uppercase font-semibold">Werkudara Group</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto no-scrollbar">
          <div className="px-3 pb-2 text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Navigasi Utama</div>
          
          <button 
            onClick={() => { setCurrentView('dashboard'); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-[14px] font-medium transition-colors ${currentView === 'dashboard' ? 'bg-[#0052ff] text-white' : 'text-gray-400 hover:bg-[#16181c] hover:text-white'}`}
          >
            <span className="text-lg">📊</span>
            <span>Ringkasan Dashboard</span>
          </button>

          <button 
            onClick={() => { setCurrentView('all-assets'); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-[14px] font-medium transition-colors ${currentView === 'all-assets' ? 'bg-[#0052ff] text-white' : 'text-gray-400 hover:bg-[#16181c] hover:text-white'}`}
          >
            <span className="text-lg">📂</span>
            <span>Semua Aset</span>
          </button>

          <button 
            onClick={() => { setCurrentView('admin-drafts'); }}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-[14px] font-medium transition-colors ${currentView === 'admin-drafts' ? 'bg-[#0052ff] text-white' : 'text-gray-400 hover:bg-[#16181c] hover:text-white'}`}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">📝</span>
              <span>Aset Draft</span>
            </div>
            {data.assets.filter(a => a.status === 'DRAFT').length > 0 && (
              <span className="px-2 py-0.5 text-[11px] font-bold bg-amber-500 text-slate-900 rounded-full">
                {data.assets.filter(a => a.status === 'DRAFT').length}
              </span>
            )}
          </button>

          <button 
            onClick={() => { setCurrentView('admin-requests'); }}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-[14px] font-medium transition-colors ${currentView === 'admin-requests' ? 'bg-[#0052ff] text-white' : 'text-gray-400 hover:bg-[#16181c] hover:text-white'}`}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">📋</span>
              <span>Kelola Request</span>
            </div>
            {assetRequests.filter(r => r.status === 'PENDING').length > 0 && (
              <span className="px-2 py-0.5 text-[11px] font-bold bg-[#0052ff] text-white rounded-full border border-white/30">
                {assetRequests.filter(r => r.status === 'PENDING').length}
              </span>
            )}
          </button>

          <div className="h-4"></div>
          <div className="px-3 pb-2 text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Aksi Kelola</div>

          <button 
            onClick={() => { setCurrentView('admin-upload'); setEditingAsset(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-[14px] font-medium transition-colors ${currentView === 'admin-upload' && !editingAsset ? 'bg-[#0052ff] text-white' : 'text-gray-400 hover:bg-[#16181c] hover:text-white'}`}
          >
            <span className="text-lg">➕</span>
            <span>Upload Aset Baru</span>
          </button>

          <button 
            onClick={() => { setCurrentView('admin-brands'); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-[14px] font-medium transition-colors ${currentView === 'admin-brands' ? 'bg-[#0052ff] text-white' : 'text-gray-400 hover:bg-[#16181c] hover:text-white'}`}
          >
            <span className="text-lg">🏢</span>
            <span>Kelola Entitas (Brands)</span>
          </button>

          <button 
            onClick={() => { setCurrentView('admin-types'); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-[14px] font-medium transition-colors ${currentView === 'admin-types' ? 'bg-[#0052ff] text-white' : 'text-gray-400 hover:bg-[#16181c] hover:text-white'}`}
          >
            <span className="text-lg">🏷️</span>
            <span>Kelola Tipe/Format</span>
          </button>
        </nav>

        {/* Footer Area */}
        <div className="p-4 border-t border-[#1e2026] space-y-2">
          <a 
            href="index.html" 
            target="_blank"
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#16181c] hover:bg-[#22252c] text-white text-[13px] font-semibold transition-colors border border-[#2d3139]"
          >
            <span>👁️</span>
            <span>Lihat Hub Publik</span>
          </a>
          <button 
            onClick={handleLogout}
            className="w-full py-2.5 px-4 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[13px] font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <span>🔓</span>
            <span>Keluar (Logout)</span>
          </button>
        </div>
      </aside>

      {/* Admin Main Window */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-coinbase-surface-soft">
        {/* Top Header */}
        <header className="h-[72px] px-8 flex items-center justify-between bg-white border-b border-coinbase-hairline shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-[18px] font-bold text-coinbase-ink">
              {currentView === 'dashboard' ? 'Overview Dashboard' :
               currentView === 'all-assets' ? 'Katalog Semua Aset' :
               currentView === 'admin-drafts' ? 'Katalog Aset Draft' :
               currentView === 'admin-upload' ? (editingAsset ? 'Edit Aset' : 'Upload Aset') :
               currentView === 'admin-brands' ? 'Kelola Entitas' :
               currentView === 'admin-requests' ? 'Kelola Request Aset' : 'Kelola Format'}
            </h2>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="px-3 py-1 bg-green-500/10 text-green-600 rounded-full text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></span>
              Admin Session Active
            </span>
          </div>
        </header>

        {/* Content Wrapper */}
        <div className="flex-1 overflow-y-auto px-8 py-8">
          {currentView === 'dashboard' ? (
            <div className="max-w-5xl mx-auto space-y-8">
              {/* Quick Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl border border-coinbase-hairline shadow-soft flex items-center gap-5">
                  <div className="w-12 h-12 rounded-full bg-[#0052ff]/10 text-[#0052ff] flex items-center justify-center text-2xl">📂</div>
                  <div>
                    <h3 className="text-sm font-semibold text-coinbase-muted uppercase tracking-wider">Total Aset</h3>
                    <p className="text-3xl font-bold text-coinbase-ink mt-1">{data.assets.length}</p>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-coinbase-hairline shadow-soft flex items-center gap-5">
                  <div className="w-12 h-12 rounded-full bg-purple-500/10 text-purple-600 flex items-center justify-center text-2xl">🏢</div>
                  <div>
                    <h3 className="text-sm font-semibold text-coinbase-muted uppercase tracking-wider">Entitas</h3>
                    <p className="text-3xl font-bold text-coinbase-ink mt-1">{data.brands.length}</p>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-coinbase-hairline shadow-soft flex items-center gap-5">
                  <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center text-2xl">🏷️</div>
                  <div>
                    <h3 className="text-sm font-semibold text-coinbase-muted uppercase tracking-wider">Format File</h3>
                    <p className="text-3xl font-bold text-coinbase-ink mt-1">{data.assetTypes.length}</p>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-coinbase-hairline shadow-soft flex items-center gap-5 relative overflow-hidden">
                  <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center text-2xl">📋</div>
                  <div>
                    <h3 className="text-sm font-semibold text-coinbase-muted uppercase tracking-wider">Pending Request</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-3xl font-bold text-coinbase-ink">
                        {assetRequests.filter(r => r.status === 'PENDING').length}
                      </p>
                      {assetRequests.filter(r => r.status === 'PENDING').length > 0 && (
                        <span className="animate-pulse px-2 py-0.5 bg-red-100 text-red-600 rounded text-[10px] font-bold">NEW</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Welcome Area */}
              <div className="bg-gradient-to-r from-[#0052ff] to-[#003ecc] p-8 rounded-xl text-white shadow-soft relative overflow-hidden">
                <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none text-9xl select-none translate-y-6 translate-x-6">⚙️</div>
                <div className="relative z-10 max-w-xl">
                  <h2 className="text-2xl font-bold mb-2">Halo Administrator, selamat bekerja!</h2>
                  <p className="text-white/80 font-light mb-6 text-sm">
                    Gunakan panel ini untuk mengunggah logo baru, mengelola format aset pendukung, reorder urutan tampilan entitas, atau memperbarui informasi aset visual.
                  </p>
                  <div className="flex gap-3">
                    <button onClick={() => setCurrentView('admin-upload')} className="px-5 py-2.5 bg-white text-[#0052ff] rounded-lg text-sm font-semibold hover:bg-gray-100 transition-colors">
                      + Upload Aset Baru
                    </button>
                    <button onClick={() => setCurrentView('admin-requests')} className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2">
                      📋 Kelola Request Aset
                      {assetRequests.filter(r => r.status === 'PENDING').length > 0 && (
                        <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                          {assetRequests.filter(r => r.status === 'PENDING').length}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Advanced Summary Grid (Request & Pembaruan Aset) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* 1. Request Aset Breakdown Card */}
                <div className="bg-white rounded-xl border border-coinbase-hairline shadow-soft p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-coinbase-hairline pb-3">
                    <h3 className="text-[15px] font-bold text-coinbase-ink flex items-center gap-2">
                      📋 Summary Request Aset
                    </h3>
                    <button 
                      onClick={() => setCurrentView('admin-requests')}
                      className="text-xs text-[#0052ff] hover:underline font-semibold"
                    >
                      Lihat Semua
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                      <span className="text-[20px] font-bold text-amber-700 block">
                        {assetRequests.filter(r => r.status === 'PENDING').length}
                      </span>
                      <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider block mt-0.5">Menunggu</span>
                    </div>
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                      <span className="text-[20px] font-bold text-blue-700 block">
                        {assetRequests.filter(r => r.status === 'IN_PROGRESS').length}
                      </span>
                      <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider block mt-0.5">Diproses</span>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
                      <span className="text-[20px] font-bold text-emerald-700 block">
                        {assetRequests.filter(r => r.status === 'COMPLETED').length}
                      </span>
                      <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider block mt-0.5">Selesai</span>
                    </div>
                    <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                      <span className="text-[20px] font-bold text-red-700 block">
                        {assetRequests.filter(r => r.status === 'REJECTED').length}
                      </span>
                      <span className="text-[10px] font-semibold text-red-600 uppercase tracking-wider block mt-0.5">Ditolak</span>
                    </div>
                  </div>
                </div>

                {/* 2. Jadwal Pembaruan Breakdown Card */}
                {(() => {
                  const now = new Date();
                  const tracked = data.assets.filter(a => a.nextUpdateDue);
                  
                  const dueSoon = data.assets.filter(a => {
                    if (!a.nextUpdateDue) return false;
                    const due = new Date(a.nextUpdateDue);
                    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    return diffDays <= 30;
                  });

                  const superUrgent = dueSoon.filter(a => {
                    const diff = Math.ceil((new Date(a.nextUpdateDue!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    return diff <= 3;
                  }).length;

                  const urgent = dueSoon.filter(a => {
                    const diff = Math.ceil((new Date(a.nextUpdateDue!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    return diff > 3 && diff <= 15;
                  }).length;

                  const warning = dueSoon.filter(a => {
                    const diff = Math.ceil((new Date(a.nextUpdateDue!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    return diff > 15 && diff <= 30;
                  }).length;

                  return (
                    <div className="bg-white rounded-xl border border-coinbase-hairline shadow-soft p-6 space-y-4">
                      <div className="flex items-center justify-between border-b border-coinbase-hairline pb-3">
                        <h3 className="text-[15px] font-bold text-coinbase-ink flex items-center gap-2">
                          🔔 Jadwal Pembaruan Aset
                        </h3>
                        <span className="text-[11px] text-coinbase-muted font-semibold">
                          {tracked.length} Aset Terjadwal
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="bg-red-50 border border-red-100 rounded-lg p-2.5">
                          <span className="text-[18px] font-bold text-red-600 block">{superUrgent}</span>
                          <span className="text-[9px] font-bold text-red-500 uppercase tracking-wide block mt-0.5">🚨 ≤3 Hari</span>
                        </div>
                        <div className="bg-orange-50 border border-orange-100 rounded-lg p-2.5">
                          <span className="text-[18px] font-bold text-orange-600 block">{urgent}</span>
                          <span className="text-[9px] font-bold text-orange-500 uppercase tracking-wide block mt-0.5">⚠️ ≤15 Hari</span>
                        </div>
                        <div className="bg-amber-50 border border-amber-100 rounded-lg p-2.5">
                          <span className="text-[18px] font-bold text-amber-600 block">{warning}</span>
                          <span className="text-[9px] font-bold text-amber-500 uppercase tracking-wide block mt-0.5">📅 ≤30 Hari</span>
                        </div>
                      </div>

                      <p className="text-[11px] text-coinbase-muted text-center italic">
                        {dueSoon.length > 0 
                          ? `Terdapat ${dueSoon.length} aset yang mendekati jadwal pembaruan dalam 30 hari ke depan.`
                          : "Semua aset terjadwal dalam kondisi aman!"}
                      </p>
                    </div>
                  );
                })()}

              </div>

              {/* Latest Uploads */}
              <div className="bg-white rounded-xl border border-coinbase-hairline shadow-soft p-6">
                <h3 className="text-lg font-bold text-coinbase-ink mb-4">Aset yang Baru Diunggah</h3>
                <div className="divide-y divide-coinbase-hairline">
                  {data.assets.slice(-5).reverse().map(asset => {
                    const brand = data.brands.find(b => b.id === asset.brandId);
                    const type = data.assetTypes.find(t => t.id === asset.typeId);
                    return (
                    <div key={asset.id} className="py-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-coinbase-surface-strong flex items-center justify-center text-lg shrink-0">
                          {type?.icon || '📂'}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-coinbase-ink text-[14px] truncate">{asset.title}</h4>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-[12px] text-coinbase-muted">{brand?.name}</span>
                            <span className="text-coinbase-hairline text-[10px]">•</span>
                            <span className="text-[12px] text-coinbase-muted">{type?.name}</span>
                            <span className="text-coinbase-hairline text-[10px]">•</span>
                            <span className="text-[11px] text-coinbase-muted font-mono">{new Date(asset.createdAt).toLocaleDateString()}</span>
                            {asset.status === 'DRAFT' ? (
                              <span className="px-2 py-0.5 bg-[#fef5e7] text-[#b7791f] border border-[#fbd38d] rounded-full text-[10px] font-bold">Draft</span>
                            ) : (
                              <span className="px-2 py-0.5 bg-[#f0fff4] text-[#22543d] border border-[#c6f6d5] rounded-full text-[10px] font-bold">Published</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button 
                          onClick={() => { setEditingAsset(asset); setCurrentView('admin-upload'); }} 
                          className="px-3 py-1.5 text-xs font-semibold text-[#0052ff] hover:bg-[#0052ff]/10 rounded transition-colors"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteAsset(asset.id)} 
                          className="px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-500/10 rounded transition-colors"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  )})}
                  {data.assets.length === 0 && (
                    <div className="text-center py-6 text-coinbase-muted text-sm">Belum ada aset yang diunggah.</div>
                  )}
                </div>
              </div>

              {/* Upcoming Update Deadlines */}
              {(() => {
                const now = new Date();
                const dueSoon = data.assets.filter(a => {
                  if (!a.nextUpdateDue) return false;
                  const due = new Date(a.nextUpdateDue);
                  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                  return diffDays <= 30;
                }).sort((a, b) => new Date(a.nextUpdateDue!).getTime() - new Date(b.nextUpdateDue!).getTime());

                if (dueSoon.length === 0) return null;
                return (
                  <div className="bg-white rounded-xl border border-amber-200 shadow-soft p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-xl">🔔</span>
                      <h3 className="text-lg font-bold text-coinbase-ink">Aset Mendekati Jadwal Pembaruan</h3>
                      <span className="ml-auto px-2.5 py-0.5 bg-amber-100 text-amber-700 border border-amber-200 text-[11px] font-bold rounded-full">{dueSoon.length} Aset</span>
                    </div>
                    <div className="divide-y divide-coinbase-hairline">
                      {dueSoon.map(asset => {
                        const dueDate = new Date(asset.nextUpdateDue!);
                        const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                        const brand = data.brands.find(b => b.id === asset.brandId);
                        const urgencyColor = diffDays <= 3 ? 'text-red-600' : diffDays <= 5 ? 'text-orange-600' : diffDays <= 15 ? 'text-amber-600' : 'text-yellow-600';
                        const urgencyIcon = diffDays <= 3 ? '🚨' : diffDays <= 5 ? '⚠️' : diffDays <= 15 ? '🔔' : '📅';
                        return (
                          <div key={asset.id} className="py-3 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="text-xl shrink-0">{urgencyIcon}</span>
                              <div className="min-w-0">
                                <p className="font-semibold text-coinbase-ink text-[14px] truncate">{asset.title}</p>
                                <p className="text-[12px] text-coinbase-muted">{brand?.name} • v{asset.version ?? 1}</p>
                              </div>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className={`text-[13px] font-bold ${urgencyColor}`}>
                                {diffDays <= 0 ? 'Sudah lewat!' : `${diffDays} hari lagi`}
                              </p>
                              <p className="text-[11px] text-coinbase-muted font-mono">
                                {dueDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </p>
                            </div>
                            <button
                              onClick={() => { setEditingAsset(asset); setCurrentView('admin-upload'); }}
                              className="shrink-0 px-3 py-1.5 text-[12px] font-semibold text-[#0052ff] hover:bg-[#0052ff]/10 rounded-lg transition-colors"
                            >
                              Perbarui
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (currentView === 'all-assets' || currentView === 'admin-drafts') ? (
            <div className="max-w-6xl mx-auto space-y-6">
              {/* Asset Grid & Management */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-coinbase-ink">
                    {currentView === 'all-assets' ? 'Daftar Semua Aset' : 'Daftar Aset Draft'}
                  </h3>
                  <p className="text-xs text-coinbase-muted">
                    {currentView === 'all-assets' ? 'Klik aset untuk edit atau lihat detail.' : 'Aset-aset berikut masih berupa draft dan belum dipublikasikan.'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative w-72">
                    <input 
                      type="text" 
                      placeholder="Cari aset..." 
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-white border border-coinbase-hairline rounded-lg text-sm outline-none focus:border-[#0052ff]"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                  </div>
                  
                  {/* Grid/List Toggle */}
                  <div className="flex bg-coinbase-surface-strong rounded-pill p-1 gap-1">
                      <button onClick={() => setAdminViewMode('grid')} className={`p-2 rounded-full transition-all ${adminViewMode === 'grid' ? 'bg-white shadow-soft text-coinbase-ink' : 'text-coinbase-muted hover:text-coinbase-ink'}`} title="Grid View">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                      </button>
                      <button onClick={() => setAdminViewMode('list')} className={`p-2 rounded-full transition-all ${adminViewMode === 'list' ? 'bg-white shadow-soft text-coinbase-ink' : 'text-coinbase-muted hover:text-coinbase-ink'}`} title="List View">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                      </button>
                  </div>

                  <button
                    onClick={() => { setEditingAsset(null); setCurrentView('admin-upload'); }}
                    className="px-4 py-2 bg-[#0052ff] text-white text-sm font-semibold rounded-lg hover:bg-[#003ecc] transition-colors flex items-center gap-2 whitespace-nowrap"
                  >
                    <span>+</span> Upload Aset
                  </button>
                </div>
              </div>

              {/* View per Business & Brands filtering pills */}
              <div className="bg-white p-4 rounded-xl border border-coinbase-hairline shadow-soft flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-coinbase-muted uppercase tracking-wider">Filter Berdasarkan Brand & Bisnis ({filteredAssets.length} Aset ditemukan)</span>
                  {selectedBrandId && (
                    <button 
                      onClick={() => setSelectedBrandId(null)}
                      className="text-xs text-coinbase-primary font-semibold hover:underline"
                    >
                      Reset Filter
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={() => setSelectedBrandId(null)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${!selectedBrandId ? 'bg-coinbase-ink border-coinbase-ink text-white' : 'bg-white border-coinbase-hairline text-coinbase-body hover:bg-coinbase-surface-strong hover:text-coinbase-ink'}`}
                  >
                    Semua Merek
                  </button>
                  {data.brands.map(brand => (
                    <button 
                      key={brand.id}
                      onClick={() => setSelectedBrandId(brand.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${selectedBrandId === brand.id ? 'bg-coinbase-ink border-coinbase-ink text-white' : 'bg-white border-coinbase-hairline text-coinbase-body hover:bg-coinbase-surface-strong hover:text-coinbase-ink'}`}
                    >
                      {brand.name}
                    </button>
                  ))}
                </div>
              </div>

              <AssetGrid 
                assets={filteredAssets} 
                brands={data.brands} 
                assetTypes={data.assetTypes} 
                onSelectAsset={(asset) => { setEditingAsset(asset); setCurrentView('admin-upload'); }}
                selectedAssetId={undefined}
                viewMode={adminViewMode}
                multiSelection={new Set()}
                onToggleSelection={() => {}}
                isAdmin={true}
                onSelectTimeline={(asset) => setSelectedTimelineAsset(asset)}
              />
            </div>
          ) : currentView === 'admin-requests' ? (
            <AdminRequestsPanel
              requests={assetRequests}
              brands={data.brands}
              assetTypes={data.assetTypes}
              onUpdateRequest={async (id, updates) => {
                const updated = await service.updateAssetRequest(id, updates);
                setAssetRequests(prev => prev.map(r => r.id === updated.id ? updated : r));
              }}
              onDeleteRequest={async (id) => {
                await service.deleteAssetRequest(id);
                setAssetRequests(prev => prev.filter(r => r.id !== id));
              }}
            />
          ) : (
            <AdminPanel 
              activeView={currentView as 'admin-upload' | 'admin-brands' | 'admin-types'}
              editingAsset={editingAsset}
              brands={data.brands} 
              assetTypes={data.assetTypes} 
              assets={data.assets}
              existingTags={Array.from(new Set(data.assets.flatMap(a => a.tags || [])))}
              onClose={() => { setCurrentView('all-assets'); setEditingAsset(null); }}
              onSaveAsset={handleSaveAsset}
              onAddBrand={async (b) => { const r = await service.createBrand(b); setData(p => ({ ...p, brands: [...p.brands, r] })); }}
              onUpdateBrand={async (b) => { const r = await service.updateBrand(b.id, b); setData(p => ({ ...p, brands: p.brands.map(x => x.id === r.id ? r : x) })); }}
              onDeleteBrand={async (id) => { if(confirm("Are you sure?")) { await service.deleteBrand(id); setData(p => ({ ...p, brands: p.brands.filter(b => b.id !== id) })); } }}
              onAddAssetType={async (t) => { const r = await service.createAssetType(t); setData(p => ({ ...p, assetTypes: [...p.assetTypes, r] })); }}
              onUpdateAssetType={async (t) => { const r = await service.updateAssetType(t.id, t); setData(p => ({ ...p, assetTypes: p.assetTypes.map(x => x.id === r.id ? r : x) })); }}
              onDeleteAssetType={async (id) => { if(confirm("Delete this format?")) { await service.deleteAssetType(id); setData(p => ({ ...p, assetTypes: p.assetTypes.filter(t => t.id !== id) })); } }}
              onReorderBrands={handleReorderBrands}
              onReorderTypes={handleReorderTypes}
            />
          )}
        </div>
      </main>

      {selectedTimelineAsset && (
        <div className="fixed inset-0 bg-[#0a0b0d]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-coinbase-hairline w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            <AssetTimelinePanel 
              asset={selectedTimelineAsset} 
              onClose={() => setSelectedTimelineAsset(null)} 
            />
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminApp;

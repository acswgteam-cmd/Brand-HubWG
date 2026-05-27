import React, { useState, useEffect, useMemo } from 'react';
import { Asset, Brand, AssetType, UserRole } from './types';
import * as service from './services/assetService';
import { isSupabaseConfigured, configError } from './services/supabaseClient';
import { LOGO_URL } from './constants';
import AssetGrid from './components/AssetGrid';
import AssetDetailsPanel from './components/AssetDetailsPanel';
import AdminPanel from './components/AdminPanel';
import LoginModal from './components/LoginModal';
import About from './components/About';

// Expanded View Types for Routing
type ViewType = 'about' | 'browse' | 'admin-upload' | 'admin-brands' | 'admin-types';

const App: React.FC = () => {
  const [data, setData] = useState<{assets: Asset[], brands: Brand[], assetTypes: AssetType[]}>({
    assets: [],
    brands: [],
    assetTypes: []
  });
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Navigation & UI State
  const [currentView, setCurrentView] = useState<ViewType>('about');
  const [activeBrandId, setActiveBrandId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // Filtering & Selection
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [multiSelection, setMultiSelection] = useState<Set<string>>(new Set());

  // Admin State
  const [role, setRole] = useState<UserRole>('VIEWER');
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  // Editing state for Admin Panel
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

  useEffect(() => {
    checkConfigAndLoad();
  }, []);

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
    } catch (error: any) {
      setErrorMsg(error?.message || "Database connection error.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAsset = async (assetData: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
    try {
      if (!assetData.id) assetData.sortOrder = data.assets.length;
      
      const saved = await service.upsertAsset(assetData);
      setData(prev => {
        const index = prev.assets.findIndex(a => a.id === saved.id);
        const newAssets = [...prev.assets];
        if (index >= 0) newAssets[index] = saved;
        else newAssets.push(saved);
        return { ...prev, assets: newAssets };
      });
      // Go back to browse after saving
      setCurrentView('browse');
      setEditingAsset(null);
      
      if (selectedAsset && selectedAsset.id === saved.id) {
          setSelectedAsset(saved);
      }
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
            if (selectedAsset?.id === assetId) setSelectedAsset(null);
            if (multiSelection.has(assetId)) {
                const newSet = new Set(multiSelection);
                newSet.delete(assetId);
                setMultiSelection(newSet);
            }
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

  const navigateToAdmin = (view: ViewType, assetToEdit: Asset | null = null) => {
      setEditingAsset(assetToEdit);
      setCurrentView(view);
      setSelectedAsset(null); // Close right sidebar to focus on admin task
  };

  const handleToggleSelection = (id: string) => {
      setMultiSelection(prev => {
          const newSet = new Set(prev);
          if (newSet.has(id)) newSet.delete(id);
          else newSet.add(id);
          return newSet;
      });
  };

  const handleDownloadSelected = () => {
      if (multiSelection.size === 0) return;
      const confirmDownload = window.confirm(`Download ${multiSelection.size} files? Note: Your browser may block multiple automatic downloads.`);
      if (!confirmDownload) return;

      const assetsToDownload = data.assets.filter(a => multiSelection.has(a.id));
      
      assetsToDownload.forEach((asset, index) => {
          setTimeout(() => {
              const link = document.createElement('a');
              link.href = service.getDownloadLink(asset.link);
              link.download = asset.title; // Hint, though often ignored by cross-origin
              link.target = "_blank";
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
          }, index * 500); // Stagger downloads
      });
  };

  const filteredAssets = useMemo(() => {
    return data.assets.filter(asset => {
      const matchesBrand = activeBrandId ? asset.brandId === activeBrandId : true;
      const matchesType = selectedType ? asset.typeId === selectedType : true;
      const matchesSearch = searchQuery 
        ? asset.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
          asset.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
        : true;
      return matchesBrand && matchesType && matchesSearch && asset.status === 'ACTIVE';
    }).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }, [data.assets, activeBrandId, selectedType, searchQuery]);

  const brandsByType = useMemo(() => ({
    ENTITAS: data.brands.filter(b => b.type === 'ENTITAS'),
    UNIT: data.brands.filter(b => b.type === 'UNIT')
  }), [data.brands]);

  // Sidebar Render Logic
  const renderBrandLink = (brand: Brand) => {
    const availableTypeIds = new Set(data.assets.filter(a => a.brandId === brand.id && a.status === 'ACTIVE').map(a => a.typeId));
    const availableTypes = data.assetTypes.filter(t => availableTypeIds.has(t.id));
    const isActive = activeBrandId === brand.id;

    return (
      <div key={brand.id} className="mb-2 group relative">
        <button 
          onClick={() => { setActiveBrandId(brand.id); setSelectedType(null); setCurrentView('browse'); }} 
          className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 group flex items-center gap-3
            ${isActive && !selectedType ? 'bg-coinbase-surface-strong text-coinbase-primary' : 'text-coinbase-body hover:bg-coinbase-surface-strong hover:text-coinbase-ink'}`}
        >
          {/* First letter Icon */}
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 font-semibold ${isActive ? 'bg-coinbase-primary text-white' : 'bg-coinbase-surface-strong text-coinbase-muted'}`}>
            {brand.name.charAt(0)}
          </div>
          
          {!isSidebarCollapsed && (
             <div className="flex-1 flex justify-between items-center overflow-hidden">
                 <span className="truncate">{brand.name}</span>
                 {availableTypes.length > 0 && isActive && <span className="text-[10px] opacity-50">▼</span>}
             </div>
          )}
          
          {/* Tooltip for Minimized State */}
          {isSidebarCollapsed && (
             <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-1.5 bg-coinbase-ink text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-[100] whitespace-nowrap">
                 {brand.name}
             </div>
          )}
        </button>
        
        {/* Submenu for Formats - Only when Expanded */}
        {isActive && availableTypes.length > 0 && !isSidebarCollapsed && (
          <div className="ml-10 mt-1 space-y-1">
            {availableTypes.map(type => (
               <button key={type.id} onClick={() => { setSelectedType(type.id); setCurrentView('browse'); }} className={`w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium transition-colors flex items-center gap-2 ${selectedType === type.id ? 'text-coinbase-primary bg-coinbase-surface-strong' : 'text-coinbase-muted hover:text-coinbase-ink hover:bg-coinbase-surface-strong'}`}>
                 <span className="opacity-70">{type.icon}</span><span className="truncate">{type.name}</span>
               </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderAdminLink = (view: ViewType, label: string, icon: React.ReactNode) => (
    <div className="relative group mb-2">
        <button 
            onClick={() => navigateToAdmin(view)} 
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center gap-3 ${currentView === view ? 'bg-coinbase-surface-strong text-coinbase-primary' : 'text-coinbase-body hover:bg-coinbase-surface-strong hover:text-coinbase-ink'}`}
        >
            <span className="w-6 h-6 flex items-center justify-center shrink-0 opacity-70">{icon}</span>
            {!isSidebarCollapsed && <span className="whitespace-nowrap">{label}</span>}
        </button>
        {isSidebarCollapsed && (
             <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-1.5 bg-coinbase-ink text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-[100] whitespace-nowrap">
                 {label}
             </div>
        )}
    </div>
  );

  if (loading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-coinbase-canvas">
      <div className="w-8 h-8 rounded-full animate-spin mb-4 border-2 border-coinbase-surface-strong border-t-coinbase-primary"></div>
      <p className="text-sm text-coinbase-muted font-medium">Loading Workspace...</p>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden relative bg-coinbase-canvas">
      
      {/* 1. Left Sidebar Navigation */}
      <aside 
         className={`flex-shrink-0 bg-coinbase-canvas flex flex-col transition-all duration-300 ease-in-out z-30 fixed lg:static h-full border-r border-coinbase-hairline
         ${isSidebarCollapsed ? 'w-[80px]' : 'w-72'}`}
      >
        <div className={`p-6 flex items-center h-[72px] ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
          <div className="flex items-center gap-3 cursor-pointer overflow-hidden" onClick={() => { setCurrentView('about'); setActiveBrandId(null); setSelectedType(null); setSelectedAsset(null); }}>
            <div className="w-8 h-8 bg-coinbase-primary rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold">
              WG
            </div>
            {!isSidebarCollapsed && (
                <div className="min-w-0">
                    <h1 className="text-[18px] font-normal tracking-[-0.02em] text-coinbase-ink leading-tight">BrandHub</h1>
                </div>
            )}
          </div>
          
          {!isSidebarCollapsed && (
             <button onClick={() => setIsSidebarCollapsed(true)} className="p-1.5 text-coinbase-muted hover:text-coinbase-ink hidden lg:block rounded-full hover:bg-coinbase-surface-strong transition-colors">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
             </button>
          )}
        </div>

        {/* Minimized Toggle */}
        {isSidebarCollapsed && (
            <div className="flex justify-center py-4">
                <button onClick={() => setIsSidebarCollapsed(false)} className="p-2 rounded-full text-coinbase-muted hover:text-coinbase-ink hover:bg-coinbase-surface-strong transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
                </button>
            </div>
        )}
        
        <nav className={`flex-1 p-4 space-y-1 no-scrollbar ${isSidebarCollapsed ? 'overflow-visible' : 'overflow-y-auto'}`}>
          {/* Main Navigation */}
          <div className="relative group mb-2">
            <button onClick={() => { setCurrentView('about'); setActiveBrandId(null); setSelectedType(null); setSelectedAsset(null); }} className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center gap-3 ${currentView === 'about' ? 'bg-coinbase-surface-strong text-coinbase-primary' : 'text-coinbase-body hover:bg-coinbase-surface-strong hover:text-coinbase-ink'}`}>
                <span className="text-lg w-6 text-center opacity-70">ℹ️</span>
                {!isSidebarCollapsed && <span>About</span>}
            </button>
            {isSidebarCollapsed && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-1.5 bg-coinbase-ink text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-[100] whitespace-nowrap">
                    About
                </div>
            )}
          </div>

          <div className="relative group mb-2">
            <button onClick={() => { setCurrentView('browse'); setActiveBrandId(null); }} className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center gap-3 ${currentView === 'browse' && !activeBrandId ? 'bg-coinbase-surface-strong text-coinbase-primary' : 'text-coinbase-body hover:bg-coinbase-surface-strong hover:text-coinbase-ink'}`}>
                <span className="text-lg w-6 text-center opacity-70">📂</span>
                {!isSidebarCollapsed && <span>All Assets</span>}
            </button>
            {isSidebarCollapsed && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-1.5 bg-coinbase-ink text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-[100] whitespace-nowrap">
                    All Assets
                </div>
            )}
          </div>
          
          {/* Admin Menu Section */}
          {role === 'ADMIN' && (
            <div className="mt-8 mb-4">
                {!isSidebarCollapsed && <div className="px-3 pb-3 text-xs text-coinbase-muted font-semibold tracking-wide">Admin Menu</div>}
                {isSidebarCollapsed && <div className="h-6"></div>}
                <div className="space-y-1">
                    {renderAdminLink('admin-upload', 'Upload Asset', (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4 4m0 0L8 8m4-4v12" /></svg>
                    ))}
                    {renderAdminLink('admin-brands', 'Manage Entities', (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                    ))}
                    {renderAdminLink('admin-types', 'Manage Formats', (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                    ))}
                </div>
            </div>
          )}

          {/* Browse Section */}
          <div className="mt-8 mb-4">
             {!isSidebarCollapsed && <div className="px-3 pb-3 text-xs text-coinbase-muted font-semibold tracking-wide">Holding</div>}
          </div>
          {brandsByType.ENTITAS.map(renderBrandLink)}
          
          <div className="mt-8 mb-4">
             {!isSidebarCollapsed && <div className="px-3 pb-3 text-xs text-coinbase-muted font-semibold tracking-wide">Business Units</div>}
          </div>
          {brandsByType.UNIT.map(renderBrandLink)}
        </nav>

        <div className="p-6 relative group border-t border-coinbase-hairline">
          <button onClick={() => { role === 'ADMIN' ? setRole('VIEWER') : setShowLoginModal(true); }} className={`w-full py-3 px-4 rounded-pill text-[13px] font-semibold transition-colors whitespace-nowrap overflow-hidden flex items-center justify-center gap-2 ${role === 'ADMIN' ? 'text-ship-red bg-coinbase-surface-soft hover:bg-coinbase-surface-strong' : 'text-coinbase-ink bg-coinbase-surface-soft hover:bg-coinbase-surface-strong'}`}>
            {isSidebarCollapsed ? (role === 'ADMIN' ? '🔓' : '🔒') : (role === 'ADMIN' ? 'Exit Admin' : 'Admin Login')}
          </button>
          {isSidebarCollapsed && (
             <div className="absolute left-full top-6 ml-2 px-3 py-1.5 bg-coinbase-ink text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-[100] whitespace-nowrap">
                 {role === 'ADMIN' ? 'Logout' : 'Admin Login'}
             </div>
          )}
        </div>
      </aside>

      {/* 2. Main Content Area */}
      <main className={`flex-1 flex flex-col min-w-0 overflow-hidden relative bg-coinbase-surface-soft transition-all duration-300 ${isSidebarCollapsed && window.innerWidth < 1024 ? 'ml-[80px]' : 'ml-0'}`}>
        <header className="h-[72px] px-8 lg:px-12 flex items-center gap-6 shrink-0 transition-all justify-between bg-coinbase-canvas border-b border-coinbase-hairline">
          
          {/* Breadcrumb / Title */}
          <div className="flex-1 min-w-0 flex items-center">
             {currentView === 'about' ? (
                <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-coinbase-ink">About Us</h2>
             ) : currentView === 'browse' ? (
                <div className="flex items-center gap-4">
                   <div className="flex items-center gap-2 text-[15px] text-coinbase-muted truncate">
                      <span className="hover:text-coinbase-ink cursor-pointer transition-colors" onClick={() => setActiveBrandId(null)}>Browse</span>
                      <span className="text-coinbase-hairline">/</span>
                      <span className="text-coinbase-ink font-semibold truncate">{activeBrandId ? data.brands.find(b => b.id === activeBrandId)?.name : 'All Assets'}</span>
                   </div>
                   
                   {/* Multi Select Download Button + Clear Selection */}
                   {multiSelection.size > 0 && (
                       <div className="flex items-center gap-2 ml-4">
                           <button 
                             onClick={handleDownloadSelected}
                             className="px-4 py-2 bg-coinbase-primary text-white text-[13px] font-semibold rounded-pill hover:bg-coinbase-primary-active transition-colors flex items-center gap-2"
                           >
                               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                               Download ({multiSelection.size})
                           </button>
                           <button 
                             onClick={() => setMultiSelection(new Set())}
                             className="p-2 rounded-full text-coinbase-muted hover:text-coinbase-ink hover:bg-coinbase-surface-strong transition-colors"
                             title="Clear Selection"
                           >
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                           </button>
                       </div>
                   )}
                </div>
             ) : (
                <div className="flex items-center gap-2 text-[15px] text-coinbase-muted">
                   <span>Admin</span>
                   <span className="text-coinbase-hairline">/</span>
                   <span className="text-coinbase-ink font-semibold">{currentView === 'admin-upload' ? 'Upload' : currentView === 'admin-brands' ? 'Entities' : 'Formats'}</span>
                </div>
             )}
          </div>

          <div className="flex items-center gap-4">
             {/* Search */}
             <div className="relative w-48 lg:w-72 group hidden md:block">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-coinbase-muted group-focus-within:text-coinbase-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input type="text" placeholder="Search..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); if(currentView === 'about' && e.target.value) setCurrentView('browse'); }} className="w-full pl-10 pr-4 py-2.5 bg-coinbase-surface-strong rounded-pill text-[15px] outline-none transition-all placeholder:text-coinbase-muted focus:ring-2 focus:ring-coinbase-primary/20 focus:bg-white" />
             </div>

             {/* View Toggle */}
             {currentView === 'browse' && (
               <div className="flex bg-coinbase-surface-strong rounded-pill p-1 gap-1">
                   <button onClick={() => setViewMode('grid')} className={`p-2 rounded-full transition-all ${viewMode === 'grid' ? 'bg-white shadow-soft text-coinbase-ink' : 'text-coinbase-muted hover:text-coinbase-ink'}`} title="Grid View">
                       <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                   </button>
                   <button onClick={() => setViewMode('list')} className={`p-2 rounded-full transition-all ${viewMode === 'list' ? 'bg-white shadow-soft text-coinbase-ink' : 'text-coinbase-muted hover:text-coinbase-ink'}`} title="List View">
                       <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                   </button>
               </div>
             )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-8 lg:px-12 pb-24">
          {currentView === 'about' ? (
            <About 
              assets={data.assets} 
              brands={data.brands} 
              assetTypes={data.assetTypes}
              onNavigateToAsset={(asset) => { setActiveBrandId(asset.brandId); setCurrentView('browse'); setSelectedAsset(asset); }}
              isAdmin={role === 'ADMIN'}
            />
          ) : currentView === 'browse' ? (
            <div className="flex flex-col gap-8 pt-10">
               {/* Filters */}
               <div className="flex flex-col gap-6">
                 <div>
                   <h1 className="text-[36px] font-normal tracking-[-0.01em] text-coinbase-ink mb-2">
                     {activeBrandId ? data.brands.find(b => b.id === activeBrandId)?.name : (searchQuery ? `"${searchQuery}"` : 'Library Assets')}
                   </h1>
                   <div className="flex items-center gap-3">
                      <span className="text-[18px] text-coinbase-muted font-mono">{filteredAssets.length} results</span>
                      {selectedType && (
                        <span className="px-3 py-1 bg-coinbase-surface-strong text-coinbase-ink rounded-pill text-[13px] font-semibold flex items-center gap-2">
                           {data.assetTypes.find(t => t.id === selectedType)?.name} 
                           <button onClick={() => setSelectedType(null)} className="hover:text-coinbase-primary transition-colors text-coinbase-muted">✕</button>
                        </span>
                      )}
                   </div>
                 </div>

                 {/* Minimalist Tab Filters */}
                 <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                    <button onClick={() => setSelectedType(null)} className={`px-4 py-2.5 rounded-pill text-[15px] font-medium transition-all ${!selectedType ? 'bg-coinbase-ink text-white' : 'bg-coinbase-canvas text-coinbase-body hover:bg-coinbase-surface-strong hover:text-coinbase-ink border border-coinbase-hairline'}`}>
                       All Formats
                    </button>
                    {data.assetTypes.map(type => (
                      <button key={type.id} onClick={() => setSelectedType(type.id)} className={`px-4 py-2.5 rounded-pill text-[15px] font-medium transition-all flex items-center gap-2 ${selectedType === type.id ? 'bg-coinbase-ink text-white' : 'bg-coinbase-canvas text-coinbase-body hover:bg-coinbase-surface-strong hover:text-coinbase-ink border border-coinbase-hairline'}`}>
                        <span className="opacity-70">{type.icon}</span> {type.name}
                      </button>
                    ))}
                 </div>
               </div>

               <AssetGrid 
                 assets={filteredAssets} 
                 brands={data.brands} 
                 assetTypes={data.assetTypes} 
                 onSelectAsset={setSelectedAsset}
                 selectedAssetId={selectedAsset?.id}
                 viewMode={viewMode}
                 multiSelection={multiSelection}
                 onToggleSelection={handleToggleSelection}
               />
            </div>
          ) : (
            // Admin Views rendered here
            <div className="pt-10">
               <AdminPanel 
                 activeView={currentView as 'admin-upload' | 'admin-brands' | 'admin-types'}
                 editingAsset={editingAsset}
                 brands={data.brands} 
                 assetTypes={data.assetTypes} 
                 onClose={() => setCurrentView('browse')}
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
            </div>
          )}
        </div>
      </main>

      {/* 3. Right Sidebar Details Panel */}
      <aside 
        className={`flex-shrink-0 bg-coinbase-canvas border-l border-coinbase-hairline transition-all duration-300 ease-out overflow-hidden z-20 ${selectedAsset ? 'w-[420px]' : 'w-0'}`}
      >
         {selectedAsset && (
            <div className="w-[420px] h-full">
              <AssetDetailsPanel 
                asset={selectedAsset}
                brands={data.brands}
                assetTypes={data.assetTypes}
                onClose={() => setSelectedAsset(null)}
                onUpdate={(updated) => handleSaveAsset(updated)}
                onDelete={(id) => handleDeleteAsset(id)}
                isAdmin={role === 'ADMIN'}
              />
            </div>
         )}
      </aside>

      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} onLogin={async (e, p) => { if(e==='admin@werkudara.com' && p==='admin123'){ setRole('ADMIN'); setShowLoginModal(false); return true; } return false; }} />}
    </div>
  );
};

export default App;

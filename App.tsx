import React, { useState, useEffect, useMemo } from 'react';
import { Asset, Brand, AssetType } from './types';
import * as service from './services/assetService';
import { isSupabaseConfigured, configError } from './services/supabaseClient';
import AssetGrid from './components/AssetGrid';
import AssetDetailsPanel from './components/AssetDetailsPanel';
import Dashboard from './components/Dashboard';
import RequestAssetPanel from './components/RequestAssetPanel';

// Expanded View Types for Routing
type ViewType = 'dashboard' | 'browse' | 'request-assets';

const App: React.FC = () => {
  const [data, setData] = useState<{assets: Asset[], brands: Brand[], assetTypes: AssetType[]}>({
    assets: [],
    brands: [],
    assetTypes: []
  });
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Navigation & UI State
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [activeBrandId, setActiveBrandId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(typeof window !== 'undefined' ? window.innerWidth < 1024 : false);
  
  // Filtering & Selection
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [multiSelection, setMultiSelection] = useState<Set<string>>(new Set());
  const [showAllBrandsGrid, setShowAllBrandsGrid] = useState(false);

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
      return matchesBrand && matchesType && matchesSearch && asset.status === 'PUBLISHED';
    }).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }, [data.assets, activeBrandId, selectedType, searchQuery]);

  // Sidebar Render Logic
  const renderBrandLink = (brand: Brand) => {
    const availableTypeIds = new Set(data.assets.filter(a => a.brandId === brand.id && a.status === 'PUBLISHED').map(a => a.typeId));
    const availableTypes = data.assetTypes.filter(t => availableTypeIds.has(t.id));
    const isActive = activeBrandId === brand.id;

    return (
      <div key={brand.id} className="mb-2 group relative">
        <button 
          onClick={() => { setActiveBrandId(brand.id); setSelectedType(null); setCurrentView('browse'); if (window.innerWidth < 1024) setIsSidebarCollapsed(true); }} 
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
               <button key={type.id} onClick={() => { setSelectedType(type.id); setCurrentView('browse'); if (window.innerWidth < 1024) setIsSidebarCollapsed(true); }} className={`w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium transition-colors flex items-center gap-2 ${selectedType === type.id ? 'text-coinbase-primary bg-coinbase-surface-strong' : 'text-coinbase-muted hover:text-coinbase-ink hover:bg-coinbase-surface-strong'}`}>
                 <span className="opacity-70">{type.icon}</span><span className="truncate">{type.name}</span>
               </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-coinbase-canvas">
      <div className="w-8 h-8 rounded-full animate-spin mb-4 border-2 border-coinbase-surface-strong border-t-coinbase-primary"></div>
      <p className="text-sm text-coinbase-muted font-medium">Loading Workspace...</p>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden relative bg-coinbase-canvas">
      
      {/* Backdrop for Mobile */}
      {!isSidebarCollapsed && (
        <div 
          className="fixed inset-0 bg-black/40 z-30 lg:hidden backdrop-blur-xs transition-opacity duration-300"
          onClick={() => setIsSidebarCollapsed(true)}
        />
      )}

      {/* 1. Left Sidebar Navigation */}
      <aside 
         className={`flex-shrink-0 bg-coinbase-canvas flex flex-col transition-all duration-300 ease-in-out z-40 lg:z-30 fixed lg:static h-full border-r border-coinbase-hairline
         ${isSidebarCollapsed ? '-translate-x-full lg:translate-x-0 lg:w-[80px]' : 'translate-x-0 w-72 shadow-2xl lg:shadow-none'}`}
      >
        <div className={`p-6 flex items-center h-[72px] ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
          <div className="flex items-center gap-3 cursor-pointer overflow-hidden" onClick={() => { setCurrentView('dashboard'); setActiveBrandId(null); setSelectedType(null); setSelectedAsset(null); if (window.innerWidth < 1024) setIsSidebarCollapsed(true); }}>
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
             <>
               <button onClick={() => setIsSidebarCollapsed(true)} className="p-1.5 text-coinbase-muted hover:text-coinbase-ink hidden lg:block rounded-full hover:bg-coinbase-surface-strong transition-colors">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
               </button>
               <button onClick={() => setIsSidebarCollapsed(true)} className="p-1.5 text-coinbase-muted hover:text-coinbase-ink lg:hidden rounded-full hover:bg-coinbase-surface-strong transition-colors">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
               </button>
             </>
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
            <button onClick={() => { setCurrentView('dashboard'); setActiveBrandId(null); setSelectedType(null); setSelectedAsset(null); if (window.innerWidth < 1024) setIsSidebarCollapsed(true); }} className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center gap-3 ${currentView === 'dashboard' ? 'bg-coinbase-surface-strong text-coinbase-primary' : 'text-coinbase-body hover:bg-coinbase-surface-strong hover:text-coinbase-ink'}`}>
                <span className="text-lg w-6 text-center opacity-70">📊</span>
                {!isSidebarCollapsed && <span>Dashboard</span>}
            </button>
            {isSidebarCollapsed && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-1.5 bg-coinbase-ink text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-[100] whitespace-nowrap">
                    Dashboard
                </div>
            )}
          </div>

          <div className="relative group mb-2">
            <button onClick={() => { setCurrentView('browse'); setActiveBrandId(null); if (window.innerWidth < 1024) setIsSidebarCollapsed(true); }} className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center gap-3 ${currentView === 'browse' && !activeBrandId ? 'bg-coinbase-surface-strong text-coinbase-primary' : 'text-coinbase-body hover:bg-coinbase-surface-strong hover:text-coinbase-ink'}`}>
                <span className="text-lg w-6 text-center opacity-70">📂</span>
                {!isSidebarCollapsed && <span>All Assets</span>}
            </button>
            {isSidebarCollapsed && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-1.5 bg-coinbase-ink text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-[100] whitespace-nowrap">
                    All Assets
                </div>
            )}
          </div>

          <div className="relative group mb-2">
            <button onClick={() => { setCurrentView('request-assets'); setActiveBrandId(null); setSelectedAsset(null); if (window.innerWidth < 1024) setIsSidebarCollapsed(true); }} className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center gap-3 ${currentView === 'request-assets' ? 'bg-coinbase-surface-strong text-coinbase-primary' : 'text-coinbase-body hover:bg-coinbase-surface-strong hover:text-coinbase-ink'}`}>
                <span className="text-lg w-6 text-center opacity-70">📋</span>
                {!isSidebarCollapsed && <span>Request Aset</span>}
            </button>
            {isSidebarCollapsed && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-1.5 bg-coinbase-ink text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-[100] whitespace-nowrap">
                    Request Aset
                </div>
            )}
          </div>

          {/* Browse Section */}
          <div className="mt-8 mb-4">
             {!isSidebarCollapsed && <div className="px-3 pb-3 text-xs text-coinbase-muted font-semibold tracking-wide uppercase">Business & Brands</div>}
          </div>
          {[...data.brands].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)).map(renderBrandLink)}
        </nav>
      </aside>

      {/* 2. Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-coinbase-surface-soft">
        <header className="h-[72px] px-6 lg:px-12 flex items-center gap-4 shrink-0 transition-all justify-between bg-coinbase-canvas border-b border-coinbase-hairline">
          
          {/* Hamburger trigger for mobile */}
          {isSidebarCollapsed && (
            <button 
              onClick={() => setIsSidebarCollapsed(false)} 
              className="p-2 -ml-2 text-coinbase-muted hover:text-coinbase-ink lg:hidden rounded-full hover:bg-coinbase-surface-strong transition-colors shrink-0"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
          )}
          
          {/* Breadcrumb / Title */}
          <div className="flex-1 min-w-0 flex items-center">
             {currentView === 'dashboard' ? (
                <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-coinbase-ink">Dashboard</h2>
             ) : currentView === 'request-assets' ? (
                <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-coinbase-ink">Request Aset</h2>
             ) : (
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
             )}
          </div>

          <div className="flex items-center gap-4">
             {/* Search */}
             <div className="relative w-48 lg:w-72 group hidden md:block">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-coinbase-muted group-focus-within:text-coinbase-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input type="text" placeholder="Search..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); if(currentView === 'dashboard' && e.target.value) setCurrentView('browse'); }} className="w-full pl-10 pr-4 py-2.5 bg-coinbase-surface-strong rounded-pill text-[15px] outline-none transition-all placeholder:text-coinbase-muted focus:ring-2 focus:ring-coinbase-primary/20 focus:bg-white" />
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
          {currentView === 'dashboard' ? (
            <Dashboard 
              assets={data.assets} 
              brands={data.brands} 
              assetTypes={data.assetTypes}
              onNavigateToAsset={(asset) => { setActiveBrandId(asset.brandId); setCurrentView('browse'); setSelectedAsset(asset); }}
            />
          ) : currentView === 'request-assets' ? (
            <RequestAssetPanel
              brands={data.brands}
              assetTypes={data.assetTypes}
            />
          ) : (
            <div className="flex flex-col gap-8 pt-10">
               
               {/* Business & Brands Section */}
               <div className="border-b border-coinbase-hairline pb-8">
                 <div className="flex items-center justify-between mb-6">
                    <h2 className="text-[20px] font-bold text-coinbase-ink tracking-tight">Business & Brands</h2>
                    
                    {activeBrandId ? (
                      <button 
                        onClick={() => { setActiveBrandId(null); setSelectedType(null); }} 
                        className="text-[13px] font-semibold text-coinbase-primary hover:text-coinbase-primary-active transition-colors flex items-center gap-1"
                      >
                        ✕ Clear Filter
                      </button>
                    ) : (
                      <button 
                        onClick={() => setShowAllBrandsGrid(!showAllBrandsGrid)} 
                        className="text-[13px] font-semibold text-coinbase-primary hover:text-coinbase-primary-active transition-colors flex items-center gap-1"
                      >
                        {showAllBrandsGrid ? 'Show Less' : 'View all'}
                      </button>
                    )}
                 </div>

                 <div className={showAllBrandsGrid 
                    ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4" 
                    : "flex gap-4 overflow-x-auto pb-4 no-scrollbar scroll-smooth snap-x"
                 }>
                    {/* Brands list */}
                    {[...data.brands].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)).map(brand => {
                      const brandAssets = data.assets.filter(a => a.brandId === brand.id && a.status === 'PUBLISHED');
                      const assetCount = brandAssets.length;
                      const isActive = activeBrandId === brand.id;
                      
                      // Find logo or first valid image asset to use as thumbnail
                      const logoAsset = brandAssets.find(a => 
                        a.title.toLowerCase().includes('logo') || 
                        a.tags.some(t => t.toLowerCase().includes('logo'))
                      ) || brandAssets.find(a => 
                        a.link && (a.link.startsWith('data:image') || a.link.match(/\.(jpeg|jpg|gif|png|svg)/i))
                      ) || brandAssets[0];

                      // Use getThumbnailUrl to support Google Drive thumbnails without breaking images
                      const previewUrl = logoAsset ? (service.getThumbnailUrl(logoAsset.link) || service.getPreviewLink(logoAsset.link)) : null;
                      
                      // Get custom visual styling fallback
                      const getBrandVisual = (name: string) => {
                        const low = name.toLowerCase();
                        if (low.includes('werkudara')) {
                          return { bg: 'bg-gradient-to-tr from-[#003ecc] to-[#0052ff]' };
                        } else if (low.includes('takshaka') || low.includes('tarkuara')) {
                          return { bg: 'bg-gradient-to-tr from-[#0b0e14] to-[#1a2333]' };
                        } else if (low.includes('atibhagya')) {
                          return { bg: 'bg-gradient-to-tr from-[#0b331e] to-[#145a32]' };
                        } else if (low.includes('travel') || low.includes('wisata')) {
                          return { bg: 'bg-gradient-to-tr from-[#1f3c3d] to-[#326263]' };
                        }
                        
                        const colors = [
                          { bg: 'bg-gradient-to-tr from-[#cf202f] to-[#ff4d4d]' },
                          { bg: 'bg-gradient-to-tr from-[#7b1fa2] to-[#ab47bc]' },
                          { bg: 'bg-gradient-to-tr from-[#e65100] to-[#ff9800]' },
                          { bg: 'bg-gradient-to-tr from-[#006064] to-[#00acc1]' },
                        ];
                        let hash = 0;
                        for (let i = 0; i < name.length; i++) {
                          hash = name.charCodeAt(i) + ((hash << 5) - hash);
                        }
                        return colors[Math.abs(hash) % colors.length];
                      };

                      const visual = getBrandVisual(brand.name);

                      return (
                        <div 
                          key={brand.id}
                          onClick={() => { setActiveBrandId(brand.id); setSelectedType(null); }}
                          className={`cursor-pointer rounded-xl border transition-all overflow-hidden flex flex-col group ${isActive ? 'border-coinbase-primary ring-2 ring-coinbase-primary/10 shadow-soft' : 'border-coinbase-hairline hover:border-coinbase-muted hover:shadow-soft'} ${showAllBrandsGrid ? 'w-full' : 'w-60 shrink-0 snap-start'}`}
                        >
                          <div className="h-28 bg-[#f7f7f7] flex items-center justify-center relative overflow-hidden">
                            {previewUrl ? (
                              <img 
                                src={previewUrl} 
                                alt={brand.name} 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                              />
                            ) : (
                              <div className={`w-full h-full ${visual.bg} flex items-center justify-center`}>
                                <span className="text-3xl text-white font-black tracking-wider uppercase opacity-85 group-hover:scale-110 transition-transform duration-300">
                                  {brand.name.charAt(0)}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="p-4 bg-white flex-1 flex flex-col justify-between">
                            <h4 className="font-semibold text-coinbase-ink text-[14px] leading-snug group-hover:text-coinbase-primary transition-colors truncate" title={brand.name}>
                              {brand.name}
                            </h4>
                            <span className="text-[11px] text-coinbase-muted font-mono mt-1 block">{assetCount} assets</span>
                          </div>
                        </div>
                      );
                    })}
                 </div>
               </div>

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
                onUpdate={() => {}}
                onDelete={() => {}}
                isAdmin={false}
                onEdit={undefined}
              />
            </div>
         )}
      </aside>
    </div>
  );
};

export default App;

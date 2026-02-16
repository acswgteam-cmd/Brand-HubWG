
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
        } catch (error: any) {
            alert("Failed to delete asset: " + error.message);
        }
    }
  };
  
  // Re-use logic for reordering...
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
      <div key={brand.id} className="mb-1 group relative">
        <button 
          onClick={() => { setActiveBrandId(brand.id); setSelectedType(null); setCurrentView('browse'); }} 
          className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-bold flex items-center gap-3 transition-all duration-200 
            ${isActive && !selectedType ? 'bg-wg-honorable text-white shadow-lg shadow-wg-honorable/20' : 'text-slate-500 hover:bg-slate-100'}`}
          title={isSidebarCollapsed ? brand.name : undefined}
        >
          {/* Mock Icon if none exists, just first letter */}
          <div className={`w-6 h-6 rounded flex items-center justify-center text-[10px] shrink-0 font-black ${isActive ? 'bg-white text-wg-honorable' : 'bg-slate-200 text-slate-500'}`}>
            {brand.name.charAt(0)}
          </div>
          {!isSidebarCollapsed && (
             <div className="flex-1 flex justify-between items-center overflow-hidden">
                <span className="truncate">{brand.name}</span>
                {availableTypes.length > 0 && isActive && <span className="text-[9px] opacity-70">▼</span>}
             </div>
          )}
        </button>
        
        {/* Submenu for Formats */}
        {isActive && availableTypes.length > 0 && !isSidebarCollapsed && (
          <div className="ml-9 mt-1 space-y-0.5 animate-fade-in-up">
            {availableTypes.map(type => (
               <button key={type.id} onClick={() => { setSelectedType(type.id); setCurrentView('browse'); }} className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${selectedType === type.id ? 'text-wg-honorable bg-wg-honorable/10' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>
                 <span>{type.icon}</span><span className="truncate">{type.name}</span>
               </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-[#F9F9F8]">
      <div className="w-12 h-12 border-4 border-slate-200 border-t-wg-honorable rounded-full animate-spin mb-4"></div>
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 animate-pulse">Loading Brand Hub...</p>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden relative">
      
      {/* 1. Left Sidebar Navigation (Minimizable) */}
      <aside className={`flex-shrink-0 bg-white border-r border-slate-200 flex flex-col transition-all duration-300 ease-in-out z-20 ${isSidebarCollapsed ? 'w-20' : 'w-72'}`}>
        <div className={`p-6 border-b border-slate-100 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
          <div className="flex items-center gap-3 cursor-pointer overflow-hidden" onClick={() => { setCurrentView('about'); setActiveBrandId(null); setSelectedType(null); setSelectedAsset(null); }}>
            <div className="w-10 h-10 bg-wg-honorable rounded-xl flex items-center justify-center shadow-lg shadow-wg-honorable/20 shrink-0">
              <img src={LOGO_URL} className="w-full h-full object-cover" />
            </div>
            {!isSidebarCollapsed && (
              <div className="min-w-0">
                <h1 className="text-base font-extrabold tracking-tight text-slate-900 leading-tight">Brand-Hub</h1>
                <span className="text-[9px] font-black text-wg-honorable uppercase tracking-widest truncate block">Werkudara Group</span>
              </div>
            )}
          </div>
          
          {!isSidebarCollapsed && (
             <button onClick={() => setIsSidebarCollapsed(true)} className="p-1.5 text-slate-300 hover:text-slate-600">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
             </button>
          )}
        </div>

        {/* Minimized Toggle Button (only when collapsed) */}
        {isSidebarCollapsed && (
            <button onClick={() => setIsSidebarCollapsed(false)} className="mx-auto mt-4 p-2 bg-slate-100 rounded-full text-slate-400 hover:text-slate-600">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
            </button>
        )}
        
        <nav className="flex-1 overflow-y-auto p-4 space-y-1 no-scrollbar">
          <button onClick={() => { setCurrentView('about'); setActiveBrandId(null); setSelectedType(null); setSelectedAsset(null); }} className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-bold flex items-center gap-3 transition-all duration-200 ${currentView === 'about' ? 'bg-wg-honorable text-white shadow-lg shadow-wg-honorable/20' : 'text-slate-500 hover:bg-slate-100'}`} title="About">
            <span className="text-lg">ℹ️</span>
            {!isSidebarCollapsed && <span>About</span>}
          </button>
          <button onClick={() => { setCurrentView('browse'); setActiveBrandId(null); }} className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-bold flex items-center gap-3 transition-all duration-200 ${currentView === 'browse' && !activeBrandId ? 'bg-wg-honorable text-white shadow-lg shadow-wg-honorable/20' : 'text-slate-500 hover:bg-slate-100'}`} title="All Assets">
            <span className="text-lg">📂</span>
            {!isSidebarCollapsed && <span>All Assets</span>}
          </button>
          
          {!isSidebarCollapsed && <div className="pt-6 pb-2 px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Holding</div>}
          {isSidebarCollapsed && <div className="h-4"></div>}
          {brandsByType.ENTITAS.map(renderBrandLink)}
          
          {!isSidebarCollapsed && <div className="pt-6 pb-2 px-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Business Units</div>}
          {isSidebarCollapsed && <div className="h-4"></div>}
          {brandsByType.UNIT.map(renderBrandLink)}
        </nav>

        <div className="p-4 border-t border-slate-100 space-y-2">
          {role === 'ADMIN' && (
             <div className={`grid gap-2 mb-2 ${isSidebarCollapsed ? 'grid-cols-1' : 'grid-cols-2'}`}>
               <button onClick={() => navigateToAdmin('admin-brands')} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-[9px] font-bold text-slate-600 uppercase border border-slate-200 text-center" title="Entities">
                  {isSidebarCollapsed ? '🏢' : 'Entities'}
               </button>
               <button onClick={() => navigateToAdmin('admin-types')} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-[9px] font-bold text-slate-600 uppercase border border-slate-200 text-center" title="Formats">
                  {isSidebarCollapsed ? '🏷️' : 'Formats'}
               </button>
             </div>
          )}
          <button onClick={() => { role === 'ADMIN' ? setRole('VIEWER') : setShowLoginModal(true); }} className={`w-full p-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-center border transition-all hover:scale-[1.02] active:scale-[0.98] ${role === 'ADMIN' ? 'text-wg-burgundy border-wg-burgundy/20 bg-wg-burgundy/5' : 'text-wg-honorable border-wg-honorable/20 hover:bg-wg-honorable/5'}`}>
            {isSidebarCollapsed ? (role === 'ADMIN' ? '🔓' : '🔒') : (role === 'ADMIN' ? 'Exit Admin' : 'Admin Login')}
          </button>
        </div>
      </aside>

      {/* 2. Main Content Area - Flex Grow */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-[#F9F9F8]">
        <header className="h-20 px-8 flex items-center gap-6 shrink-0 transition-all border-b border-transparent">
          {/* Breadcrumb / Title */}
          <div className="flex-1">
             {currentView === 'about' ? (
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">About Us</h2>
             ) : currentView === 'browse' ? (
                <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
                   <span>Browse</span>
                   <span className="text-slate-300">/</span>
                   <span className="text-slate-900">{activeBrandId ? data.brands.find(b => b.id === activeBrandId)?.name : 'All Assets'}</span>
                </div>
             ) : (
                <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
                   <span>Admin</span>
                </div>
             )}
          </div>

          <div className="relative w-64 group hidden md:block">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-wg-honorable transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input type="text" placeholder="Search..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); if(currentView === 'about' && e.target.value) setCurrentView('browse'); }} className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-full text-sm font-medium outline-none focus:ring-4 focus:ring-wg-honorable/10 transition-all" />
          </div>

          {role === 'ADMIN' && currentView === 'browse' && (
            <button onClick={() => navigateToAdmin('admin-upload')} className="px-6 py-2.5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-xl hover:bg-black transition-all active:scale-95 hover:shadow-2xl">
              Upload New
            </button>
          )}
        </header>

        <div className="flex-1 overflow-y-auto px-8 pb-10">
          {currentView === 'about' ? (
            <About 
              assets={data.assets} 
              brands={data.brands} 
              assetTypes={data.assetTypes}
              onNavigateToAsset={(asset) => { setActiveBrandId(asset.brandId); setCurrentView('browse'); setSelectedAsset(asset); }}
              isAdmin={role === 'ADMIN'}
            />
          ) : currentView === 'browse' ? (
            <div className="flex flex-col gap-6 pt-6">
               {/* Filters & Title Header */}
               <div className="flex flex-col gap-4">
                 <div>
                   <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">
                     {activeBrandId ? data.brands.find(b => b.id === activeBrandId)?.name : (searchQuery ? `"${searchQuery}"` : 'Library Assets')}
                   </h1>
                   <div className="flex items-center gap-3">
                      <span className="px-2.5 py-0.5 bg-slate-200 rounded text-[10px] font-bold text-slate-500 uppercase">{filteredAssets.length} Items</span>
                      {selectedType && (
                        <span className="px-2.5 py-0.5 bg-wg-honorable text-white rounded text-[10px] font-bold uppercase flex items-center gap-2">
                           {data.assetTypes.find(t => t.id === selectedType)?.name} 
                           <button onClick={() => setSelectedType(null)} className="hover:text-white/70">✕</button>
                        </span>
                      )}
                   </div>
                 </div>

                 {/* Minimalist Tab Filters */}
                 <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                    <button onClick={() => setSelectedType(null)} className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${!selectedType ? 'bg-slate-900 text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                       All Formats
                    </button>
                    {data.assetTypes.map(type => (
                      <button key={type.id} onClick={() => setSelectedType(type.id)} className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${selectedType === type.id ? 'bg-slate-900 text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                        <span>{type.icon}</span> {type.name}
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
               />
            </div>
          ) : (
            // Admin Views rendered here instead of Modal
            <div className="pt-6">
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

      {/* 3. Right Sidebar Details Panel (Responsive Flex Item) */}
      <aside 
        className={`flex-shrink-0 bg-white border-l border-slate-200 transition-all duration-300 ease-out overflow-hidden ${selectedAsset ? 'w-[400px]' : 'w-0'}`}
      >
         {selectedAsset && (
            <div className="w-[400px] h-full">
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

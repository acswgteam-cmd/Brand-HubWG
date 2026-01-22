
import React, { useState, useEffect, useMemo } from 'react';
import { Asset, Brand, AssetType, UserRole } from './types';
import * as service from './services/assetService';
import { isSupabaseConfigured, configError } from './services/supabaseClient';
import { LOGO_URL } from './constants';
import AssetGrid from './components/AssetGrid';
import PreviewModal from './components/PreviewModal';
import AdminPanel from './components/AdminPanel';
import LoginModal from './components/LoginModal';

const App: React.FC = () => {
  const [data, setData] = useState<{assets: Asset[], brands: Brand[], assetTypes: AssetType[]}>({
    assets: [],
    brands: [],
    assetTypes: []
  });
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeBrandId, setActiveBrandId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isAddingAsset, setIsAddingAsset] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [role, setRole] = useState<UserRole>('VIEWER');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

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
      
      // Ensure everything has a unique sortOrder if it's missing (all 0s)
      const sanitizedAssets = result.assets.map((a, i) => ({
        ...a,
        sortOrder: a.sortOrder || i
      }));
      const sanitizedBrands = result.brands.map((b, i) => ({
        ...b,
        sortOrder: b.sortOrder || i
      }));
      const sanitizedTypes = result.assetTypes.map((t, i) => ({
        ...t,
        sortOrder: t.sortOrder || i
      }));

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
      // If new asset, put it at the end
      if (!assetData.id) {
        assetData.sortOrder = data.assets.length;
      }
      
      const saved = await service.upsertAsset(assetData);
      setData(prev => {
        const index = prev.assets.findIndex(a => a.id === saved.id);
        const newAssets = [...prev.assets];
        if (index >= 0) {
          newAssets[index] = saved;
        } else {
          newAssets.push(saved);
        }
        return { ...prev, assets: newAssets };
      });
      setIsAddingAsset(false);
      setEditingAsset(null);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    const asset = data.assets.find(a => a.id === assetId);
    if (!asset) return;
    
    if (window.confirm(`Are you sure you want to delete "${asset.title}"? This action cannot be undone.`)) {
        try {
            await service.deleteAsset(assetId);
            setData(prev => ({
                ...prev,
                assets: prev.assets.filter(a => a.id !== assetId)
            }));
        } catch (error: any) {
            alert("Failed to delete asset: " + error.message);
        }
    }
  };

  // Robust Reorder Strategy: Uses a pool of existing sortOrders to avoid collisions
  const handleReorderAssets = async (reorderedFiltered: Asset[]) => {
    // 1. Get the current sortOrders of the items being moved
    const originalItemsInOrder = data.assets
      .filter(a => reorderedFiltered.some(r => r.id === a.id))
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    
    const sortOrderPool = originalItemsInOrder.map(a => a.sortOrder || 0);

    // 2. Map new order to the pool of sortOrder values
    const updatedWithPool = reorderedFiltered.map((item, idx) => ({
      ...item,
      sortOrder: sortOrderPool[idx] ?? idx
    }));

    // 3. Update local state
    setData(prev => ({
      ...prev,
      assets: prev.assets.map(a => updatedWithPool.find(u => u.id === a.id) || a)
    }));

    // 4. Persist mass change to DB
    try {
      await service.upsertAssets(updatedWithPool);
    } catch (e) {
      console.error("Failed to persist asset reorder:", e);
    }
  };

  const handleReorderBrands = async (newOrder: Brand[]) => {
    // Re-index all to be safe
    const updated = newOrder.map((b, i) => ({ ...b, sortOrder: i }));
    setData(prev => ({ ...prev, brands: updated }));
    try {
      await service.updateBrands(updated);
    } catch (e) {
      console.error("Failed to persist brand reorder:", e);
    }
  };

  const handleReorderTypes = async (newOrder: AssetType[]) => {
    // Re-index all to be safe
    const updated = newOrder.map((t, i) => ({ ...t, sortOrder: i }));
    setData(prev => ({ ...prev, assetTypes: updated }));
    try {
      await service.updateAssetTypes(updated);
    } catch (e) {
      console.error("Failed to persist type reorder:", e);
    }
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

  // Extract all unique tags for suggestion list
  // CHANGED: Convert all tags to lowercase to ensure case-insensitivity
  const allUniqueTags = useMemo(() => {
    const tags = new Set<string>();
    data.assets.forEach(asset => {
      asset.tags.forEach(tag => tags.add(tag.toLowerCase()));
    });
    return Array.from(tags).sort();
  }, [data.assets]);

  if (loading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-white">
      <div className="w-12 h-12 border-4 border-slate-100 border-t-wg-honorable rounded-full animate-spin mb-4"></div>
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 animate-pulse">Loading Brand Hub...</p>
    </div>
  );

  if (errorMsg) return (
    <div className="h-screen w-full flex flex-col items-center justify-center p-10 text-center animate-fade-in-up">
      <div className="text-4xl mb-4">⚠️</div>
      <h2 className="text-xl font-black text-slate-900 mb-2">System Error</h2>
      <p className="text-slate-500 text-sm max-w-md mb-8">{errorMsg}</p>
      <button onClick={() => window.location.reload()} className="px-8 py-3 bg-wg-honorable text-white font-black uppercase tracking-widest text-[10px] rounded-full">Retry Connection</button>
    </div>
  );

  return (
    <div className="flex h-screen bg-wg-light text-slate-900 overflow-hidden relative">
      {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300" onClick={() => setIsSidebarOpen(false)} />}

      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-50 flex flex-col border-r border-slate-200 transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8 border-b border-slate-200 bg-white/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-wg-honorable rounded-full overflow-hidden flex items-center justify-center shadow-lg shadow-wg-honorable/20">
              <img src={LOGO_URL} className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight">Brand-Hub</h1>
              <span className="text-[10px] font-black text-wg-honorable uppercase tracking-widest">Werkudara Group</span>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-6 space-y-1">
          <button onClick={() => { setActiveBrandId(null); setIsSidebarOpen(false); }} className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-between transition-all duration-200 ${!activeBrandId ? 'bg-wg-honorable text-white shadow-lg shadow-wg-honorable/20' : 'text-slate-500 hover:bg-wg-honorable/5 hover:translate-x-1'}`}>
            <span>All Entities</span>
            {!activeBrandId && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
          </button>
          
          <div className="pt-8 pb-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Holding</div>
          {brandsByType.ENTITAS.map(brand => (
            <button key={brand.id} onClick={() => { setActiveBrandId(brand.id); setIsSidebarOpen(false); }} className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-between transition-all duration-200 ${activeBrandId === brand.id ? 'bg-wg-honorable text-white shadow-lg shadow-wg-honorable/20' : 'text-slate-500 hover:bg-wg-honorable/5 hover:translate-x-1'}`}>
              <span className="truncate">{brand.name}</span>
            </button>
          ))}
          
          <div className="pt-8 pb-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Business Units</div>
          {brandsByType.UNIT.map(brand => (
            <button key={brand.id} onClick={() => { setActiveBrandId(brand.id); setIsSidebarOpen(false); }} className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-between transition-all duration-200 ${activeBrandId === brand.id ? 'bg-wg-honorable text-white shadow-lg shadow-wg-honorable/20' : 'text-slate-500 hover:bg-wg-honorable/5 hover:translate-x-1'}`}>
              <span className="truncate">{brand.name}</span>
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-200">
          <button onClick={() => { role === 'ADMIN' ? setRole('VIEWER') : setShowLoginModal(true); }} className={`w-full p-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-center border transition-all hover:scale-[1.02] active:scale-[0.98] ${role === 'ADMIN' ? 'text-wg-burgundy border-wg-burgundy/20 bg-wg-burgundy/5' : 'text-wg-honorable border-wg-honorable/20 hover:bg-wg-honorable/5'}`}>
            {role === 'ADMIN' ? 'Exit Admin Mode' : 'Admin Login'}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white">
        <header className="h-20 bg-white border-b border-slate-100 px-4 lg:px-10 flex items-center gap-4 shrink-0 transition-all">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2.5 bg-slate-50 rounded-xl lg:hidden text-slate-400 hover:bg-slate-100 transition-colors"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg></button>
          <div className="relative flex-1 max-w-2xl group">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-wg-honorable transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input type="text" placeholder="Search resources..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-wg-honorable/5 focus:border-wg-honorable transition-all" />
          </div>
          
          <div className="flex items-center gap-2 p-1 bg-slate-50 rounded-xl border border-slate-200">
            <button 
              onClick={() => setViewMode('grid')} 
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white text-wg-honorable shadow-sm transform scale-105' : 'text-slate-400 hover:text-slate-600'}`}
              title="Grid View"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
            </button>
            <button 
              onClick={() => setViewMode('list')} 
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-wg-honorable shadow-sm transform scale-105' : 'text-slate-400 hover:text-slate-600'}`}
              title="List View"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
          </div>

          {role === 'ADMIN' && (
            <button onClick={() => setIsAddingAsset(true)} className="px-6 py-3 bg-wg-honorable text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-wg-honorable/20 hover:bg-wg-royal transition-all active:scale-95 ml-2 hover:shadow-xl">
              Upload
            </button>
          )}
        </header>

        <div className="flex-1 overflow-y-auto px-4 lg:px-10 py-10">
          <div className="flex flex-col gap-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 animate-fade-in-up">
              <div>
                <h2 className="text-2xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
                  {activeBrandId ? data.brands.find(b => b.id === activeBrandId)?.name : 'Digital Assets'}
                </h2>
                <p className="text-slate-400 text-[10px] font-black mt-2 uppercase tracking-widest">
                  Showing {filteredAssets.length} Resources
                </p>
              </div>
              
              <div className="flex gap-2 p-1.5 bg-slate-50 rounded-2xl border border-slate-200 overflow-x-auto no-scrollbar">
                <button onClick={() => setSelectedType(null)} className={`px-5 py-2.5 text-[10px] font-black uppercase rounded-xl transition-all whitespace-nowrap ${!selectedType ? 'bg-white text-wg-honorable shadow-md scale-105' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'}`}>All Formats</button>
                {data.assetTypes.map(type => (
                  <button key={type.id} onClick={() => setSelectedType(type.id)} className={`px-5 py-2.5 text-[10px] font-black uppercase rounded-xl transition-all whitespace-nowrap ${selectedType === type.id ? 'bg-white text-wg-honorable shadow-md scale-105' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-200/50'}`}>
                    {type.icon} {type.name}
                  </button>
                ))}
              </div>
            </div>
            
            <AssetGrid 
              assets={filteredAssets} 
              brands={data.brands} 
              assetTypes={data.assetTypes} 
              isAdmin={role === 'ADMIN'} 
              viewMode={viewMode}
              onSelectAsset={setSelectedAsset} 
              onEditAsset={(asset) => { setEditingAsset(asset); setIsAddingAsset(true); }} 
              onDeleteAsset={handleDeleteAsset}
              onReorderAssets={handleReorderAssets}
            />
          </div>
        </div>
      </main>

      {selectedAsset && <PreviewModal asset={selectedAsset} onClose={() => setSelectedAsset(null)} />}
      
      {isAddingAsset && (
        <AdminPanel 
          brands={data.brands} 
          assetTypes={data.assetTypes} 
          editingAsset={editingAsset} 
          onClose={() => { setIsAddingAsset(false); setEditingAsset(null); }}
          onSaveAsset={handleSaveAsset}
          onAddBrand={async (b) => { const r = await service.createBrand(b); setData(p => ({ ...p, brands: [...p.brands, r] })); }}
          onUpdateBrand={async (b) => { const r = await service.updateBrand(b.id, b); setData(p => ({ ...p, brands: p.brands.map(x => x.id === r.id ? r : x) })); }}
          onDeleteBrand={async (id) => { if(confirm("Are you sure? All assets in this entity will be affected.")) { await service.deleteBrand(id); setData(p => ({ ...p, brands: p.brands.filter(b => b.id !== id) })); } }}
          onAddAssetType={async (t) => { const r = await service.createAssetType(t); setData(p => ({ ...p, assetTypes: [...p.assetTypes, r] })); }}
          onUpdateAssetType={async (t) => { const r = await service.updateAssetType(t.id, t); setData(p => ({ ...p, assetTypes: p.assetTypes.map(x => x.id === r.id ? r : x) })); }}
          onDeleteAssetType={async (id) => { if(confirm("Delete this format?")) { await service.deleteAssetType(id); setData(p => ({ ...p, assetTypes: p.assetTypes.filter(t => t.id !== id) })); } }}
          onReorderBrands={handleReorderBrands}
          onReorderTypes={handleReorderTypes}
          existingTags={allUniqueTags}
        />
      )}
      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} onLogin={async (e, p) => { if(e==='admin@werkudara.com' && p==='admin123'){ setRole('ADMIN'); setShowLoginModal(false); return true; } return false; }} />}
    </div>
  );
};

export default App;

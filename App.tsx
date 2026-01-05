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
      setData(result);
    } catch (error: any) {
      setErrorMsg(error?.message || "Database connection error.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAsset = async (assetData: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
    try {
      const saved = await service.upsertAsset(assetData);
      setData(prev => {
        const index = prev.assets.findIndex(a => a.id === saved.id);
        const newAssets = [...prev.assets];
        index >= 0 ? (newAssets[index] = saved) : newAssets.unshift(saved);
        return { ...prev, assets: newAssets };
      });
      setIsAddingAsset(false);
      setEditingAsset(null);
    } catch (error: any) {
      alert(error.message);
    }
  };

  // Reorder Handlers
  const handleReorderAssets = async (newOrder: Asset[]) => {
    setData(prev => ({ ...prev, assets: newOrder }));
    try {
      // Direct update each changed item
      await Promise.all(newOrder.map(a => service.upsertAsset(a)));
    } catch (e) { console.error(e); }
  };

  const handleReorderBrands = async (newOrder: Brand[]) => {
    setData(prev => ({ ...prev, brands: newOrder }));
    try {
      await Promise.all(newOrder.map(b => service.updateBrand(b.id, b)));
    } catch (e) { console.error(e); }
  };

  const handleReorderTypes = async (newOrder: AssetType[]) => {
    setData(prev => ({ ...prev, assetTypes: newOrder }));
    try {
      await Promise.all(newOrder.map(t => service.updateAssetType(t.id, t)));
    } catch (e) { console.error(e); }
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

  return (
    <div className="flex h-screen bg-wg-light text-slate-900 overflow-hidden relative">
      {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}

      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-50 flex flex-col border-r border-slate-200 transition-transform lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8 border-b border-slate-200 bg-white/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-wg-honorable rounded-full overflow-hidden"><img src={LOGO_URL} className="w-full h-full object-cover" /></div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight">Brand-Hub</h1>
              <span className="text-[10px] font-black text-wg-honorable uppercase tracking-widest">Werkudara Group</span>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-6 space-y-1">
          <button onClick={() => { setActiveBrandId(null); setIsSidebarOpen(false); }} className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-between ${!activeBrandId ? 'bg-wg-honorable text-white' : 'text-slate-500 hover:bg-wg-honorable/5'}`}>
            <span>All Entities</span>
          </button>
          
          <div className="pt-8 pb-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Holding</div>
          {brandsByType.ENTITAS.map(brand => (
            <button key={brand.id} onClick={() => { setActiveBrandId(brand.id); setIsSidebarOpen(false); }} className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-between ${activeBrandId === brand.id ? 'bg-wg-honorable text-white' : 'text-slate-500'}`}>{brand.name}</button>
          ))}
          
          <div className="pt-8 pb-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Business Units</div>
          {brandsByType.UNIT.map(brand => (
            <button key={brand.id} onClick={() => { setActiveBrandId(brand.id); setIsSidebarOpen(false); }} className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-between ${activeBrandId === brand.id ? 'bg-wg-honorable text-white' : 'text-slate-500'}`}>{brand.name}</button>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-200">
          <button onClick={() => { role === 'ADMIN' ? setRole('VIEWER') : setShowLoginModal(true); }} className={`w-full p-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-center border ${role === 'ADMIN' ? 'text-wg-burgundy border-wg-burgundy/20' : 'text-wg-honorable border-wg-honorable/20'}`}>
            {role === 'ADMIN' ? 'Exit Admin Mode' : 'Admin Login'}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white">
        <header className="h-20 bg-white border-b border-slate-100 px-4 lg:px-10 flex items-center gap-4 shrink-0">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2.5 bg-slate-50 rounded-xl lg:hidden"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg></button>
          <div className="relative flex-1 max-w-2xl">
            <input type="text" placeholder="Search resources..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none" />
          </div>
          {role === 'ADMIN' && <button onClick={() => setIsAddingAsset(true)} className="px-6 py-3 bg-wg-honorable text-white text-xs font-black uppercase tracking-widest rounded-full">Upload</button>}
        </header>

        <div className="flex-1 overflow-y-auto px-4 lg:px-10 py-10">
          <div className="flex flex-col gap-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <h2 className="text-2xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
                  {activeBrandId ? data.brands.find(b => b.id === activeBrandId)?.name : 'Digital Assets'}
                </h2>
                <p className="text-slate-400 text-xs font-bold mt-1 uppercase tracking-widest">{filteredAssets.length} Results</p>
              </div>
              
              <div className="flex gap-2 p-1.5 bg-slate-50 rounded-2xl border border-slate-200 overflow-x-auto no-scrollbar">
                <button onClick={() => setSelectedType(null)} className={`px-4 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${!selectedType ? 'bg-white text-wg-honorable shadow-md' : 'text-slate-400'}`}>All</button>
                {data.assetTypes.map(type => (
                  <button key={type.id} onClick={() => setSelectedType(type.id)} className={`px-4 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${selectedType === type.id ? 'bg-white text-wg-honorable shadow-md' : 'text-slate-400'}`}>{type.name}</button>
                ))}
              </div>
            </div>
            
            <AssetGrid 
              assets={filteredAssets} 
              brands={data.brands} 
              assetTypes={data.assetTypes} 
              isAdmin={role === 'ADMIN'} 
              onSelectAsset={setSelectedAsset} 
              onEditAsset={(asset) => { setEditingAsset(asset); setIsAddingAsset(true); }} 
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
          onDeleteBrand={async (id) => { await service.deleteBrand(id); setData(p => ({ ...p, brands: p.brands.filter(b => b.id !== id) })); }}
          onAddAssetType={async (t) => { const r = await service.createAssetType(t); setData(p => ({ ...p, assetTypes: [...p.assetTypes, r] })); }}
          onUpdateAssetType={async (t) => { const r = await service.updateAssetType(t.id, t); setData(p => ({ ...p, assetTypes: p.assetTypes.map(x => x.id === r.id ? r : x) })); }}
          onDeleteAssetType={async (id) => { await service.deleteAssetType(id); setData(p => ({ ...p, assetTypes: p.assetTypes.filter(t => t.id !== id) })); }}
          onReorderBrands={handleReorderBrands}
          onReorderTypes={handleReorderTypes}
        />
      )}
      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} onLogin={async (e, p) => { if(e==='admin@werkudara.com' && p==='admin123'){ setRole('ADMIN'); setShowLoginModal(false); return true; } return false; }} />}
    </div>
  );
};

export default App;

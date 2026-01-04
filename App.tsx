
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
  
  // Mobile UI State
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
      setErrorMsg("Configuration variables detected but they appear to be empty or too short. Please double-check your Supabase keys.");
    }
  };

  const loadInitialData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const result = await service.fetchAllData();
      setData(result);
    } catch (error: any) {
      console.error("Supabase Connection Error:", error);
      let friendlyMessage = error?.message || "Database access denied. Check your project API settings.";
      setErrorMsg(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  // Fix error in App.tsx on line 277: Cannot find name 'handleSaveAsset'
  const handleSaveAsset = async (assetData: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
    try {
      const saved = await service.upsertAsset(assetData);
      setData(prev => {
        const index = prev.assets.findIndex(a => a.id === saved.id);
        const newAssets = [...prev.assets];
        if (index >= 0) {
          newAssets[index] = saved;
        } else {
          newAssets.unshift(saved);
        }
        return { ...prev, assets: newAssets };
      });
      setIsAddingAsset(false);
      setEditingAsset(null);
    } catch (error: any) {
      console.error("Error saving asset:", error);
      alert(error.message || "Failed to save asset.");
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
      const isActive = asset.status === 'ACTIVE';
      return matchesBrand && matchesType && matchesSearch && isActive;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [data.assets, activeBrandId, selectedType, searchQuery]);

  const handleAdminAuth = async (email: string, pass: string) => {
    return new Promise<boolean>((resolve) => {
      setTimeout(() => {
        if (email === 'admin@werkudara.com' && pass === 'admin123') {
          setRole('ADMIN');
          setShowLoginModal(false);
          resolve(true);
        } else {
          resolve(false);
        }
      }, 800);
    });
  };

  const brandsByType = useMemo(() => {
    return {
      ENTITAS: data.brands.filter(b => b.type === 'ENTITAS'),
      UNIT: data.brands.filter(b => b.type === 'UNIT')
    };
  }, [data.brands]);

  return (
    <div className="flex h-screen bg-wg-light text-slate-900 overflow-hidden relative">
      {/* Mobile Overlay for Sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Responsive Drawer */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-slate-50 flex flex-col border-r border-slate-200 transition-transform duration-300 transform
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0
      `}>
        <div className="p-8 border-b border-slate-200 flex flex-col gap-2 bg-white/60 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-wg-honorable rounded-full flex items-center justify-center shadow-lg shadow-wg-honorable/20 overflow-hidden border-2 border-wg-sky">
                <img src={LOGO_URL} alt="Pegasus" className="w-full h-full object-cover" />
              </div>
              <div>
                <h1 className="text-lg font-extrabold tracking-tight text-slate-900 leading-none">Brand-Hub</h1>
                <span className="text-[10px] font-black text-wg-honorable uppercase tracking-widest">Werkudara Group</span>
              </div>
            </div>
            {/* Close button for mobile */}
            <button onClick={() => setIsSidebarOpen(false)} className="p-2 lg:hidden text-slate-400 hover:text-wg-burgundy">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-6 space-y-1">
          <button onClick={() => { setActiveBrandId(null); setIsSidebarOpen(false); }} className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-between ${!activeBrandId ? 'bg-wg-honorable text-white shadow-xl shadow-wg-honorable/20 translate-x-1' : 'text-slate-500 hover:bg-wg-honorable/5 hover:text-wg-honorable'}`}>
            <span>All Entities</span>
            {!activeBrandId && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
          </button>
          
          {loading ? (
            <div className="px-4 py-10 flex flex-col items-center gap-3">
              <div className="w-6 h-6 border-2 border-wg-honorable/20 border-t-wg-honorable rounded-full animate-spin"></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading...</span>
            </div>
          ) : (
            <>
              {brandsByType.ENTITAS.length > 0 && (
                <>
                  <div className="pt-8 pb-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Entitas</div>
                  <div className="space-y-1">
                    {brandsByType.ENTITAS.map(brand => (
                      <button key={brand.id} onClick={() => { setActiveBrandId(brand.id); setIsSidebarOpen(false); }} className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-between ${activeBrandId === brand.id ? 'bg-wg-honorable text-white shadow-xl shadow-wg-honorable/20 translate-x-1' : 'text-slate-500 hover:bg-wg-honorable/5 hover:text-wg-honorable'}`}>
                        <span>{brand.name}</span>
                        {activeBrandId === brand.id && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                      </button>
                    ))}
                  </div>
                </>
              )}
              {brandsByType.UNIT.length > 0 && (
                <>
                  <div className="pt-8 pb-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Unit</div>
                  <div className="space-y-1">
                    {brandsByType.UNIT.map(brand => (
                      <button key={brand.id} onClick={() => { setActiveBrandId(brand.id); setIsSidebarOpen(false); }} className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-between ${activeBrandId === brand.id ? 'bg-wg-honorable text-white shadow-xl shadow-wg-honorable/20 translate-x-1' : 'text-slate-500 hover:bg-wg-honorable/5 hover:text-wg-honorable'}`}>
                        <span>{brand.name}</span>
                        {activeBrandId === brand.id && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </nav>

        <div className="p-6 border-t border-slate-200 bg-white/60 shrink-0">
          <div className="flex items-center gap-4 p-3 rounded-2xl bg-white border border-slate-100 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-wg-sky/30 text-wg-honorable flex items-center justify-center text-xs font-black border border-wg-honorable/10">
              {role === 'ADMIN' ? 'AD' : 'VW'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-extrabold text-slate-900 truncate">{role === 'ADMIN' ? 'Administrator' : 'Guest Viewer'}</p>
              <button onClick={() => { role === 'ADMIN' ? setRole('VIEWER') : setShowLoginModal(true); setIsSidebarOpen(false); }} className={`text-[9px] hover:underline transition-colors uppercase font-black tracking-widest mt-0.5 flex items-center gap-1.5 ${role === 'ADMIN' ? 'text-wg-burgundy' : 'text-wg-honorable'}`}>
                {role === 'ADMIN' ? 'Logout Admin' : 'Admin Role'}
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white">
        <header className="h-20 bg-white border-b border-slate-100 px-4 lg:px-10 flex items-center gap-3 lg:gap-8 justify-between shrink-0">
          {/* Menu Toggle for Mobile */}
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2.5 bg-slate-50 text-slate-600 rounded-xl lg:hidden hover:bg-slate-100 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>

          <div className="relative flex-1 max-w-2xl">
            <span className="absolute inset-y-0 left-4 flex items-center text-slate-400">
              <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </span>
            <input 
              type="text" 
              placeholder="Search assets..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
              className="w-full pl-10 lg:pl-12 pr-4 lg:pr-6 py-2.5 lg:py-3 bg-slate-50 border border-slate-200 rounded-xl lg:rounded-2xl text-xs lg:text-sm font-medium outline-none focus:border-wg-honorable transition-all" 
            />
          </div>
          
          {role === 'ADMIN' && (
            <button onClick={() => setIsAddingAsset(true)} className="px-3 lg:px-6 py-2.5 lg:py-3 bg-wg-honorable text-white text-[9px] lg:text-xs font-black uppercase tracking-widest rounded-xl lg:rounded-full hover:bg-wg-royal transition-all shadow-md active:scale-95 whitespace-nowrap">
              <span className="hidden lg:inline">Upload Asset</span>
              <span className="lg:hidden">+</span>
            </button>
          )}
        </header>

        <div className="flex-1 overflow-y-auto px-4 lg:px-10 py-6 lg:py-10">
          {loading ? (
             <div className="h-full flex flex-col items-center justify-center opacity-20 grayscale">
                <img src={LOGO_URL} className="w-24 h-24 lg:w-32 lg:h-32 mb-4 animate-pulse" />
                <span className="text-[10px] lg:text-xs font-black uppercase tracking-[0.5em]">Syncing Cloud</span>
             </div>
          ) : errorMsg ? (
            <div className="h-full flex flex-col items-center justify-center p-6 lg:p-10 text-center">
              <div className="w-16 h-16 lg:w-20 lg:h-20 bg-wg-burgundy/10 text-wg-burgundy rounded-full flex items-center justify-center mb-6">
                <svg className="w-8 h-8 lg:w-10 lg:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <h3 className="text-lg lg:text-xl font-extrabold text-slate-900 mb-2">Sync Connection Error</h3>
              <p className="text-slate-500 max-w-lg text-sm font-medium leading-relaxed">{errorMsg}</p>
              <button onClick={() => window.location.reload()} className="mt-8 px-8 py-3 bg-wg-honorable text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg hover:scale-105 transition-all">Reload Page</button>
            </div>
          ) : (
            <div className="flex flex-col gap-6 lg:gap-10">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="flex-1">
                  <h2 className="text-2xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
                    {activeBrandId ? data.brands.find(b => b.id === activeBrandId)?.name : 'Digital Assets'}
                  </h2>
                  <p className="text-slate-400 text-xs font-bold mt-1 uppercase tracking-widest">{filteredAssets.length} Resources Available</p>
                </div>
                
                {/* Format Filter - Scrollable on Mobile */}
                <div className="flex gap-1.5 p-1.5 bg-slate-50 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto no-scrollbar max-w-full">
                  <button onClick={() => setSelectedType(null)} className={`whitespace-nowrap px-4 py-2 text-[9px] lg:text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${!selectedType ? 'bg-white text-wg-honorable shadow-md' : 'text-slate-400'}`}>All</button>
                  {data.assetTypes.map(type => (
                    <button key={type.id} onClick={() => setSelectedType(type.id)} className={`whitespace-nowrap px-4 py-2 text-[9px] lg:text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${selectedType === type.id ? 'bg-white text-wg-honorable shadow-md' : 'text-slate-400'}`}>{type.name}</button>
                  ))}
                </div>
              </div>
              <div className="pb-20">
                <AssetGrid 
                  assets={filteredAssets} 
                  brands={data.brands} 
                  assetTypes={data.assetTypes} 
                  isAdmin={role === 'ADMIN'} 
                  onSelectAsset={setSelectedAsset} 
                  onEditAsset={(asset) => { setEditingAsset(asset); setIsAddingAsset(true); }} 
                />
              </div>
            </div>
          )}
        </div>
      </main>

      {selectedAsset && <PreviewModal asset={selectedAsset} onClose={() => setSelectedAsset(null)} />}
      
      {isAddingAsset && (
        <AdminPanel 
          brands={data.brands} 
          assetTypes={data.assetTypes} 
          editingAsset={editingAsset} 
          onClose={() => { setIsAddingAsset(false); setEditingAsset(null); }}
          onSaveAsset={async (asset) => {
            await handleSaveAsset(asset);
          }}
          onAddBrand={async (brand) => {
            const { id, ...payload } = brand;
            const newBrand = await service.createBrand(payload);
            setData(prev => ({ ...prev, brands: [...prev.brands, newBrand] }));
          }}
          onUpdateBrand={async (brand) => {
            const { id, ...payload } = brand;
            const saved = await service.updateBrand(id, payload);
            setData(prev => ({ ...prev, brands: prev.brands.map(b => b.id === saved.id ? saved : b) }));
          }}
          onDeleteBrand={async (id) => {
            if (data.assets.some(a => a.brandId === id)) return alert("Cannot delete brand that has associated assets.");
            await service.deleteBrand(id);
            setData(prev => ({ ...prev, brands: prev.brands.filter(b => b.id !== id) }));
            if (activeBrandId === id) setActiveBrandId(null);
          }}
          onAddAssetType={async (type) => {
            const { id, ...payload } = type;
            const newType = await service.createAssetType(payload);
            setData(prev => ({ ...prev, assetTypes: [...prev.assetTypes, newType] }));
          }}
          onUpdateAssetType={async (type) => {
            const { id, ...payload } = type;
            const saved = await service.updateAssetType(id, payload);
            setData(prev => ({ ...prev, assetTypes: prev.assetTypes.map(t => t.id === saved.id ? saved : t) }));
          }}
          onDeleteAssetType={async (id) => {
            if (data.assets.some(a => a.typeId === id)) return alert("Cannot delete asset type currently being used.");
            await service.deleteAssetType(id);
            setData(prev => ({ ...prev, assetTypes: prev.assetTypes.filter(t => t.id !== id) }));
            if (selectedType === id) setSelectedType(null);
          }}
        />
      )}
      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} onLogin={handleAdminAuth} />}
    </div>
  );
};

export default App;

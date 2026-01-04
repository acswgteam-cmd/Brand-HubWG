import React, { useState, useEffect, useMemo } from 'react';
import { Asset, Brand, AssetType, UserRole } from './types';
import { loadData, saveData } from './services/assetService';
import { LOGO_URL } from './constants';
import AssetGrid from './components/AssetGrid';
import PreviewModal from './components/PreviewModal';
import AdminPanel from './components/AdminPanel';
import LoginModal from './components/LoginModal';

const App: React.FC = () => {
  const [data, setData] = useState(loadData());
  const [activeBrandId, setActiveBrandId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isAddingAsset, setIsAddingAsset] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [role, setRole] = useState<UserRole>('VIEWER');
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    saveData(data);
  }, [data]);

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

  const handleRoleToggle = () => {
    if (role === 'ADMIN') {
      setRole('VIEWER');
    } else {
      setShowLoginModal(true);
    }
  };

  const handleSaveAsset = (assetData: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
    const now = new Date().toISOString();
    
    if (assetData.id) {
      setData(prev => ({
        ...prev,
        assets: prev.assets.map(a => a.id === assetData.id ? {
          ...a,
          ...assetData,
          updatedAt: now
        } as Asset : a)
      }));
    } else {
      const newAsset: Asset = {
        ...assetData,
        id: 'asset_' + Date.now(),
        createdAt: now,
        updatedAt: now
      };
      setData(prev => ({
        ...prev,
        assets: [newAsset, ...prev.assets]
      }));
    }
    
    setIsAddingAsset(false);
    setEditingAsset(null);
  };

  const handleAddBrand = (brand: Brand) => {
    setData(prev => ({
      ...prev,
      brands: [...prev.brands, brand]
    }));
  };

  const handleUpdateBrand = (updatedBrand: Brand) => {
    setData(prev => ({
      ...prev,
      brands: prev.brands.map(b => b.id === updatedBrand.id ? updatedBrand : b)
    }));
  };

  const handleDeleteBrand = (id: string) => {
    if (data.assets.some(a => a.brandId === id)) {
      alert("Cannot delete brand that has associated assets.");
      return;
    }
    setData(prev => ({
      ...prev,
      brands: prev.brands.filter(b => b.id !== id)
    }));
    if (activeBrandId === id) setActiveBrandId(null);
  };

  const handleAddAssetType = (type: AssetType) => {
    setData(prev => ({
      ...prev,
      assetTypes: [...prev.assetTypes, type]
    }));
  };

  const handleUpdateAssetType = (updatedType: AssetType) => {
    setData(prev => ({
      ...prev,
      assetTypes: prev.assetTypes.map(t => t.id === updatedType.id ? updatedType : t)
    }));
  };

  const handleDeleteAssetType = (id: string) => {
    if (data.assets.some(a => a.typeId === id)) {
      alert("Cannot delete asset type that is currently being used by assets.");
      return;
    }
    setData(prev => ({
      ...prev,
      assetTypes: prev.assetTypes.filter(t => t.id !== id)
    }));
    if (selectedType === id) setSelectedType(null);
  };

  const brandsByType = useMemo(() => {
    return {
      ENTITAS: data.brands.filter(b => b.type === 'ENTITAS'),
      UNIT: data.brands.filter(b => b.type === 'UNIT')
    };
  }, [data.brands]);

  return (
    <div className="flex h-screen bg-wg-light text-slate-900">
      {/* Sidebar */}
      <aside className="w-72 bg-slate-50 flex flex-col shrink-0 border-r border-slate-200 z-10">
        <div className="p-8 border-b border-slate-200 flex flex-col gap-2 bg-white/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-wg-honorable rounded-full flex items-center justify-center shadow-lg shadow-wg-honorable/20 overflow-hidden border-2 border-wg-sky">
              <img src={LOGO_URL} alt="Pegasus" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight text-slate-900 leading-none">
                Brand-Hub
              </h1>
              <span className="text-[10px] font-black text-wg-honorable uppercase tracking-widest">Werkudara Group</span>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-6 space-y-1">
          <button 
            onClick={() => setActiveBrandId(null)}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-between ${!activeBrandId ? 'bg-wg-honorable text-white shadow-xl shadow-wg-honorable/20 translate-x-1' : 'text-slate-500 hover:bg-wg-honorable/5 hover:text-wg-honorable'}`}
          >
            <span>All Entities</span>
            {!activeBrandId && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
          </button>
          
          {brandsByType.ENTITAS.length > 0 && (
            <>
              <div className="pt-8 pb-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Entitas</div>
              <div className="space-y-1">
                {brandsByType.ENTITAS.map(brand => (
                  <button 
                    key={brand.id}
                    onClick={() => setActiveBrandId(brand.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-between ${activeBrandId === brand.id ? 'bg-wg-honorable text-white shadow-xl shadow-wg-honorable/20 translate-x-1' : 'text-slate-500 hover:bg-wg-honorable/5 hover:text-wg-honorable'}`}
                  >
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
                  <button 
                    key={brand.id}
                    onClick={() => setActiveBrandId(brand.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-between ${activeBrandId === brand.id ? 'bg-wg-honorable text-white shadow-xl shadow-wg-honorable/20 translate-x-1' : 'text-slate-500 hover:bg-wg-honorable/5 hover:text-wg-honorable'}`}
                  >
                    <span>{brand.name}</span>
                    {activeBrandId === brand.id && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                  </button>
                ))}
              </div>
            </>
          )}
        </nav>

        <div className="p-6 border-t border-slate-200 bg-white/60">
          <div className="flex items-center gap-4 p-3 rounded-2xl bg-white border border-slate-100 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-wg-sky/30 text-wg-honorable flex items-center justify-center text-xs font-black border border-wg-honorable/10">
              {role === 'ADMIN' ? 'AD' : 'VW'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-extrabold text-slate-900 truncate">{role === 'ADMIN' ? 'Administrator' : 'Guest Viewer'}</p>
              <button 
                onClick={handleRoleToggle}
                className={`text-[9px] hover:underline transition-colors uppercase font-black tracking-widest mt-0.5 flex items-center gap-1.5 ${role === 'ADMIN' ? 'text-wg-burgundy' : 'text-wg-honorable'}`}
              >
                {role === 'ADMIN' ? (
                  <>
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2V7a5 5 0 00-5-5zM7 7a3 3 0 016 0v2H7V7z" /></svg>
                    Logout Admin
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" /></svg>
                    Admin Role
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white">
        {/* Header */}
        <header className="h-20 bg-white border-b border-slate-100 px-10 flex items-center justify-between shrink-0">
          <div className="relative flex-1 max-w-2xl">
            <span className="absolute inset-y-0 left-4 flex items-center text-slate-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input 
              type="text" 
              placeholder="Search assets, templates, or branding guides..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-6 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-wg-honorable/10 focus:border-wg-honorable outline-none transition-all placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-6 ml-8">
            <div className="h-8 w-[1px] bg-slate-200 hidden md:block"></div>
            {role === 'ADMIN' && (
              <button 
                onClick={() => setIsAddingAsset(true)}
                className="px-6 py-3 bg-wg-honorable text-white text-xs font-black uppercase tracking-widest rounded-full hover:bg-wg-royal shadow-lg shadow-wg-honorable/20 transition-all active:scale-95 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                </svg>
                Upload Asset
              </button>
            )}
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-10 py-10">
          <div className="flex flex-col gap-10">
            <div className="flex items-end justify-between flex-wrap gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                   <div className="w-2 h-2 rounded-full bg-wg-honorable"></div>
                   <span className="text-[10px] font-black text-wg-honorable uppercase tracking-widest">Asset Management System</span>
                </div>
                <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">
                  {activeBrandId ? data.brands.find(b => b.id === activeBrandId)?.name : 'Digital Assets'}
                </h2>
                <p className="text-slate-500 text-sm mt-3 font-medium leading-relaxed whitespace-nowrap">
                  Access the latest brand materials, visual guides, and corporate assets for all Werkudara Group entities.
                </p>
              </div>

              <div className="flex gap-1.5 p-1.5 bg-slate-50 rounded-2xl border border-slate-200 shadow-sm">
                <button 
                  onClick={() => setSelectedType(null)}
                  className={`px-5 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${!selectedType ? 'bg-white text-wg-honorable shadow-md ring-1 ring-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  All Formats
                </button>
                {data.assetTypes.map(type => (
                  <button 
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    className={`px-5 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${selectedType === type.id ? 'bg-white text-wg-honorable shadow-md ring-1 ring-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    {type.name}
                  </button>
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
                onEditAsset={(asset) => {
                  setEditingAsset(asset);
                  setIsAddingAsset(true);
                }}
              />
            </div>
          </div>
        </div>
      </main>

      {selectedAsset && (
        <PreviewModal 
          asset={selectedAsset} 
          onClose={() => setSelectedAsset(null)} 
        />
      )}

      {isAddingAsset && (
        <AdminPanel 
          brands={data.brands}
          assetTypes={data.assetTypes}
          editingAsset={editingAsset}
          onClose={() => {
            setIsAddingAsset(false);
            setEditingAsset(null);
          }}
          onSaveAsset={handleSaveAsset}
          onAddBrand={handleAddBrand}
          onUpdateBrand={handleUpdateBrand}
          onDeleteBrand={handleDeleteBrand}
          onAddAssetType={handleAddAssetType}
          onUpdateAssetType={handleUpdateAssetType}
          onDeleteAssetType={handleDeleteAssetType}
        />
      )}

      {showLoginModal && (
        <LoginModal 
          onClose={() => setShowLoginModal(false)}
          onLogin={handleAdminAuth}
        />
      )}
    </div>
  );
};

export default App;
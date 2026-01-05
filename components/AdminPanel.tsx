import React, { useState, useEffect, useRef } from 'react';
import { Asset, Brand, AssetType, BrandType } from '../types';
import { generateAssetMetadata } from '../services/geminiService';

interface AdminPanelProps {
  brands: Brand[];
  assetTypes: AssetType[];
  editingAsset: Asset | null;
  onSaveAsset: (asset: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => void;
  onClose: () => void;
  onAddBrand: (brand: Brand) => void;
  onUpdateBrand: (brand: Brand) => void;
  onDeleteBrand: (id: string) => void;
  onAddAssetType: (type: AssetType) => void;
  onUpdateAssetType: (type: AssetType) => void;
  onDeleteAssetType: (id: string) => void;
  onReorderBrands: (brands: Brand[]) => void;
  onReorderTypes: (types: AssetType[]) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  brands, 
  assetTypes, 
  editingAsset, 
  onSaveAsset, 
  onClose,
  onAddBrand,
  onUpdateBrand,
  onDeleteBrand,
  onAddAssetType,
  onUpdateAssetType,
  onDeleteAssetType,
  onReorderBrands,
  onReorderTypes
}) => {
  const [formData, setFormData] = useState({
    title: '',
    brandId: brands[0]?.id || '',
    typeId: assetTypes[0]?.id || '',
    description: '',
    link: '',
    tags: [] as string[],
    status: 'ACTIVE' as 'ACTIVE' | 'ARCHIVED',
    sortOrder: 0
  });
  
  const [activeTab, setActiveTab] = useState<'asset' | 'brands' | 'types'>('asset');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  
  // Entity/Type Edit State
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editBuffer, setEditBuffer] = useState<any>(null);

  // New Management State
  const [newBrandName, setNewBrandName] = useState('');
  const [newBrandType, setNewBrandType] = useState<BrandType>('UNIT');
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeIcon, setNewTypeIcon] = useState('📁');
  
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingAsset) {
      setFormData({
        title: editingAsset.title,
        brandId: editingAsset.brandId,
        typeId: editingAsset.typeId,
        description: editingAsset.description || '',
        link: editingAsset.link,
        tags: editingAsset.tags,
        status: editingAsset.status,
        sortOrder: editingAsset.sortOrder || 0
      });
    }
  }, [editingAsset]);

  // Drag & Drop Handlers for Brands/Types
  const handleDragStart = (index: number) => setDraggedIndex(index);
  
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleDrop = (targetIndex: number, listType: 'brands' | 'types') => {
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    if (listType === 'brands') {
      const newList = [...brands];
      const [draggedItem] = newList.splice(draggedIndex, 1);
      newList.splice(targetIndex, 0, draggedItem);
      onReorderBrands(newList.map((item, idx) => ({ ...item, sortOrder: idx })));
    } else {
      const newList = [...assetTypes];
      const [draggedItem] = newList.splice(draggedIndex, 1);
      newList.splice(targetIndex, 0, draggedItem);
      onReorderTypes(newList.map((item, idx) => ({ ...item, sortOrder: idx })));
    }
    setDraggedIndex(null);
  };

  const handleSaveAsset = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveAsset({ ...formData, id: editingAsset?.id });
  };

  const startEditItem = (item: any) => {
    setEditingItemId(item.id);
    setEditBuffer({ ...item });
  };

  const saveEditItem = () => {
    if (!editBuffer) return;
    activeTab === 'brands' ? onUpdateBrand(editBuffer) : onUpdateAssetType(editBuffer);
    setEditingItemId(null);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-2 lg:p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl rounded-[1.5rem] lg:rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        <div className="flex bg-slate-50 border-b border-slate-100 shrink-0">
          {['asset', 'brands', 'types'].map((tab) => (
            <button 
              key={tab}
              onClick={() => { setActiveTab(tab as any); setEditingItemId(null); }}
              className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white text-wg-honorable border-b-2 border-wg-honorable' : 'text-slate-400'}`}
            >
              {tab === 'asset' ? 'Asset' : tab === 'brands' ? 'Entities' : 'Formats'}
            </button>
          ))}
          <button onClick={onClose} className="p-4 text-slate-300 hover:text-wg-burgundy">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6 lg:p-8 overflow-y-auto">
          {activeTab === 'asset' ? (
            <form onSubmit={handleSaveAsset} className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Asset Title</label>
                <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-sm" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Entity</label>
                  <select value={formData.brandId} onChange={e => setFormData({...formData, brandId: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-xs">
                    {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Format</label>
                  <select value={formData.typeId} onChange={e => setFormData({...formData, typeId: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-xs">
                    {assetTypes.map(t => <option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
                  </select>
                </div>
              </div>

              <input required value={formData.link} onChange={e => setFormData({...formData, link: e.target.value})} placeholder="Link URL..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-xs" />

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={onClose} className="px-6 py-3 text-slate-400 font-black uppercase text-[10px]">Cancel</button>
                <button type="submit" className="px-8 py-3.5 bg-wg-honorable text-white font-black uppercase tracking-widest text-[10px] rounded-full">Save Asset</button>
              </div>
            </form>
          ) : activeTab === 'brands' ? (
            <div className="space-y-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex gap-2">
                <input value={newBrandName} onChange={e => setNewBrandName(e.target.value)} placeholder="New Entity Name" className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold" />
                <button onClick={() => { if(newBrandName){ onAddBrand({id:'', name:newBrandName, type:newBrandType, sortOrder: brands.length}); setNewBrandName(''); } }} className="px-6 bg-wg-honorable text-white font-black uppercase text-[10px] rounded-xl">Add</button>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Drag to Reorder Entities</p>
                {brands.map((brand, index) => (
                  <div 
                    key={brand.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(index, 'brands')}
                    className={`flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl cursor-move group transition-all ${draggedIndex === index ? 'opacity-40 scale-95' : 'hover:border-wg-honorable/30 hover:shadow-md'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-slate-300 group-hover:text-wg-honorable">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M7 2a2 2 0 100 4h2a2 2 0 100-4H7zM11 2a2 2 0 100 4h2a2 2 0 100-4h-2zM7 8a2 2 0 100 4h2a2 2 0 100-4H7zM11 8a2 2 0 100 4h2a2 2 0 100-4h-2zM7 14a2 2 0 100 4h2a2 2 0 100-4H7zM11 14a2 2 0 100 4h2a2 2 0 100-4h-2z" /></svg>
                      </div>
                      <span className="text-xs font-black text-slate-900">{brand.name}</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => confirm(`Delete ${brand.name}?`) && onDeleteBrand(brand.id)} className="p-2 text-slate-300 hover:text-wg-burgundy"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex gap-2">
                <input value={newTypeIcon} onChange={e => setNewTypeIcon(e.target.value)} className="w-16 px-2 py-3 bg-white border border-slate-200 rounded-xl text-center" />
                <input value={newTypeName} onChange={e => setNewTypeName(e.target.value)} placeholder="New Format Name" className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold" />
                <button onClick={() => { if(newTypeName){ onAddAssetType({id:'', name:newTypeName, icon:newTypeIcon, sortOrder: assetTypes.length}); setNewTypeName(''); } }} className="px-6 bg-wg-honorable text-white font-black uppercase text-[10px] rounded-xl">Add</button>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Drag to Reorder Formats</p>
                {assetTypes.map((type, index) => (
                  <div 
                    key={type.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(index, 'types')}
                    className={`flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl cursor-move group transition-all ${draggedIndex === index ? 'opacity-40 scale-95' : 'hover:border-wg-honorable/30 hover:shadow-md'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-slate-300 group-hover:text-wg-honorable">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M7 2a2 2 0 100 4h2a2 2 0 100-4H7zM11 2a2 2 0 100 4h2a2 2 0 100-4h-2zM7 8a2 2 0 100 4h2a2 2 0 100-4H7zM11 8a2 2 0 100 4h2a2 2 0 100-4h-2zM7 14a2 2 0 100 4h2a2 2 0 100-4H7zM11 14a2 2 0 100 4h2a2 2 0 100-4h-2z" /></svg>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{type.icon}</span>
                        <span className="text-xs font-black text-slate-900">{type.name}</span>
                      </div>
                    </div>
                    <button onClick={() => confirm(`Delete ${type.name}?`) && onDeleteAssetType(type.id)} className="p-2 text-slate-300 hover:text-wg-burgundy"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;

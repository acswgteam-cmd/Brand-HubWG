
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
  existingTags?: string[]; // New prop for suggestions
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
  onReorderTypes,
  existingTags = []
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
  
  const [tagInput, setTagInput] = useState('');
  const [activeTab, setActiveTab] = useState<'asset' | 'brands' | 'types'>('asset');
  const [uploadMode, setUploadMode] = useState<'link' | 'file'>('link');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editBuffer, setEditBuffer] = useState<any>(null);

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
      if (editingAsset.link.startsWith('data:')) {
        setUploadMode('file');
      }
    }
  }, [editingAsset]);

  const handleGeminiSuggest = async () => {
    if (!formData.title) return alert('Please enter a title first.');
    setIsGenerating(true);
    const brand = brands.find(b => b.id === formData.brandId)?.name || '';
    const type = assetTypes.find(t => t.id === formData.typeId)?.name || '';
    
    try {
      const result = await generateAssetMetadata(formData.title, brand, type);
      setFormData(prev => ({
        ...prev,
        description: result.description,
        tags: [...new Set([...prev.tags, ...result.tags])]
      }));
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("File size exceeds 5MB limit.");
      return;
    }
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setFormData(prev => ({ ...prev, link: base64 }));
      setIsUploading(false);
      if (!formData.title) setFormData(prev => ({ ...prev, title: file.name.split('.')[0] }));
    };
    reader.readAsDataURL(file);
  };

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

  const handleAddTag = (e: React.MouseEvent | React.KeyboardEvent) => {
    if (e.type === 'keydown' && (e as React.KeyboardEvent).key !== 'Enter') return;
    e.preventDefault(); // Prevent form submission
    if (tagInput.trim()) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tagToRemove) }));
  };

  const handleSaveAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.link) return alert("Please provide a link or upload a file.");
    onSaveAsset({ ...formData, id: editingAsset?.id });
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-2 lg:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
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
          <button onClick={onClose} className="p-4 text-slate-300 hover:text-wg-burgundy transition-colors shrink-0">
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
              
              <div className="space-y-3">
                <div className="flex items-center gap-4 border-b border-slate-100 pb-2">
                  <button type="button" onClick={() => setUploadMode('link')} className={`text-[10px] font-black uppercase tracking-widest pb-2 border-b-2 transition-all ${uploadMode === 'link' ? 'border-wg-honorable text-wg-honorable' : 'border-transparent text-slate-400'}`}>Link URL</button>
                  <button type="button" onClick={() => setUploadMode('file')} className={`text-[10px] font-black uppercase tracking-widest pb-2 border-b-2 transition-all ${uploadMode === 'file' ? 'border-wg-honorable text-wg-honorable' : 'border-transparent text-slate-400'}`}>Upload File (Max 5MB)</button>
                </div>
                
                {uploadMode === 'link' ? (
                  <input required value={formData.link} onChange={e => setFormData({...formData, link: e.target.value})} placeholder="https://drive.google.com/..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-xs" />
                ) : (
                  <div 
                    onClick={() => fileInputRef.current?.click()} 
                    className="w-full h-24 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-all cursor-pointer group"
                  >
                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                    <svg className="w-6 h-6 text-slate-300 mb-2 group-hover:text-wg-honorable transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4 4m0 0L8 8m4-4v12" /></svg>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      {isUploading ? 'Converting...' : formData.link.startsWith('data:') ? '✅ File Loaded' : 'Click to Upload Asset'}
                    </span>
                  </div>
                )}
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

              <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tags</label>
                 <div className="flex gap-2 mb-2">
                   <input 
                     list="existing-tags"
                     value={tagInput}
                     onChange={(e) => setTagInput(e.target.value)}
                     onKeyDown={handleAddTag}
                     placeholder="Add a tag..."
                     className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-xs"
                   />
                   <datalist id="existing-tags">
                     {existingTags.map(tag => (
                       <option key={tag} value={tag} />
                     ))}
                   </datalist>
                   <button type="button" onClick={handleAddTag} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-xl font-bold text-xs transition-colors">Add</button>
                 </div>
                 <div className="flex flex-wrap gap-2">
                   {formData.tags.map(tag => (
                     <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 bg-wg-sky/30 text-wg-honorable text-[10px] font-black uppercase rounded-lg">
                       #{tag}
                       <button type="button" onClick={() => handleRemoveTag(tag)} className="hover:text-wg-burgundy ml-1">×</button>
                     </span>
                   ))}
                 </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
                  <button type="button" onClick={handleGeminiSuggest} disabled={isGenerating} className="text-[9px] font-black text-wg-ice hover:text-wg-honorable disabled:opacity-50 transition-all">✨ AI SUGGEST</button>
                </div>
                <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={3} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-xs resize-none" />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                <button type="button" onClick={onClose} className="px-6 py-3 text-slate-400 font-black uppercase tracking-widest text-[10px]">Cancel</button>
                <button type="submit" disabled={isUploading} className="px-8 py-3.5 bg-wg-honorable text-white font-black uppercase tracking-widest text-[10px] rounded-full hover:bg-wg-royal transition-all shadow-lg active:scale-95 disabled:opacity-50">
                  {editingAsset ? 'Update Asset' : 'Publish Asset'}
                </button>
              </div>
            </form>
          ) : activeTab === 'brands' ? (
            <div className="space-y-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex gap-2">
                <input value={newBrandName} onChange={e => setNewBrandName(e.target.value)} placeholder="New Entity Name" className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold" />
                <button onClick={() => { if(newBrandName){ onAddBrand({id:'', name:newBrandName, type:newBrandType, sortOrder: brands.length}); setNewBrandName(''); } }} className="px-6 bg-wg-honorable text-white font-black uppercase text-[10px] rounded-xl">Add</button>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Manage Entities</p>
                {brands.map((brand, index) => (
                  <div key={brand.id} draggable onDragStart={() => handleDragStart(index)} onDragOver={handleDragOver} onDrop={() => handleDrop(index, 'brands')} className={`flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl cursor-move group transition-all ${draggedIndex === index ? 'opacity-40 scale-95' : 'hover:border-wg-honorable/30 hover:shadow-md'}`}>
                    {editingItemId === brand.id ? (
                       <div className="flex-1 flex gap-2 mr-2">
                          <input 
                            value={editBuffer.name} 
                            onChange={(e) => setEditBuffer({...editBuffer, name: e.target.value})}
                            className="flex-1 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-bold"
                          />
                          <button onClick={() => { onUpdateBrand(editBuffer); setEditingItemId(null); }} className="px-3 bg-wg-honorable text-white rounded text-[10px] font-bold">Save</button>
                          <button onClick={() => setEditingItemId(null)} className="px-3 bg-slate-200 text-slate-500 rounded text-[10px] font-bold">Cancel</button>
                       </div>
                    ) : (
                        <div className="flex items-center gap-4">
                          <div className="text-slate-300 group-hover:text-wg-honorable"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M7 2a2 2 0 100 4h2a2 2 0 100-4H7zM11 2a2 2 0 100 4h2a2 2 0 100-4h-2zM7 8a2 2 0 100 4h2a2 2 0 100-4H7zM11 8a2 2 0 100 4h2a2 2 0 100-4h-2zM7 14a2 2 0 100 4h2a2 2 0 100-4H7zM11 14a2 2 0 100 4h2a2 2 0 100-4h-2z" /></svg></div>
                          <span className="text-xs font-black text-slate-900">{brand.name}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-1">
                        {!editingItemId && (
                            <button onClick={() => { setEditingItemId(brand.id); setEditBuffer(brand); }} className="p-2 text-slate-300 hover:text-wg-honorable transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                        )}
                        <button onClick={() => confirm(`Delete ${brand.name}?`) && onDeleteBrand(brand.id)} className="p-2 text-slate-300 hover:text-wg-burgundy transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
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
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Manage Formats</p>
                {assetTypes.map((type, index) => (
                  <div key={type.id} draggable onDragStart={() => handleDragStart(index)} onDragOver={handleDragOver} onDrop={() => handleDrop(index, 'types')} className={`flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl cursor-move group transition-all ${draggedIndex === index ? 'opacity-40 scale-95' : 'hover:border-wg-honorable/30 hover:shadow-md'}`}>
                    {editingItemId === type.id ? (
                       <div className="flex-1 flex gap-2 mr-2">
                          <input 
                            value={editBuffer.icon} 
                            onChange={(e) => setEditBuffer({...editBuffer, icon: e.target.value})}
                            className="w-10 px-1 py-1 bg-slate-50 border border-slate-200 rounded text-center"
                          />
                          <input 
                            value={editBuffer.name} 
                            onChange={(e) => setEditBuffer({...editBuffer, name: e.target.value})}
                            className="flex-1 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-bold"
                          />
                          <button onClick={() => { onUpdateAssetType(editBuffer); setEditingItemId(null); }} className="px-3 bg-wg-honorable text-white rounded text-[10px] font-bold">Save</button>
                          <button onClick={() => setEditingItemId(null)} className="px-3 bg-slate-200 text-slate-500 rounded text-[10px] font-bold">Cancel</button>
                       </div>
                    ) : (
                        <div className="flex items-center gap-4">
                          <div className="text-slate-300 group-hover:text-wg-honorable"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M7 2a2 2 0 100 4h2a2 2 0 100-4H7zM11 2a2 2 0 100 4h2a2 2 0 100-4h-2zM7 8a2 2 0 100 4h2a2 2 0 100-4H7zM11 8a2 2 0 100 4h2a2 2 0 100-4h-2zM7 14a2 2 0 100 4h2a2 2 0 100-4H7zM11 14a2 2 0 100 4h2a2 2 0 100-4h-2z" /></svg></div>
                          <div className="flex items-center gap-3"><span className="text-xl">{type.icon}</span><span className="text-xs font-black text-slate-900">{type.name}</span></div>
                        </div>
                    )}
                    <div className="flex items-center gap-1">
                        {!editingItemId && (
                            <button onClick={() => { setEditingItemId(type.id); setEditBuffer(type); }} className="p-2 text-slate-300 hover:text-wg-honorable transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                        )}
                        <button onClick={() => confirm(`Delete ${type.name}?`) && onDeleteAssetType(type.id)} className="p-2 text-slate-300 hover:text-wg-burgundy transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                    </div>
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

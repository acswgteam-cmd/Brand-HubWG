import React, { useState, useEffect, useRef } from 'react';
import { Asset, Brand, AssetType, BrandType } from '../types';
import { generateAssetMetadata } from '../services/geminiService';

interface AdminPanelProps {
  brands: Brand[];
  assetTypes: AssetType[];
  editingAsset: Asset | null;
  onSaveAsset: (asset: Omit<Asset, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => void;
  onClose: () => void; // Used as "Go Back" now
  onAddBrand: (brand: Brand) => void;
  onUpdateBrand: (brand: Brand) => void;
  onDeleteBrand: (id: string) => void;
  onAddAssetType: (type: AssetType) => void;
  onUpdateAssetType: (type: AssetType) => void;
  onDeleteAssetType: (id: string) => void;
  onReorderBrands: (brands: Brand[]) => void;
  onReorderTypes: (types: AssetType[]) => void;
  existingTags?: string[];
  activeView: 'admin-upload' | 'admin-brands' | 'admin-types';
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
  existingTags = [],
  activeView
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
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
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
    if (editingAsset && activeView === 'admin-upload') {
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
    } else {
        // Reset form for new upload
        setFormData({
            title: '',
            brandId: brands[0]?.id || '',
            typeId: assetTypes[0]?.id || '',
            description: '',
            link: '',
            tags: [],
            status: 'ACTIVE',
            sortOrder: 0
        });
    }
  }, [editingAsset, activeView]);

  const handleGeminiSuggest = async () => {
    if (!formData.title) return alert('Please enter a title first.');
    setIsGenerating(true);
    const brand = brands.find(b => b.id === formData.brandId)?.name || '';
    const type = assetTypes.find(t => t.id === formData.typeId)?.name || '';
    
    try {
      const result = await generateAssetMetadata(formData.title, brand, type);
      const lowerTags = (result.tags || []).map((t: string) => t.toLowerCase());
      setFormData(prev => ({
        ...prev,
        description: result.description,
        tags: [...new Set([...prev.tags, ...lowerTags])]
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

  const addTag = (val: string) => {
    const normalized = val.trim().toLowerCase();
    if (normalized && !formData.tags.includes(normalized)) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, normalized] }));
      setTagInput('');
      setShowTagSuggestions(false);
    }
  };

  const handleAddTagKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(tagInput);
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

  const filteredTags = existingTags.filter(t => 
    t.toLowerCase().includes(tagInput.toLowerCase()) && !formData.tags.includes(t)
  );

  return (
    <div className="flex flex-col gap-6 pb-20 max-w-4xl mx-auto">
      
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-3 text-[14px] text-coinbase-muted font-medium px-2">
         <button onClick={onClose} className="hover:text-coinbase-ink transition-colors">Admin</button>
         <span className="text-coinbase-hairline">/</span>
         <span className="text-coinbase-ink">
            {activeView === 'admin-upload' ? (editingAsset ? 'Edit Asset' : 'Upload Asset') :
             activeView === 'admin-brands' ? 'Manage Entities' : 'Manage Formats'}
         </span>
      </div>

      <div className="bg-white rounded-xl border border-coinbase-hairline shadow-soft overflow-hidden">
        <div className="p-8 lg:p-10">
          {activeView === 'admin-upload' ? (
            <form onSubmit={handleSaveAsset} className="space-y-8">
              <div className="flex items-center justify-between mb-2">
                 <h2 className="text-[24px] font-semibold text-coinbase-ink">{editingAsset ? 'Edit Asset' : 'New Asset Upload'}</h2>
              </div>
              
              <div className="space-y-2">
                <label className="text-[13px] font-semibold text-coinbase-muted uppercase tracking-wide">Asset Title</label>
                <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-3 bg-coinbase-canvas border border-coinbase-hairline rounded-md outline-none text-[15px] focus:border-coinbase-primary transition-colors placeholder:text-coinbase-muted" placeholder="e.g. Logo Horizontal" />
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-8 border-b border-coinbase-hairline pb-2">
                  <button type="button" onClick={() => setUploadMode('link')} className={`text-[13px] font-semibold uppercase tracking-wide pb-2 border-b-2 transition-all -mb-[9px] ${uploadMode === 'link' ? 'border-coinbase-primary text-coinbase-ink' : 'border-transparent text-coinbase-muted hover:text-coinbase-ink'}`}>Link URL</button>
                  <button type="button" onClick={() => setUploadMode('file')} className={`text-[13px] font-semibold uppercase tracking-wide pb-2 border-b-2 transition-all -mb-[9px] ${uploadMode === 'file' ? 'border-coinbase-primary text-coinbase-ink' : 'border-transparent text-coinbase-muted hover:text-coinbase-ink'}`}>Upload File (Max 5MB)</button>
                </div>
                
                {uploadMode === 'link' ? (
                  <input required value={formData.link} onChange={e => setFormData({...formData, link: e.target.value})} placeholder="https://drive.google.com/..." className="w-full px-4 py-3 bg-coinbase-canvas border border-coinbase-hairline rounded-md outline-none text-[15px] focus:border-coinbase-primary transition-colors placeholder:text-coinbase-muted mt-2" />
                ) : (
                  <div 
                    onClick={() => fileInputRef.current?.click()} 
                    className="w-full h-40 border-2 border-dashed border-coinbase-hairline rounded-md flex flex-col items-center justify-center bg-coinbase-canvas hover:bg-coinbase-surface-soft transition-all cursor-pointer group mt-2"
                  >
                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                    <svg className="w-8 h-8 text-coinbase-muted mb-3 group-hover:text-coinbase-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4 4m0 0L8 8m4-4v12" /></svg>
                    <span className="text-[13px] font-semibold text-coinbase-muted uppercase tracking-wide group-hover:text-coinbase-primary transition-colors">
                      {isUploading ? 'Converting...' : formData.link.startsWith('data:') ? 'File Loaded' : 'Click to Select File'}
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[13px] font-semibold text-coinbase-muted uppercase tracking-wide">Entity</label>
                  <select value={formData.brandId} onChange={e => setFormData({...formData, brandId: e.target.value})} className="w-full px-4 py-3 bg-coinbase-canvas border border-coinbase-hairline rounded-md outline-none text-[15px] focus:border-coinbase-primary transition-colors">
                    {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[13px] font-semibold text-coinbase-muted uppercase tracking-wide">Format</label>
                  <select value={formData.typeId} onChange={e => setFormData({...formData, typeId: e.target.value})} className="w-full px-4 py-3 bg-coinbase-canvas border border-coinbase-hairline rounded-md outline-none text-[15px] focus:border-coinbase-primary transition-colors">
                    {assetTypes.map(t => <option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2 relative">
                 <label className="text-[13px] font-semibold text-coinbase-muted uppercase tracking-wide">Tags</label>
                 <div className="flex gap-3 mb-3 relative">
                   <div className="flex-1 relative">
                     <input 
                       value={tagInput}
                       onChange={(e) => {
                         setTagInput(e.target.value);
                         setShowTagSuggestions(true);
                       }}
                       onFocus={() => setShowTagSuggestions(true)}
                       onBlur={() => setTimeout(() => setShowTagSuggestions(false), 200)}
                       onKeyDown={handleAddTagKey}
                       placeholder="Add a tag..."
                       className="w-full px-4 py-3 bg-coinbase-canvas border border-coinbase-hairline rounded-md outline-none text-[15px] focus:border-coinbase-primary transition-colors placeholder:text-coinbase-muted"
                     />
                     {showTagSuggestions && tagInput && filteredTags.length > 0 && (
                       <ul className="absolute top-full left-0 right-0 mt-2 bg-white border border-coinbase-hairline rounded-md max-h-40 overflow-y-auto z-50 py-2 shadow-soft">
                         {filteredTags.map(tag => (
                           <li 
                             key={tag}
                             onClick={() => addTag(tag)}
                             className="px-4 py-2 text-[15px] font-medium text-coinbase-ink hover:bg-coinbase-surface-soft cursor-pointer"
                           >
                             #{tag}
                           </li>
                         ))}
                       </ul>
                     )}
                   </div>
                   <button type="button" onClick={() => addTag(tagInput)} className="px-6 py-3 bg-coinbase-surface-strong text-coinbase-ink rounded-pill text-[15px] font-semibold hover:bg-coinbase-hairline transition-colors">Add</button>
                 </div>
                 <div className="flex flex-wrap gap-2 pt-1">
                   {formData.tags.map(tag => (
                     <span key={tag} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-coinbase-surface-strong text-coinbase-ink text-[12px] font-semibold uppercase tracking-wide rounded-pill">
                       #{tag}
                       <button type="button" onClick={() => handleRemoveTag(tag)} className="hover:text-ship-red text-coinbase-muted transition-colors">✕</button>
                     </span>
                   ))}
                 </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[13px] font-semibold text-coinbase-muted uppercase tracking-wide">Description</label>
                  <button type="button" onClick={handleGeminiSuggest} disabled={isGenerating} className="text-[12px] font-semibold text-coinbase-primary hover:text-coinbase-primary-active disabled:opacity-50 transition-colors uppercase tracking-wide flex items-center gap-1">
                    ✨ AI Suggest
                  </button>
                </div>
                <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={4} className="w-full px-4 py-3 bg-coinbase-canvas border border-coinbase-hairline rounded-md outline-none text-[15px] focus:border-coinbase-primary transition-colors resize-none placeholder:text-coinbase-muted" />
              </div>

              <div className="pt-8 flex justify-end gap-3 shrink-0">
                <button type="button" onClick={onClose} className="px-6 py-3 bg-white border border-coinbase-hairline text-coinbase-ink rounded-pill text-[16px] font-semibold hover:bg-coinbase-surface-soft transition-colors">Cancel</button>
                <button type="submit" disabled={isUploading} className="px-8 py-3 bg-coinbase-primary text-white rounded-pill text-[16px] font-semibold hover:bg-coinbase-primary-active transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-soft">
                  {editingAsset ? 'Update Asset' : 'Publish Asset'}
                </button>
              </div>
            </form>
          ) : activeView === 'admin-brands' ? (
            <div className="space-y-8">
              <h2 className="text-[24px] font-semibold text-coinbase-ink">Manage Entities</h2>
              <div className="bg-coinbase-surface-soft p-4 rounded-xl border border-coinbase-hairline flex gap-3">
                <input value={newBrandName} onChange={e => setNewBrandName(e.target.value)} placeholder="New Entity Name" className="flex-1 px-4 py-3 bg-white border border-coinbase-hairline rounded-md text-[15px] outline-none focus:border-coinbase-primary transition-colors placeholder:text-coinbase-muted" />
                <button onClick={() => { if(newBrandName){ onAddBrand({id:'', name:newBrandName, type:newBrandType, sortOrder: brands.length}); setNewBrandName(''); } }} className="px-8 py-3 bg-coinbase-primary text-white text-[15px] font-semibold rounded-pill hover:bg-coinbase-primary-active transition-colors">Add</button>
              </div>
              <div className="space-y-3">
                <p className="text-[12px] font-semibold text-coinbase-muted uppercase tracking-wide mb-3">Draggable List</p>
                {brands.map((brand, index) => (
                  <div key={brand.id} draggable onDragStart={() => handleDragStart(index)} onDragOver={handleDragOver} onDrop={() => handleDrop(index, 'brands')} className={`flex items-center justify-between p-4 bg-white border border-coinbase-hairline rounded-xl cursor-move group transition-all ${draggedIndex === index ? 'opacity-50 scale-[0.99]' : 'hover:shadow-soft'}`}>
                    {editingItemId === brand.id ? (
                       <div className="flex-1 flex gap-3 mr-3">
                          <input 
                            value={editBuffer.name} 
                            onChange={(e) => setEditBuffer({...editBuffer, name: e.target.value})}
                            className="flex-1 px-4 py-2 bg-coinbase-canvas border border-coinbase-hairline rounded-md text-[15px] outline-none focus:border-coinbase-primary"
                          />
                          <button onClick={() => { onUpdateBrand(editBuffer); setEditingItemId(null); }} className="px-5 py-2 bg-coinbase-primary text-white rounded-pill text-[14px] font-semibold hover:bg-coinbase-primary-active transition-colors">Save</button>
                          <button onClick={() => setEditingItemId(null)} className="px-5 py-2 bg-coinbase-surface-strong text-coinbase-ink rounded-pill text-[14px] font-semibold hover:bg-coinbase-hairline transition-colors">Cancel</button>
                       </div>
                    ) : (
                        <div className="flex items-center gap-4">
                          <div className="text-coinbase-muted group-hover:text-coinbase-ink transition-colors cursor-grab"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg></div>
                          <span className="text-[16px] font-medium text-coinbase-ink">{brand.name}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!editingItemId && (
                            <button onClick={() => { setEditingItemId(brand.id); setEditBuffer(brand); }} className="p-2 text-coinbase-muted hover:text-coinbase-primary hover:bg-coinbase-surface-soft transition-colors rounded-full"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                        )}
                        <button onClick={() => confirm(`Delete ${brand.name}?`) && onDeleteBrand(brand.id)} className="p-2 text-coinbase-muted hover:text-ship-red hover:bg-[#fff5f5] transition-colors rounded-full"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-8">
               <h2 className="text-[24px] font-semibold text-coinbase-ink">Manage Formats</h2>
              <div className="bg-coinbase-surface-soft p-4 rounded-xl border border-coinbase-hairline flex gap-3">
                <input value={newTypeIcon} onChange={e => setNewTypeIcon(e.target.value)} className="w-14 px-3 py-3 bg-white border border-coinbase-hairline rounded-md text-center text-[18px] outline-none focus:border-coinbase-primary transition-colors" />
                <input value={newTypeName} onChange={e => setNewTypeName(e.target.value)} placeholder="New Format Name" className="flex-1 px-4 py-3 bg-white border border-coinbase-hairline rounded-md text-[15px] outline-none focus:border-coinbase-primary transition-colors placeholder:text-coinbase-muted" />
                <button onClick={() => { if(newTypeName){ onAddAssetType({id:'', name:newTypeName, icon:newTypeIcon, sortOrder: assetTypes.length}); setNewTypeName(''); } }} className="px-8 py-3 bg-coinbase-primary text-white text-[15px] font-semibold rounded-pill hover:bg-coinbase-primary-active transition-colors">Add</button>
              </div>
              <div className="space-y-3">
                <p className="text-[12px] font-semibold text-coinbase-muted uppercase tracking-wide mb-3">Draggable List</p>
                {assetTypes.map((type, index) => (
                  <div key={type.id} draggable onDragStart={() => handleDragStart(index)} onDragOver={handleDragOver} onDrop={() => handleDrop(index, 'types')} className={`flex items-center justify-between p-4 bg-white border border-coinbase-hairline rounded-xl cursor-move group transition-all ${draggedIndex === index ? 'opacity-50 scale-[0.99]' : 'hover:shadow-soft'}`}>
                    {editingItemId === type.id ? (
                       <div className="flex-1 flex gap-3 mr-3">
                          <input 
                            value={editBuffer.icon} 
                            onChange={(e) => setEditBuffer({...editBuffer, icon: e.target.value})}
                            className="w-14 px-3 py-2 bg-coinbase-canvas border border-coinbase-hairline rounded-md text-center text-[18px] outline-none focus:border-coinbase-primary"
                          />
                          <input 
                            value={editBuffer.name} 
                            onChange={(e) => setEditBuffer({...editBuffer, name: e.target.value})}
                            className="flex-1 px-4 py-2 bg-coinbase-canvas border border-coinbase-hairline rounded-md text-[15px] outline-none focus:border-coinbase-primary"
                          />
                          <button onClick={() => { onUpdateAssetType(editBuffer); setEditingItemId(null); }} className="px-5 py-2 bg-coinbase-primary text-white rounded-pill text-[14px] font-semibold hover:bg-coinbase-primary-active transition-colors">Save</button>
                          <button onClick={() => setEditingItemId(null)} className="px-5 py-2 bg-coinbase-surface-strong text-coinbase-ink rounded-pill text-[14px] font-semibold hover:bg-coinbase-hairline transition-colors">Cancel</button>
                       </div>
                    ) : (
                        <div className="flex items-center gap-4">
                          <div className="text-coinbase-muted group-hover:text-coinbase-ink transition-colors cursor-grab"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg></div>
                          <div className="flex items-center gap-3"><span className="text-[20px]">{type.icon}</span><span className="text-[16px] font-medium text-coinbase-ink">{type.name}</span></div>
                        </div>
                    )}
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!editingItemId && (
                            <button onClick={() => { setEditingItemId(type.id); setEditBuffer(type); }} className="p-2 text-coinbase-muted hover:text-coinbase-primary hover:bg-coinbase-surface-soft transition-colors rounded-full"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                        )}
                        <button onClick={() => confirm(`Delete ${type.name}?`) && onDeleteAssetType(type.id)} className="p-2 text-coinbase-muted hover:text-ship-red hover:bg-[#fff5f5] transition-colors rounded-full"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
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


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
    <div className="flex flex-col gap-8 pb-20">
      
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-sm font-bold text-slate-400">
         <button onClick={onClose} className="hover:text-slate-600 transition-colors">Admin</button>
         <span>/</span>
         <span className="text-slate-900">
            {activeView === 'admin-upload' ? (editingAsset ? 'Edit Asset' : 'Upload Asset') :
             activeView === 'admin-brands' ? 'Manage Entities' : 'Manage Formats'}
         </span>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm max-w-4xl">
        <div className="p-8">
          {activeView === 'admin-upload' ? (
            <form onSubmit={handleSaveAsset} className="space-y-6">
              <div className="flex items-center justify-between mb-2">
                 <h2 className="text-xl font-extrabold text-slate-900">{editingAsset ? 'Edit Asset' : 'New Asset Upload'}</h2>
              </div>
              
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Asset Title</label>
                <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-sm focus:border-wg-honorable" placeholder="e.g. Werkudara Logo Horizontal" />
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-4 border-b border-slate-100 pb-2">
                  <button type="button" onClick={() => setUploadMode('link')} className={`text-[10px] font-black uppercase tracking-widest pb-2 border-b-2 transition-all ${uploadMode === 'link' ? 'border-wg-honorable text-wg-honorable' : 'border-transparent text-slate-400'}`}>Link URL</button>
                  <button type="button" onClick={() => setUploadMode('file')} className={`text-[10px] font-black uppercase tracking-widest pb-2 border-b-2 transition-all ${uploadMode === 'file' ? 'border-wg-honorable text-wg-honorable' : 'border-transparent text-slate-400'}`}>Upload File (Max 5MB)</button>
                </div>
                
                {uploadMode === 'link' ? (
                  <input required value={formData.link} onChange={e => setFormData({...formData, link: e.target.value})} placeholder="https://drive.google.com/..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-xs" />
                ) : (
                  <div 
                    onClick={() => fileInputRef.current?.click()} 
                    className="w-full h-32 border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-all cursor-pointer group"
                  >
                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                    <svg className="w-8 h-8 text-slate-300 mb-2 group-hover:text-wg-honorable transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4 4m0 0L8 8m4-4v12" /></svg>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      {isUploading ? 'Converting...' : formData.link.startsWith('data:') ? '✅ File Loaded' : 'Click to Select File'}
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Entity</label>
                  <select value={formData.brandId} onChange={e => setFormData({...formData, brandId: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-xs">
                    {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Format</label>
                  <select value={formData.typeId} onChange={e => setFormData({...formData, typeId: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-xs">
                    {assetTypes.map(t => <option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1 relative">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tags</label>
                 <div className="flex gap-2 mb-2 relative">
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
                       className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-xs"
                     />
                     {showTagSuggestions && tagInput && filteredTags.length > 0 && (
                       <ul className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-32 overflow-y-auto z-50">
                         {filteredTags.map(tag => (
                           <li 
                             key={tag}
                             onClick={() => addTag(tag)}
                             className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-wg-honorable cursor-pointer border-b border-slate-50 last:border-0"
                           >
                             #{tag}
                           </li>
                         ))}
                       </ul>
                     )}
                   </div>
                   <button type="button" onClick={() => addTag(tagInput)} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg font-bold text-xs transition-colors">Add</button>
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
                <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={3} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-xs resize-none" />
              </div>

              <div className="pt-6 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                <button type="button" onClick={onClose} className="px-6 py-3 text-slate-400 font-black uppercase tracking-widest text-[10px] hover:text-slate-600">Cancel</button>
                <button type="submit" disabled={isUploading} className="px-8 py-3 bg-wg-honorable text-white font-black uppercase tracking-widest text-[10px] rounded-lg hover:bg-wg-royal transition-all shadow-lg active:scale-95 disabled:opacity-50">
                  {editingAsset ? 'Update Asset' : 'Publish Asset'}
                </button>
              </div>
            </form>
          ) : activeView === 'admin-brands' ? (
            <div className="space-y-6">
              <h2 className="text-xl font-extrabold text-slate-900">Manage Entities</h2>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex gap-2">
                <input value={newBrandName} onChange={e => setNewBrandName(e.target.value)} placeholder="New Entity Name" className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-lg text-xs font-bold" />
                <button onClick={() => { if(newBrandName){ onAddBrand({id:'', name:newBrandName, type:newBrandType, sortOrder: brands.length}); setNewBrandName(''); } }} className="px-6 bg-wg-honorable text-white font-black uppercase text-[10px] rounded-lg">Add</button>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Draggable List</p>
                {brands.map((brand, index) => (
                  <div key={brand.id} draggable onDragStart={() => handleDragStart(index)} onDragOver={handleDragOver} onDrop={() => handleDrop(index, 'brands')} className={`flex items-center justify-between p-4 bg-white border border-slate-100 rounded-lg cursor-move group transition-all ${draggedIndex === index ? 'opacity-40 scale-95' : 'hover:border-wg-honorable/30 hover:shadow-md'}`}>
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
               <h2 className="text-xl font-extrabold text-slate-900">Manage Formats</h2>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex gap-2">
                <input value={newTypeIcon} onChange={e => setNewTypeIcon(e.target.value)} className="w-16 px-2 py-3 bg-white border border-slate-200 rounded-lg text-center" />
                <input value={newTypeName} onChange={e => setNewTypeName(e.target.value)} placeholder="New Format Name" className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-lg text-xs font-bold" />
                <button onClick={() => { if(newTypeName){ onAddAssetType({id:'', name:newTypeName, icon:newTypeIcon, sortOrder: assetTypes.length}); setNewTypeName(''); } }} className="px-6 bg-wg-honorable text-white font-black uppercase text-[10px] rounded-lg">Add</button>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Draggable List</p>
                {assetTypes.map((type, index) => (
                  <div key={type.id} draggable onDragStart={() => handleDragStart(index)} onDragOver={handleDragOver} onDrop={() => handleDrop(index, 'types')} className={`flex items-center justify-between p-4 bg-white border border-slate-100 rounded-lg cursor-move group transition-all ${draggedIndex === index ? 'opacity-40 scale-95' : 'hover:border-wg-honorable/30 hover:shadow-md'}`}>
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

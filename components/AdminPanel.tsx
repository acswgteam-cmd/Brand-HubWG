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
  onDeleteAssetType
}) => {
  const [formData, setFormData] = useState({
    title: '',
    brandId: brands[0]?.id || '',
    typeId: assetTypes[0]?.id || '',
    description: '',
    link: '',
    tags: [] as string[],
    status: 'ACTIVE' as 'ACTIVE' | 'ARCHIVED'
  });
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [activeTab, setActiveTab] = useState<'asset' | 'brands' | 'types'>('asset');
  const [uploadMode, setUploadMode] = useState<'link' | 'file'>('link');
  
  // Brand management state
  const [newBrandName, setNewBrandName] = useState('');
  const [newBrandType, setNewBrandType] = useState<BrandType>('UNIT');
  const [editingBrandId, setEditingBrandId] = useState<string | null>(null);

  // Asset Type management state
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeIcon, setNewTypeIcon] = useState('📁');
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  
  const [isUploading, setIsUploading] = useState(false);
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
        status: editingAsset.status
      });
      if (editingAsset.link.startsWith('data:')) {
        setUploadMode('file');
      }
    }
  }, [editingAsset, brands, assetTypes]);

  const handleGeminiSuggest = async () => {
    if (!formData.title) return alert('Please enter a title first.');
    setIsGenerating(true);
    const brand = brands.find(b => b.id === formData.brandId)?.name || '';
    const type = assetTypes.find(t => t.id === formData.typeId)?.name || '';
    
    const result = await generateAssetMetadata(formData.title, brand, type);
    setFormData(prev => ({
      ...prev,
      description: result.description,
      tags: [...new Set([...prev.tags, ...result.tags])]
    }));
    setIsGenerating(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("File size exceeds 5MB limit.");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setFormData(prev => ({ ...prev, link: base64 }));
      setIsUploading(false);
      if (!formData.title) {
        setFormData(prev => ({ ...prev, title: file.name.split('.')[0] }));
      }
    };
    reader.onerror = () => {
      alert("Failed to read file.");
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.link) {
      alert("Please provide a link or upload a file.");
      return;
    }
    onSaveAsset({
      ...formData,
      id: editingAsset?.id
    });
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tagToRemove) }));
  };

  const handleBrandSubmit = () => {
    if (!newBrandName.trim()) return;
    
    if (editingBrandId) {
      onUpdateBrand({
        id: editingBrandId,
        name: newBrandName.trim(),
        type: newBrandType
      });
      setEditingBrandId(null);
    } else {
      onAddBrand({
        id: 'brand_' + Date.now(),
        name: newBrandName.trim(),
        type: newBrandType
      });
    }
    
    setNewBrandName('');
    setNewBrandType('UNIT');
  };

  const startEditBrand = (brand: Brand) => {
    setEditingBrandId(brand.id);
    setNewBrandName(brand.name);
    setNewBrandType(brand.type);
    setActiveTab('brands');
  };

  const handleTypeSubmit = () => {
    if (!newTypeName.trim()) return;
    
    if (editingTypeId) {
      onUpdateAssetType({
        id: editingTypeId,
        name: newTypeName.trim(),
        icon: newTypeIcon.trim() || '📁'
      });
      setEditingTypeId(null);
    } else {
      onAddAssetType({
        id: 'type_' + Date.now(),
        name: newTypeName.trim(),
        icon: newTypeIcon.trim() || '📁'
      });
    }
    
    setNewTypeName('');
    setNewTypeIcon('📁');
  };

  const startEditType = (type: AssetType) => {
    setEditingTypeId(type.id);
    setNewTypeName(type.name);
    setNewTypeIcon(type.icon);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        <div className="flex bg-slate-50 border-b border-slate-100">
          <button 
            onClick={() => setActiveTab('asset')}
            className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === 'asset' ? 'bg-white text-wg-honorable border-b-2 border-wg-honorable' : 'text-slate-400 hover:text-slate-600'}`}
          >
            {editingAsset ? 'Edit Asset' : 'Upload Asset'}
          </button>
          <button 
            onClick={() => setActiveTab('brands')}
            className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === 'brands' ? 'bg-white text-wg-honorable border-b-2 border-wg-honorable' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Entities
          </button>
          <button 
            onClick={() => setActiveTab('types')}
            className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === 'types' ? 'bg-white text-wg-honorable border-b-2 border-wg-honorable' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Asset Types
          </button>
          <button onClick={onClose} className="p-4 text-slate-300 hover:text-wg-burgundy transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-8 overflow-y-auto">
          {activeTab === 'asset' ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Asset Title</label>
                <input 
                  required
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  placeholder="e.g. Logo Horizontal"
                  className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-wg-honorable/10 focus:border-wg-honorable outline-none font-bold text-slate-900 placeholder:text-slate-300 transition-all"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-6 border-b border-slate-100 pb-2">
                  <button 
                    type="button" 
                    onClick={() => setUploadMode('link')}
                    className={`text-[10px] font-black uppercase tracking-widest pb-2 border-b-2 transition-all ${uploadMode === 'link' ? 'border-wg-honorable text-wg-honorable' : 'border-transparent text-slate-400'}`}
                  >
                    External Link
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setUploadMode('file')}
                    className={`text-[10px] font-black uppercase tracking-widest pb-2 border-b-2 transition-all ${uploadMode === 'file' ? 'border-wg-honorable text-wg-honorable' : 'border-transparent text-slate-400'}`}
                  >
                    File Upload
                  </button>
                </div>

                {uploadMode === 'link' ? (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Link (GDrive/URL)</label>
                    <input 
                      required={uploadMode === 'link'}
                      value={uploadMode === 'link' ? formData.link : ''}
                      onChange={e => setFormData({...formData, link: e.target.value})}
                      placeholder="https://..."
                      className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-wg-honorable/10 focus:border-wg-honorable outline-none font-bold text-slate-900 transition-all"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Local File</label>
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-32 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center bg-slate-50 hover:bg-wg-sky/5 cursor-pointer transition-all group"
                    >
                      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} accept="image/*,application/pdf,video/*" />
                      {isUploading ? (
                        <div className="text-wg-honorable animate-pulse font-black text-xs uppercase tracking-widest">Uploading...</div>
                      ) : formData.link.startsWith('data:') ? (
                        <div className="flex flex-col items-center gap-2 text-wg-honorable">
                          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/></svg>
                          <span className="font-black text-[10px] uppercase tracking-widest">File Attached</span>
                        </div>
                      ) : (
                        <>
                          <svg className="w-8 h-8 text-slate-300 group-hover:text-wg-honorable transition-colors mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] group-hover:text-wg-honorable transition-colors">Drag & Drop File Here</span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Entity</label>
                  <select 
                    value={formData.brandId}
                    onChange={e => setFormData({...formData, brandId: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-wg-honorable/10 outline-none font-bold text-slate-900"
                  >
                    {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Format</label>
                  <select 
                    value={formData.typeId}
                    onChange={e => setFormData({...formData, typeId: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-wg-honorable/10 outline-none font-bold text-slate-900"
                  >
                    {assetTypes.map(t => <option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
                  <button type="button" onClick={handleGeminiSuggest} disabled={isGenerating} className="text-[9px] font-black text-wg-ice hover:text-wg-honorable flex items-center gap-1.5 transition-colors group disabled:opacity-50">
                    <span className="group-hover:rotate-12 transition-transform">✨</span>
                    AI SUGGESTION
                  </button>
                </div>
                <textarea 
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  rows={3}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-wg-honorable/10 focus:border-wg-honorable outline-none font-bold text-slate-700 leading-relaxed transition-all resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tags</label>
                <div className="flex gap-2">
                  <input 
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    placeholder="New tag..."
                    className="flex-1 px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-wg-honorable/10 outline-none font-bold"
                  />
                  <button type="button" onClick={handleAddTag} className="px-6 py-3 bg-slate-100 text-wg-honorable font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-wg-sky/20 transition-all">Add</button>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  {formData.tags.map(tag => (
                    <span key={tag} className="flex items-center gap-2 px-3 py-1.5 bg-wg-honorable/5 text-wg-honorable text-[10px] font-black uppercase tracking-widest rounded-xl border border-wg-honorable/10">
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)} className="hover:text-wg-burgundy">×</button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-8 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={onClose} className="px-8 py-3 text-slate-400 hover:text-slate-600 font-black uppercase tracking-widest text-[10px] transition-colors">Cancel</button>
                <button type="submit" disabled={isUploading} className="px-10 py-4 bg-wg-honorable text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-full hover:bg-wg-royal shadow-xl shadow-wg-honorable/20 transition-all active:scale-95 disabled:opacity-50">
                  {editingAsset ? 'Save Changes' : 'Publish Asset'}
                </button>
              </div>
            </form>
          ) : activeTab === 'brands' ? (
            <div className="space-y-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{editingBrandId ? 'Edit Entity' : 'New Entity'}</label>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input value={newBrandName} onChange={e => setNewBrandName(e.target.value)} placeholder="Entity Name" className="flex-1 px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-wg-honorable/10 outline-none font-bold" />
                    <select value={newBrandType} onChange={e => setNewBrandType(e.target.value as BrandType)} className="px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-black text-[10px] tracking-widest">
                      <option value="UNIT">UNIT</option>
                      <option value="ENTITAS">ENTITAS</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleBrandSubmit} className="flex-1 py-4 bg-wg-honorable text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-wg-royal transition-all active:scale-95">{editingBrandId ? 'Update Entity' : 'Create Entity'}</button>
                    {editingBrandId && <button onClick={() => { setEditingBrandId(null); setNewBrandName(''); }} className="px-6 py-4 bg-slate-100 text-slate-400 font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-slate-200 transition-all">Cancel</button>}
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Entities</label>
                <div className="grid grid-cols-1 gap-2">
                  {brands.map(brand => (
                    <div key={brand.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
                      <div className="flex items-center gap-3">
                        <span className="font-extrabold text-slate-900 text-sm">{brand.name}</span>
                        <span className={`px-2 py-0.5 text-[8px] font-black rounded uppercase tracking-tighter ${brand.type === 'ENTITAS' ? 'bg-wg-magenta/10 text-wg-magenta' : 'bg-wg-ice/10 text-wg-ice'}`}>{brand.type}</span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => startEditBrand(brand)} className="p-2 text-slate-300 hover:text-wg-honorable transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                        <button onClick={() => onDeleteBrand(brand.id)} className="p-2 text-slate-300 hover:text-wg-burgundy transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{editingTypeId ? 'Edit Asset Type' : 'New Asset Type'}</label>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input value={newTypeIcon} onChange={e => setNewTypeIcon(e.target.value)} placeholder="Icon" className="w-20 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-center text-xl outline-none" />
                    <input value={newTypeName} onChange={e => setNewTypeName(e.target.value)} placeholder="Type Name (e.g. Logos, Videos)" className="flex-1 px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-wg-honorable/10 outline-none font-bold" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleTypeSubmit} className="flex-1 py-4 bg-wg-honorable text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-wg-royal transition-all active:scale-95">{editingTypeId ? 'Update Type' : 'Create Type'}</button>
                    {editingTypeId && <button onClick={() => { setEditingTypeId(null); setNewTypeName(''); setNewTypeIcon('📁'); }} className="px-6 py-4 bg-slate-100 text-slate-400 font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-slate-200 transition-all">Cancel</button>}
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Supported Formats</label>
                <div className="grid grid-cols-1 gap-2">
                  {assetTypes.map(type => (
                    <div key={type.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-lg shadow-sm border border-slate-100">{type.icon}</div>
                        <span className="font-extrabold text-slate-900 text-sm">{type.name}</span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => startEditType(type)} className="p-2 text-slate-300 hover:text-wg-honorable transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                        <button onClick={() => onDeleteAssetType(type.id)} className="p-2 text-slate-300 hover:text-wg-burgundy transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
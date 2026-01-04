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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.link) return alert("Please provide a link or upload a file.");
    onSaveAsset({ ...formData, id: editingAsset?.id });
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }));
      setTagInput('');
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-2 lg:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-[1.5rem] lg:rounded-2xl shadow-2xl flex flex-col max-h-[95vh] lg:max-h-[90vh] overflow-hidden">
        {/* Scrollable Tabs */}
        <div className="flex bg-slate-50 border-b border-slate-100 overflow-x-auto no-scrollbar shrink-0">
          <button 
            onClick={() => setActiveTab('asset')}
            className={`flex-1 min-w-[120px] py-4 text-[9px] lg:text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === 'asset' ? 'bg-white text-wg-honorable border-b-2 border-wg-honorable' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Asset
          </button>
          <button 
            onClick={() => setActiveTab('brands')}
            className={`flex-1 min-w-[120px] py-4 text-[9px] lg:text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === 'brands' ? 'bg-white text-wg-honorable border-b-2 border-wg-honorable' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Entities
          </button>
          <button 
            onClick={() => setActiveTab('types')}
            className={`flex-1 min-w-[120px] py-4 text-[9px] lg:text-[10px] font-black uppercase tracking-[0.2em] transition-all ${activeTab === 'types' ? 'bg-white text-wg-honorable border-b-2 border-wg-honorable' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Formats
          </button>
          <button onClick={onClose} className="p-4 text-slate-300 hover:text-wg-burgundy transition-colors shrink-0 sticky right-0 bg-slate-50 lg:bg-transparent">
            <svg className="w-5 h-5 lg:w-6 lg:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-5 lg:p-8 overflow-y-auto">
          {activeTab === 'asset' ? (
            <form onSubmit={handleSubmit} className="space-y-5 lg:space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Asset Title</label>
                <input 
                  required
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  placeholder="e.g. Logo Horizontal"
                  className="w-full px-4 lg:px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl lg:rounded-2xl focus:ring-4 focus:ring-wg-honorable/10 focus:border-wg-honorable outline-none font-bold text-sm lg:text-base"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-4 border-b border-slate-100 pb-2">
                  <button type="button" onClick={() => setUploadMode('link')} className={`text-[10px] font-black uppercase tracking-widest pb-2 border-b-2 transition-all ${uploadMode === 'link' ? 'border-wg-honorable text-wg-honorable' : 'border-transparent text-slate-400'}`}>Link</button>
                  <button type="button" onClick={() => setUploadMode('file')} className={`text-[10px] font-black uppercase tracking-widest pb-2 border-b-2 transition-all ${uploadMode === 'file' ? 'border-wg-honorable text-wg-honorable' : 'border-transparent text-slate-400'}`}>Upload</button>
                </div>

                {uploadMode === 'link' ? (
                  <input required value={uploadMode === 'link' ? formData.link : ''} onChange={e => setFormData({...formData, link: e.target.value})} placeholder="https://drive.google.com/..." className="w-full px-4 lg:px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl lg:rounded-2xl outline-none font-bold text-xs" />
                ) : (
                  <div onClick={() => fileInputRef.current?.click()} className="w-full h-24 lg:h-32 border-2 border-dashed border-slate-200 rounded-xl lg:rounded-2xl flex flex-col items-center justify-center bg-slate-50 hover:bg-wg-sky/5 cursor-pointer transition-all">
                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} accept="image/*,application/pdf,video/*" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{isUploading ? 'Uploading...' : formData.link.startsWith('data:') ? '✅ File Ready' : 'Drop File Here'}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
                  <button type="button" onClick={handleGeminiSuggest} disabled={isGenerating} className="text-[8px] lg:text-[9px] font-black text-wg-ice hover:text-wg-honorable flex items-center gap-1.5 transition-colors disabled:opacity-50">✨ AI SUGGEST</button>
                </div>
                <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={2} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-xs lg:text-sm leading-relaxed" />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tags</label>
                <div className="flex gap-2">
                  <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTag())} placeholder="New tag..." className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-xs" />
                  <button type="button" onClick={handleAddTag} className="px-4 py-2.5 bg-slate-100 text-wg-honorable font-black uppercase text-[9px] tracking-widest rounded-xl">Add</button>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {formData.tags.map(tag => (
                    <span key={tag} className="flex items-center gap-2 px-2.5 py-1.5 bg-wg-honorable/5 text-wg-honorable text-[8px] font-black uppercase tracking-widest rounded-lg border border-wg-honorable/10">
                      {tag} <button type="button" onClick={() => setFormData(p => ({...p, tags: p.tags.filter(t => t !== tag)}))}>×</button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                <button type="button" onClick={onClose} className="px-6 py-3 text-slate-400 font-black uppercase tracking-widest text-[10px]">Cancel</button>
                <button type="submit" disabled={isUploading} className="px-8 py-3.5 bg-wg-honorable text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-full hover:bg-wg-royal shadow-lg shadow-wg-honorable/10 transition-all active:scale-95 disabled:opacity-50">
                  {editingAsset ? 'Save' : 'Publish'}
                </button>
              </div>
            </form>
          ) : (
             <div className="text-center py-10">
                <p className="text-slate-400 text-xs font-medium">Brand and Format management is optimized for desktop view, but functional here.</p>
                {/* Simplified lists for mobile entities/types would go here but keeping original logic for consistency */}
                <div className="mt-6 text-left space-y-4">
                  <input 
                    value={activeTab === 'brands' ? newBrandName : newTypeName}
                    onChange={e => activeTab === 'brands' ? setNewBrandName(e.target.value) : setNewTypeName(e.target.value)}
                    placeholder={`New ${activeTab === 'brands' ? 'Brand' : 'Type'} Name`}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-xs"
                  />
                  <button 
                    onClick={() => activeTab === 'brands' ? (newBrandName && (onAddBrand({id: 'b'+Date.now(), name: newBrandName, type: newBrandType}), setNewBrandName(''))) : (newTypeName && (onAddAssetType({id: 't'+Date.now(), name: newTypeName, icon: newTypeIcon}), setNewTypeName('')))}
                    className="w-full py-4 bg-wg-honorable text-white font-black uppercase tracking-widest text-[10px] rounded-xl"
                  >
                    Add {activeTab === 'brands' ? 'Entity' : 'Format'}
                  </button>
                </div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;

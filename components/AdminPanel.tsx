import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Upload, FloppyDisk, Menu, EditPencil, Trash, PageEdit, Calendar, Eye, Clock, Page, Link, Building, Label, Bookmark, Lock, LightBulb } from 'iconoir-react';
import { Asset, Brand, AssetType, BrandType, AssetFileMetadata } from '../types';
import { getEmojiIcon } from './IconHelper';
import { generateAssetMetadata } from '../services/geminiService';
import * as service from '../services/assetService';
import AssetTimelinePanel from './AssetTimelinePanel';
import {
  extractLocalFileMetadata,
  extractGoogleDriveFileId,
  fetchGoogleDriveMetadata,
  detectMetadataFromUrl,
  formatBytes,
} from '../services/metadataService';
const FORMAT_ICONS = [
  { key: 'folder', label: 'Folder / Archive' },
  { key: 'page', label: 'Document / Page' },
  { key: 'palette', label: 'Palette / Brand Logo' },
  { key: 'image', label: 'Image / Photography' },
  { key: 'ruler', label: 'Ruler / Guidelines' },
  { key: 'presentation', label: 'Presentation / Stats' },
  { key: 'video', label: 'Video / Animation' },
  { key: 'book', label: 'Book / Manual' },
  { key: 'internet', label: 'Web / Internet' }
];

const normalizeIconKey = (icon: string): string => {
  const clean = icon.trim();
  switch (clean) {
    case '📁': return 'folder';
    case '📄': return 'page';
    case '🎨': return 'palette';
    case '🖼️': return 'image';
    case '📐': return 'ruler';
    case '📊': return 'presentation';
    case '🎥': return 'video';
    case '📖': return 'book';
    case '🌐': return 'internet';
    default: return clean.toLowerCase();
  }
};

interface AdminPanelProps {
  brands: Brand[];
  assetTypes: AssetType[];
  assets?: Asset[];
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
  assets = [],
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
    status: 'PUBLISHED' as 'PUBLISHED' | 'DRAFT',
    sortOrder: 0,
    version: 1,
    changelog: '',
    updateIntervalMonths: null as number | null,
    nextUpdateDue: null as string | null,
    customThumbnail: null as string | null,
  });
  
  const [tagInput, setTagInput] = useState('');
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [uploadMode, setUploadMode] = useState<'link' | 'file'>('link');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editBuffer, setEditBuffer] = useState<any>(null);
  const [rightSidebarTab, setRightSidebarTab] = useState<'preview' | 'timeline'>('preview');

  const [newBrandName, setNewBrandName] = useState('');
  const [newBrandType, setNewBrandType] = useState<BrandType>('UNIT');
  const [newBrandLogo, setNewBrandLogo] = useState('');
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeIcon, setNewTypeIcon] = useState('folder');
  const [isNewIconDropdownOpen, setIsNewIconDropdownOpen] = useState(false);
  const [isEditIconDropdownOpen, setIsEditIconDropdownOpen] = useState(false);
  
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFetchingMeta, setIsFetchingMeta] = useState(false);
  const [fileMetadata, setFileMetadata] = useState<AssetFileMetadata | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States to track drag over
  const [isDragOverAsset, setIsDragOverAsset] = useState(false);
  const [isDragOverThumbnail, setIsDragOverThumbnail] = useState(false);

  // Process Asset File (direct upload / drag-drop)
  const processAssetFile = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      alert("File size exceeds 5MB limit.");
      return;
    }
    setIsUploading(true);

    // Extract real metadata BEFORE converting to base64
    const meta = await extractLocalFileMetadata(file);
    setFileMetadata(meta);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setFormData(prev => ({ ...prev, link: base64 }));
      setIsUploading(false);
      if (!formData.title) setFormData(prev => ({ ...prev, title: file.name.split('.')[0] }));
    };
    reader.readAsDataURL(file);
  };

  // Process Thumbnail File (upload / drag-drop / paste)
  const processThumbnailFile = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      alert("Ukuran gambar maksimal 5MB.");
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxW = 600;
        const maxH = 400;
        let width = img.width;
        let height = img.height;
        
        if (width > maxW || height > maxH) {
          const ratio = Math.min(maxW / width, maxH / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const webpDataUrl = canvas.toDataURL('image/webp', 0.85);
          setFormData(prev => ({ ...prev, customThumbnail: webpDataUrl }));
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Paste Event Listener for Custom Thumbnail
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (activeView !== 'admin-upload') return;
      
      const items = e.clipboardData?.items;
      if (!items) return;
      
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            processThumbnailFile(file);
            break;
          }
        }
      }
    };
    
    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [activeView]);

  // Extract all unique tags in the system to present as suggestion pills
  const popularSystemTags = useMemo(() => {
    const allTags = assets.flatMap(a => a.tags || []);
    const unique = Array.from(new Set(allTags)).map(t => t.toLowerCase());
    return unique.filter(t => !formData.tags.includes(t)).slice(0, 12);
  }, [assets, formData.tags]);

  useEffect(() => {
    setRightSidebarTab('preview');
    if (editingAsset && activeView === 'admin-upload') {
      setFormData({
        title: editingAsset.title,
        brandId: editingAsset.brandId,
        typeId: editingAsset.typeId,
        description: editingAsset.description || '',
        link: editingAsset.link,
        tags: editingAsset.tags,
        status: editingAsset.status,
        sortOrder: editingAsset.sortOrder || 0,
        version: editingAsset.version ?? 1,
        changelog: '',
        updateIntervalMonths: editingAsset.updateIntervalMonths ?? null,
        nextUpdateDue: editingAsset.nextUpdateDue ?? null,
        customThumbnail: editingAsset.customThumbnail ?? null,
      });
      setFileMetadata(editingAsset.fileMetadata ?? null);
      if (editingAsset.link.startsWith('data:')) {
        setUploadMode('file');
      } else {
        setUploadMode('link');
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
            status: 'PUBLISHED',
            sortOrder: 0,
            version: 1,
            changelog: '',
            updateIntervalMonths: null,
            nextUpdateDue: null,
            customThumbnail: null,
        });
        setFileMetadata(null);
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
    if (file) await processAssetFile(file);
  };

  const handleBrandLogoChange = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("Ukuran gambar maksimal 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (isEdit) {
        setEditBuffer((prev: any) => ({ ...prev, logo: base64 }));
      } else {
        setNewBrandLogo(base64);
      }
    };
    reader.readAsDataURL(file);
  };

  // Fetch Google Drive metadata when user finishes typing a GDrive URL
  const handleLinkBlur = async (url: string) => {
    const fileId = extractGoogleDriveFileId(url);
    if (!fileId) {
      // Best-effort detection from URL extension
      const detected = detectMetadataFromUrl(url);
      if (detected.mimeType) setFileMetadata(detected);
      return;
    }
    setIsFetchingMeta(true);
    const meta = await fetchGoogleDriveMetadata(fileId);
    setFileMetadata(meta);
    setIsFetchingMeta(false);
  };

  const handleCustomThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processThumbnailFile(file);
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

  const submitForm = (statusVal: 'PUBLISHED' | 'DRAFT') => {
    if (!formData.link) return alert('Please provide a link or upload a file.');
    const versionChanged = editingAsset && formData.version > (editingAsset.version ?? 1);
    if (versionChanged && !formData.changelog.trim()) {
      return alert('Changelog wajib diisi saat menaikkan nomor versi.');
    }
    onSaveAsset({
      ...formData,
      status: statusVal,
      id: editingAsset?.id,
      fileMetadata: fileMetadata ?? undefined,
      // Pass changelog for version tracking via parent
      // @ts-ignore — changelog passed as extra field for parent to handle
      _changelog: formData.changelog,
      _versionChanged: versionChanged,
    });
  };

  const handleSaveAsset = (e: React.FormEvent) => {
    e.preventDefault();
    submitForm(formData.status);
  };

  const filteredTags = existingTags.filter(t => 
    t.toLowerCase().includes(tagInput.toLowerCase()) && !formData.tags.includes(t)
  );

  return (
    <div className="flex flex-col gap-6 pb-20 max-w-[1200px] mx-auto font-sans">
      
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-3 text-[14px] text-coinbase-muted font-medium px-2 mb-2">
         <button onClick={onClose} className="hover:text-coinbase-ink transition-colors">Admin</button>
         <span className="text-coinbase-hairline">/</span>
         <span className="text-coinbase-ink font-semibold">
            {activeView === 'admin-upload' ? (editingAsset ? 'Edit Asset' : 'Upload Asset') :
             activeView === 'admin-brands' ? 'Manage Entities' : 'Manage Formats'}
         </span>
      </div>

      {activeView === 'admin-upload' ? (
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* LEFT COLUMN: Clean Minimalist Input Form */}
          <div className="flex-1 bg-white rounded-xl border border-coinbase-hairline shadow-soft p-8 lg:p-10">
            <form onSubmit={handleSaveAsset} className="space-y-6">
              <div className="flex items-center justify-between mb-2">
                 <h2 className="text-[20px] font-bold text-coinbase-ink tracking-tight">{editingAsset ? 'Edit Asset' : 'New Asset Upload'}</h2>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-coinbase-muted uppercase tracking-wider">Asset Title</label>
                <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-2.5 bg-coinbase-canvas border border-coinbase-hairline rounded-lg outline-none text-[14px] focus:ring-1 focus:ring-coinbase-primary focus:border-coinbase-primary transition-all placeholder:text-coinbase-muted" placeholder="e.g. Logo Horizontal" />
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-6 border-b border-coinbase-hairline pb-2">
                  <button type="button" onClick={() => setUploadMode('link')} className={`text-[12px] font-semibold uppercase tracking-wider pb-2 border-b-2 transition-all -mb-[10px] ${uploadMode === 'link' ? 'border-coinbase-primary text-coinbase-ink' : 'border-transparent text-coinbase-muted hover:text-coinbase-ink'}`}>Link URL</button>
                  <button type="button" onClick={() => setUploadMode('file')} className={`text-[12px] font-semibold uppercase tracking-wider pb-2 border-b-2 transition-all -mb-[10px] ${uploadMode === 'file' ? 'border-coinbase-primary text-coinbase-ink' : 'border-transparent text-coinbase-muted hover:text-coinbase-ink'}`}>Upload File (Max 5MB)</button>
                </div>
                
                {uploadMode === 'link' ? (
                  <div className="relative mt-1">
                    <input 
                      required 
                      value={formData.link} 
                      onChange={e => setFormData({...formData, link: e.target.value})}
                      onBlur={e => handleLinkBlur(e.target.value)}
                      placeholder="https://drive.google.com/..." 
                      className="w-full px-4 py-2.5 bg-coinbase-canvas border border-coinbase-hairline rounded-lg outline-none text-[14px] focus:ring-1 focus:ring-coinbase-primary focus:border-coinbase-primary transition-all placeholder:text-coinbase-muted" 
                    />
                    {isFetchingMeta && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-[11px] text-coinbase-muted">
                        <div className="w-3 h-3 border border-coinbase-muted border-t-coinbase-primary rounded-full animate-spin" />
                        Fetching metadata...
                      </div>
                    )}
                  </div>
                ) : (
                  <div 
                    onClick={() => fileInputRef.current?.click()} 
                    onDragOver={(e) => { e.preventDefault(); setIsDragOverAsset(true); }}
                    onDragLeave={() => setIsDragOverAsset(false)}
                    onDrop={(e) => { e.preventDefault(); setIsDragOverAsset(false); const file = e.dataTransfer.files?.[0]; if (file) { processAssetFile(file); } }}
                    className={`w-full h-32 border border-dashed rounded-lg flex flex-col items-center justify-center transition-all cursor-pointer group mt-1 ${isDragOverAsset ? 'border-coinbase-primary bg-coinbase-primary/5 ring-2 ring-coinbase-primary/20' : 'border-coinbase-hairline bg-coinbase-canvas hover:bg-coinbase-surface-soft'}`}
                  >
                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                    <Upload className={`w-7 h-7 mb-2 transition-colors ${isDragOverAsset ? 'text-coinbase-primary' : 'text-coinbase-muted group-hover:text-coinbase-primary'}`} />
                    <span className={`text-[12px] font-medium transition-colors ${isDragOverAsset ? 'text-coinbase-primary' : 'text-coinbase-muted group-hover:text-coinbase-primary'}`}>
                      {isUploading ? 'Converting to local asset...' : formData.link.startsWith('data:') ? 'Local File Loaded successfully' : 'Drag & drop file here or click to select'}
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-coinbase-muted uppercase tracking-wider">Business & Brands</label>
                  <select value={formData.brandId} onChange={e => setFormData({...formData, brandId: e.target.value})} className="w-full px-3 py-2.5 bg-coinbase-canvas border border-coinbase-hairline rounded-lg outline-none text-[13px] font-medium focus:border-coinbase-primary transition-colors">
                    {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-coinbase-muted uppercase tracking-wider">Format</label>
                  <select value={formData.typeId} onChange={e => setFormData({...formData, typeId: e.target.value})} className="w-full px-3 py-2.5 bg-coinbase-canvas border border-coinbase-hairline rounded-lg outline-none text-[13px] font-medium focus:border-coinbase-primary transition-colors">
                    {assetTypes.map(t => <option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-coinbase-muted uppercase tracking-wider">Status</label>
                  <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as 'PUBLISHED' | 'DRAFT'})} className="w-full px-3 py-2.5 bg-coinbase-canvas border border-coinbase-hairline rounded-lg outline-none text-[13px] font-medium focus:border-coinbase-primary transition-colors font-medium">
                    <option value="PUBLISHED">Published</option>
                    <option value="DRAFT">Draft</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-coinbase-muted uppercase tracking-wider">Version</label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={formData.version}
                    onChange={e => setFormData({...formData, version: Math.max(1, parseInt(e.target.value) || 1)})}
                    className="w-full px-3 py-2.5 bg-coinbase-canvas border border-coinbase-hairline rounded-lg outline-none text-[13px] font-medium focus:border-coinbase-primary transition-colors"
                  />
                </div>
              </div>

              {/* Changelog (shown when version is incremented) */}
              {formData.version > (editingAsset?.version ?? 1) && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-coinbase-muted uppercase tracking-wider flex items-center gap-1.5">
                    <PageEdit className="w-3.5 h-3.5 text-coinbase-muted" /> Changelog
                    <span className="text-red-500 font-bold">*</span>
                    <span className="text-coinbase-muted font-normal normal-case ml-1">(wajib diisi saat menaikkan versi)</span>
                  </label>
                  <textarea
                    value={formData.changelog}
                    onChange={e => setFormData({...formData, changelog: e.target.value})}
                    rows={2}
                    placeholder="Contoh: Perubahan warna biru lebih gelap, penambahan varian horizontal..."
                    className="w-full px-4 py-2.5 bg-coinbase-canvas border border-amber-300 rounded-lg outline-none text-[13px] focus:ring-1 focus:ring-amber-400 focus:border-amber-400 transition-colors resize-none placeholder:text-coinbase-muted"
                  />
                </div>
              )}

              {/* Update Schedule */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-coinbase-muted uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-coinbase-muted" /> Jadwal Pembaruan
                </label>
                <select
                  value={formData.updateIntervalMonths ?? ''}
                  onChange={e => {
                    const val = e.target.value ? parseInt(e.target.value) : null;
                    let nextDue: string | null = null;
                    if (val) {
                      const d = new Date();
                      d.setMonth(d.getMonth() + val);
                      nextDue = d.toISOString();
                    }
                    setFormData({ ...formData, updateIntervalMonths: val, nextUpdateDue: nextDue });
                  }}
                  className="w-full px-3 py-2.5 bg-coinbase-canvas border border-coinbase-hairline rounded-lg outline-none text-[13px] font-medium focus:border-coinbase-primary transition-colors"
                >
                  <option value="">Tidak di-set</option>
                  <option value="3">Setiap 3 Bulan</option>
                  <option value="6">Setiap 6 Bulan</option>
                  <option value="12">Setiap 1 Tahun</option>
                  <option value="24">Setiap 2 Tahun</option>
                </select>
                {formData.nextUpdateDue && (
                  <p className="text-[12px] text-coinbase-muted mt-1">
                    🗓 Jatuh tempo: <span className="font-semibold text-coinbase-body">{new Date(formData.nextUpdateDue).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  </p>
                )}
              </div>

              {/* Tags Section with popular suggestions */}
              <div className="space-y-2 relative">
                 <label className="text-[11px] font-semibold text-coinbase-muted uppercase tracking-wider">Tags</label>
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
                       placeholder="Type tag and press Enter..."
                       className="w-full px-4 py-2.5 bg-coinbase-canvas border border-coinbase-hairline rounded-lg outline-none text-[13px] focus:border-coinbase-primary transition-colors placeholder:text-coinbase-muted"
                     />
                     {showTagSuggestions && tagInput && filteredTags.length > 0 && (
                       <ul className="absolute top-full left-0 right-0 mt-1 bg-white border border-coinbase-hairline rounded-lg max-h-40 overflow-y-auto z-50 py-1.5 shadow-soft">
                         {filteredTags.map(tag => (
                           <li 
                             key={tag}
                             onClick={() => addTag(tag)}
                             className="px-4 py-1.5 text-[13px] font-medium text-coinbase-ink hover:bg-coinbase-surface-soft cursor-pointer"
                           >
                             #{tag}
                           </li>
                         ))}
                       </ul>
                     )}
                   </div>
                   <button type="button" onClick={() => addTag(tagInput)} className="px-5 py-2.5 bg-coinbase-surface-strong text-coinbase-ink rounded-lg text-[13px] font-semibold hover:bg-coinbase-hairline transition-colors">Add</button>
                 </div>
                 
                 {/* Active Tags */}
                 {formData.tags.length > 0 && (
                   <div className="flex flex-wrap gap-1.5 pt-1">
                     {formData.tags.map(tag => (
                       <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 bg-coinbase-surface-strong text-coinbase-ink text-[11px] font-semibold uppercase tracking-wider rounded">
                         #{tag}
                         <button type="button" onClick={() => handleRemoveTag(tag)} className="hover:text-ship-red text-coinbase-muted transition-colors ml-0.5">✕</button>
                       </span>
                     ))}
                   </div>
                 )}

                 {/* Point-and-Click Suggestion Tags */}
                 {popularSystemTags.length > 0 && (
                   <div className="pt-2">
                     <p className="text-[10px] font-bold text-coinbase-muted uppercase tracking-wider mb-1.5">Click to add existing tags:</p>
                     <div className="flex flex-wrap gap-1.5">
                       {popularSystemTags.map(tag => (
                         <button
                           key={tag}
                           type="button"
                           onClick={() => addTag(tag)}
                           className="px-2 py-1 bg-[#f0f2f5] hover:bg-coinbase-primary/10 hover:text-coinbase-primary text-coinbase-body text-[11px] font-medium rounded transition-colors"
                         >
                           +{tag}
                         </button>
                       ))}
                     </div>
                   </div>
                 )}
              </div>

              {/* Custom WebP Thumbnail Section */}
              <div 
                onDragOver={(e) => { e.preventDefault(); setIsDragOverThumbnail(true); }}
                onDragLeave={() => setIsDragOverThumbnail(false)}
                onDrop={(e) => { e.preventDefault(); setIsDragOverThumbnail(false); const file = e.dataTransfer.files?.[0]; if (file) { processThumbnailFile(file); } }}
                className={`border rounded-xl p-5 space-y-4 transition-all duration-200 ${isDragOverThumbnail ? 'border-coinbase-primary bg-coinbase-primary/5 ring-2 ring-coinbase-primary/20 scale-[1.01]' : 'bg-coinbase-surface-soft border-coinbase-hairline'}`}
              >
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-coinbase-muted uppercase tracking-wider">Custom Thumbnail</label>
                  {formData.customThumbnail && (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, customThumbnail: null }))}
                      className="text-[11px] font-bold text-red-500 hover:text-red-700 transition-colors uppercase tracking-wider"
                    >
                      Hapus Thumbnail
                    </button>
                  )}
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                  <input
                    type="file"
                    id="custom-thumbnail-file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleCustomThumbnailChange}
                  />
                  <button
                    type="button"
                    onClick={() => document.getElementById('custom-thumbnail-file')?.click()}
                    className="w-full sm:w-auto px-4 py-2.5 bg-white border border-coinbase-hairline text-coinbase-ink hover:bg-coinbase-surface-soft text-[13px] font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    {formData.customThumbnail ? 'Ganti Thumbnail' : 'Upload Thumbnail'}
                  </button>
                  
                  {formData.customThumbnail ? (
                    <div className="w-20 h-15 rounded border border-coinbase-hairline overflow-hidden bg-white shrink-0 shadow-soft">
                      <img src={formData.customThumbnail} className="w-full h-full object-cover" alt="Custom Thumbnail Preview" />
                    </div>
                  ) : (
                    <span className="text-[12px] text-coinbase-muted font-medium italic">Menggunakan default preview aset, drag & drop gambar, atau paste gambar dari clipboard</span>
                  )}
                </div>
                
                <p className="text-[11px] text-[#0052ff] font-medium flex items-start gap-1.5 leading-relaxed">
                  <LightBulb className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>Arahan ukuran: Gunakan gambar dengan resolusi minimal <strong>600x400 piksel (Rasio 3:2)</strong>. Gambar yang diunggah akan otomatis di-convert menjadi <strong>.webp</strong> agar sangat hemat penyimpanan storage.</span>
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between mb-0.5">
                  <label className="text-[11px] font-semibold text-coinbase-muted uppercase tracking-wider">Description</label>
                  <button type="button" onClick={handleGeminiSuggest} disabled={isGenerating} className="text-[11px] font-bold text-coinbase-primary hover:text-coinbase-primary-active disabled:opacity-50 transition-colors uppercase tracking-wider flex items-center gap-0.5">
                    ✨ AI Suggest
                  </button>
                </div>
                <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={3} className="w-full px-4 py-2.5 bg-coinbase-canvas border border-coinbase-hairline rounded-lg outline-none text-[13px] focus:border-coinbase-primary transition-colors resize-none placeholder:text-coinbase-muted" />
              </div>
            </form>
          </div>

           {/* RIGHT COLUMN: Premium Asset Preview Sidebar Overhauled */}
           <div className="w-full lg:w-[420px] shrink-0 bg-white rounded-xl border border-coinbase-hairline shadow-soft p-6 space-y-6 lg:sticky lg:top-[92px]">
            
            {/* Unified Action Button */}
            <div className="pb-5 border-b border-coinbase-hairline">
              <button 
                type="button" 
                onClick={() => submitForm(formData.status)} 
                disabled={isUploading}
                className="w-full py-2.5 px-4 bg-coinbase-primary text-white hover:bg-coinbase-primary-active font-semibold rounded-lg text-[14px] transition-colors flex items-center justify-center gap-2 shadow-soft disabled:opacity-50"
              >
                <FloppyDisk className="w-4 h-4" />
                {editingAsset ? 'Save Changes' : 'Upload Asset'}
              </button>
            </div>

            {/* Sidebar Tab Switcher (Only shown if editing existing asset) */}
            {editingAsset && (
              <div className="flex border-b border-coinbase-hairline">
                <button
                  type="button"
                  onClick={() => setRightSidebarTab('preview')}
                  className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider border-b-2 text-center transition-all ${
                    rightSidebarTab === 'preview'
                      ? 'border-coinbase-primary text-coinbase-ink'
                      : 'border-transparent text-coinbase-muted hover:text-coinbase-ink'
                  }`}
                >
                  <span className="flex items-center justify-center gap-1.5"><Eye className="w-3.5 h-3.5" /> Preview Berkas</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRightSidebarTab('timeline')}
                  className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider border-b-2 text-center transition-all ${
                    rightSidebarTab === 'timeline'
                      ? 'border-coinbase-primary text-coinbase-ink'
                      : 'border-transparent text-coinbase-muted hover:text-coinbase-ink'
                  }`}
                >
                  <span className="flex items-center justify-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Timeline Riwayat</span>
                </button>
              </div>
            )}

            {rightSidebarTab === 'timeline' && editingAsset ? (
              <div className="space-y-3">
                <AssetTimelinePanel asset={editingAsset} compact={true} />
              </div>
            ) : (
              <>
                {/* Fully Functional Preview */}
                <div className="space-y-3">
                  <h3 className="text-[11px] font-semibold text-coinbase-muted uppercase tracking-wider">Preview</h3>
                  
                  <div className="rounded-xl overflow-hidden bg-[#e2e8f0] border border-coinbase-hairline flex items-center justify-center w-full h-[260px] relative">
                    {(() => {
                      if (!formData.link) {
                        return (
                          <div className="text-center py-10 px-6 text-coinbase-muted flex flex-col items-center gap-2">
                            <Page className="w-8 h-8 opacity-40 text-coinbase-muted" />
                            <span className="text-xs">No media provided. Upload a file or insert a link URL.</span>
                          </div>
                        );
                      }

                      const fileType = formData.customThumbnail ? 'image' : service.getFileType(formData.link);
                      const previewUrl = service.getPreviewLink(formData.link);
                      const thumbnailUrl = formData.customThumbnail || service.getThumbnailUrl(formData.link) || previewUrl;

                      switch (fileType) {
                        case 'image':
                          return (
                            <div className="p-6 w-full h-full flex items-center justify-center">
                              <img src={thumbnailUrl} alt="Preview" className="max-w-full max-h-full object-contain rounded shadow-sm" />
                            </div>
                          );
                        case 'video':
                          return (
                            <div className="p-4 w-full h-full flex items-center justify-center">
                              <video controls src={previewUrl} className="max-w-full max-h-full bg-coinbase-ink rounded shadow-inner" />
                            </div>
                          );
                        case 'pdf':
                        case 'google-drive':
                          return (
                            <iframe 
                              src={previewUrl} 
                              className="w-full h-full bg-white rounded border-0" 
                              title="Asset Preview"
                            />
                          );
                        default:
                          return (
                            <div className="text-center py-8 px-6 text-coinbase-muted flex flex-col items-center gap-2">
                              <Link className="w-8 h-8 opacity-40 text-coinbase-muted" />
                              <span className="text-[13px] font-semibold text-coinbase-ink">Link Eksternal</span>
                              <a href={formData.link} target="_blank" rel="noreferrer" className="text-[12px] text-coinbase-primary hover:underline break-all max-w-[240px]">{formData.link}</a>
                            </div>
                          );
                      }
                    })()}
                  </div>

                  {/* Dynamic Real Metadata display */}
                  <div className="pt-1 select-none">
                    <p className="text-[13px] font-bold text-coinbase-ink truncate">{formData.title || 'Untitled Asset'}</p>
                    <p className="text-[11px] text-coinbase-muted mt-0.5 uppercase tracking-wide font-medium">
                      {assetTypes.find(t => t.id === formData.typeId)?.name || 'Format'} • {uploadMode === 'file' ? 'Local File' : 'Google Drive / Cloud Link'}
                    </p>
                  </div>

                  {/* File Metadata Preview Card */}
                  {fileMetadata && (
                    <div className="mt-3 bg-[#0d0f12] rounded-xl p-4 space-y-3">
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">File Details</p>
                      <div className="space-y-2.5">
                        {fileMetadata.mimeType && (
                          <div className="flex justify-between text-[13px]">
                            <span className="text-gray-400">Type</span>
                            <span className="text-white font-medium">
                              {fileMetadata.mimeType.startsWith('image/') ? 'Image' :
                               fileMetadata.mimeType.startsWith('video/') ? 'Video' :
                               fileMetadata.mimeType.startsWith('audio/') ? 'Audio' :
                               fileMetadata.mimeType.includes('pdf') ? 'PDF' : fileMetadata.mimeType.split('/')[1]?.toUpperCase() || 'File'}
                            </span>
                          </div>
                        )}
                        {fileMetadata.size !== undefined && (
                          <div className="flex justify-between text-[13px]">
                            <span className="text-gray-400">Size</span>
                            <span className="text-white font-medium">{formatBytes(fileMetadata.size)}</span>
                          </div>
                        )}
                        {fileMetadata.width !== undefined && fileMetadata.height !== undefined && (
                          <div className="flex justify-between text-[13px]">
                            <span className="text-gray-400">Dimensions</span>
                            <span className="text-white font-medium">{fileMetadata.width.toLocaleString()} × {fileMetadata.height.toLocaleString()}</span>
                          </div>
                        )}
                        {fileMetadata.durationSeconds !== undefined && (
                          <div className="flex justify-between text-[13px]">
                            <span className="text-gray-400">Duration</span>
                            <span className="text-white font-medium">
                              {(() => {
                                const s = Math.floor(fileMetadata.durationSeconds!);
                                const m = Math.floor(s / 60);
                                const sec = s % 60;
                                return `${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`;
                              })()}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between text-[13px]">
                          <span className="text-gray-400">Source</span>
                          <span className="text-white font-medium capitalize">
                            {fileMetadata.source === 'direct' ? 'Direct Upload' :
                             fileMetadata.source === 'google-drive' ? 'Google Drive' : 'External Link'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  {isFetchingMeta && (
                    <div className="mt-3 bg-[#0d0f12] rounded-xl p-4 flex items-center gap-2">
                      <div className="w-4 h-4 border border-gray-600 border-t-[#0052ff] rounded-full animate-spin" />
                      <span className="text-[12px] text-gray-400">Fetching file details from Google Drive...</span>
                    </div>
                  )}
                </div>

                {/* Asset Summary */}
                <div className="space-y-4 pt-2">
                  <h3 className="text-[11px] font-semibold text-coinbase-muted uppercase tracking-wider">Asset Summary</h3>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between text-[13px]">
                      <span className="text-coinbase-muted font-medium flex items-center gap-1.5">
                        <Building className="w-4 h-4 text-coinbase-muted" /> Business & Brands
                      </span>
                      <span className="font-semibold text-coinbase-ink truncate max-w-[200px]">
                        {brands.find(b => b.id === formData.brandId)?.name || 'Not Selected'}
                      </span>
                    </div>
                    <div className="flex justify-between text-[13px]">
                      <span className="text-coinbase-muted font-medium flex items-center gap-1.5">
                        <Label className="w-4 h-4 text-coinbase-muted" /> Format
                      </span>
                      <span className="font-semibold text-coinbase-ink">
                        {assetTypes.find(t => t.id === formData.typeId)?.name || 'Not Selected'}
                      </span>
                    </div>
                    <div className="flex justify-between text-[13px]">
                      <span className="text-coinbase-muted font-medium flex items-center gap-1.5">
                        <Bookmark className="w-4 h-4 text-coinbase-muted" /> Tags
                      </span>
                      <span className="font-semibold text-coinbase-ink truncate max-w-[200px]" title={formData.tags.join(', ')}>
                        {formData.tags.join(', ') || '-'}
                      </span>
                    </div>
                    <div className="flex justify-between text-[13px]">
                      <span className="text-coinbase-muted font-medium flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-coinbase-muted" /> Uploaded date
                      </span>
                      <span className="font-semibold text-coinbase-ink font-mono">
                        {editingAsset ? new Date(editingAsset.createdAt).toLocaleDateString() : new Date().toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-[13px]">
                      <span className="text-coinbase-muted font-medium flex items-center gap-1.5">
                        <Bookmark className="w-4 h-4 text-coinbase-muted" /> Version
                      </span>
                      <span className="px-2 py-0.5 bg-coinbase-primary/10 text-coinbase-primary border border-coinbase-primary/20 rounded-full text-[11px] font-bold font-mono">
                        v{formData.version}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[13px]">
                      <span className="text-coinbase-muted font-medium flex items-center gap-1.5">
                        <Lock className="w-4 h-4 text-coinbase-muted" /> Status
                      </span>
                      {formData.status === 'DRAFT' ? (
                        <span className="px-2.5 py-0.5 bg-[#fef5e7] text-[#b7791f] border border-[#fbd38d] rounded-full text-[11px] font-bold">Draft</span>
                      ) : (
                        <span className="px-2.5 py-0.5 bg-[#f0fff4] text-[#22543d] border border-[#c6f6d5] rounded-full text-[11px] font-bold">Published</span>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Tips Section */}
            <div className="bg-[#f7f8fa] border border-coinbase-hairline rounded-xl p-4 space-y-3">
              <h4 className="text-[11px] font-bold text-coinbase-ink flex items-center gap-1.5 uppercase tracking-wider">
                <LightBulb className="w-3.5 h-3.5 text-coinbase-primary shrink-0" /> Tips for better assets
              </h4>
              <ul className="space-y-2 text-[12px] text-coinbase-body font-medium">
                <li className="flex items-center gap-2 text-green-600">
                  <span>✓</span> <span className="text-coinbase-body font-normal">Use descriptive titles and tags</span>
                </li>
                <li className="flex items-center gap-2 text-green-600">
                  <span>✓</span> <span className="text-coinbase-body font-normal">Upload high quality files</span>
                </li>
                <li className="flex items-center gap-2 text-green-600">
                  <span>✓</span> <span className="text-coinbase-body font-normal">Add to a relevant collection</span>
                </li>
              </ul>
            </div>

          </div>

        </div>
      ) : activeView === 'admin-brands' ? (
        <div className="bg-white rounded-xl border border-coinbase-hairline shadow-soft overflow-hidden">
          <div className="p-8 lg:p-10 space-y-8">
            <h2 className="text-[24px] font-semibold text-coinbase-ink">Manage Entities</h2>
            <div className="bg-coinbase-surface-soft p-5 rounded-xl border border-coinbase-hairline flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <input value={newBrandName} onChange={e => setNewBrandName(e.target.value)} placeholder="New Entity Name" className="flex-1 px-4 py-3 bg-white border border-coinbase-hairline rounded-md text-[15px] outline-none focus:border-coinbase-primary transition-colors placeholder:text-coinbase-muted" />
                <select value={newBrandType} onChange={e => setNewBrandType(e.target.value as BrandType)} className="px-4 py-3 bg-white border border-coinbase-hairline rounded-md text-[15px] outline-none focus:border-coinbase-primary transition-colors font-medium">
                  <option value="UNIT">Unit Bisnis</option>
                  <option value="ENTITAS">Entitas</option>
                </select>
                <button onClick={() => { if(newBrandName){ onAddBrand({id:'', name:newBrandName, type:newBrandType, logo:newBrandLogo, sortOrder: brands.length}); setNewBrandName(''); setNewBrandLogo(''); } }} className="px-8 py-3 bg-coinbase-primary text-white text-[15px] font-semibold rounded-pill hover:bg-coinbase-primary-active transition-colors shrink-0">Add Entity</button>
              </div>

              {/* Upload logo/thumbnail brand */}
              <div className="border-t border-coinbase-hairline pt-3 flex flex-col gap-2">
                <label className="text-[12px] font-semibold text-coinbase-muted uppercase tracking-wider">Custom Thumbnail / Logo (Opsional)</label>
                <div className="flex items-center gap-4">
                  <input type="file" id="new-brand-logo-file" className="hidden" accept="image/*" onChange={(e) => handleBrandLogoChange(e, false)} />
                  <button type="button" onClick={() => document.getElementById('new-brand-logo-file')?.click()} className="px-4 py-2 bg-white border border-coinbase-hairline text-coinbase-ink hover:bg-coinbase-surface-soft text-[13px] font-semibold rounded-lg transition-colors">
                    Upload Gambar
                  </button>
                  {newBrandLogo ? (
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-10 rounded border border-coinbase-hairline overflow-hidden bg-white">
                        <img src={newBrandLogo} className="w-full h-full object-cover" alt="New Brand Logo" />
                      </div>
                      <button type="button" onClick={() => setNewBrandLogo('')} className="text-xs text-red-500 font-semibold hover:underline">Hapus</button>
                    </div>
                  ) : (
                    <span className="text-[12px] text-coinbase-muted font-medium italic">Default: Mengambil dari salah satu aset entitas</span>
                  )}
                </div>
                <p className="text-[11px] text-[#0052ff] font-medium mt-1 flex items-center gap-1.5">
                  <LightBulb className="w-3.5 h-3.5 shrink-0" /> <span>Arahan ukuran: Gunakan gambar dengan resolusi minimal <strong>400x300 piksel (Rasio 4:3)</strong> untuk tampilan kartu yang optimal. Ukuran berkas maksimal 2MB.</span>
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[12px] font-semibold text-coinbase-muted uppercase tracking-wide mb-3">Draggable List</p>
              {brands.map((brand, index) => (
                <div key={brand.id} draggable onDragStart={() => handleDragStart(index)} onDragOver={handleDragOver} onDrop={() => handleDrop(index, 'brands')} className={`flex flex-col justify-center p-4 bg-white border border-coinbase-hairline rounded-xl cursor-move group transition-all ${draggedIndex === index ? 'opacity-50 scale-[0.99]' : 'hover:shadow-soft'}`}>
                  {editingItemId === brand.id ? (
                     <div className="w-full flex flex-col gap-3">
                        <div className="flex gap-3">
                          <input 
                            value={editBuffer.name} 
                            onChange={(e) => setEditBuffer({...editBuffer, name: e.target.value})}
                            className="flex-1 px-4 py-2 bg-coinbase-canvas border border-coinbase-hairline rounded-md text-[15px] outline-none focus:border-coinbase-primary"
                          />
                          <select 
                            value={editBuffer.type} 
                            onChange={(e) => setEditBuffer({...editBuffer, type: e.target.value as BrandType})}
                            className="px-3 py-2 bg-coinbase-canvas border border-coinbase-hairline rounded-md text-[14px] outline-none focus:border-coinbase-primary font-medium"
                          >
                            <option value="UNIT">Unit Bisnis</option>
                            <option value="ENTITAS">Entitas</option>
                          </select>
                        </div>

                        {/* Edit thumbnail uploader */}
                        <div className="flex flex-col gap-2 pt-2 border-t border-coinbase-hairline">
                          <label className="text-[11px] font-semibold text-coinbase-muted uppercase tracking-wider">Custom Thumbnail / Logo (Opsional)</label>
                          <div className="flex items-center gap-4">
                            <input type="file" id={`edit-brand-logo-file-${brand.id}`} className="hidden" accept="image/*" onChange={(e) => handleBrandLogoChange(e, true)} />
                            <button type="button" onClick={() => document.getElementById(`edit-brand-logo-file-${brand.id}`)?.click()} className="px-3 py-1.5 bg-white border border-coinbase-hairline text-coinbase-ink hover:bg-coinbase-surface-soft text-[12px] font-semibold rounded-lg transition-colors">
                              Ganti Gambar
                            </button>
                            {editBuffer.logo ? (
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-10 rounded border border-coinbase-hairline overflow-hidden bg-white">
                                  <img src={editBuffer.logo} className="w-full h-full object-cover" alt="Edit Brand Logo" />
                                </div>
                                <button type="button" onClick={() => setEditBuffer({...editBuffer, logo: ''})} className="text-xs text-red-500 font-semibold hover:underline">Hapus</button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-coinbase-muted font-medium italic">Default: Mengambil dari salah satu aset entitas</span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#0052ff] font-medium flex items-center gap-1.5">
                            <LightBulb className="w-3.5 h-3.5 shrink-0" /> <span>Arahan ukuran: Minimal <strong>400x300 piksel (Rasio 4:3)</strong> untuk tampilan kartu yang optimal. Ukuran berkas maksimal 2MB.</span>
                          </p>
                        </div>

                        <div className="flex gap-2 justify-end pt-2">
                          <button onClick={() => { onUpdateBrand(editBuffer); setEditingItemId(null); }} className="px-5 py-2 bg-coinbase-primary text-white rounded-pill text-[14px] font-semibold hover:bg-coinbase-primary-active transition-colors font-semibold">Save</button>
                          <button onClick={() => setEditingItemId(null)} className="px-5 py-2 bg-coinbase-surface-strong text-coinbase-ink rounded-pill text-[14px] font-semibold hover:bg-coinbase-hairline transition-colors">Cancel</button>
                        </div>
                     </div>
                  ) : (
                      <div className="w-full flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="text-coinbase-muted group-hover:text-coinbase-ink transition-colors cursor-grab"><Menu className="w-5 h-5" /></div>
                          {brand.logo ? (
                            <div className="w-8 h-8 rounded border border-coinbase-hairline overflow-hidden bg-white flex items-center justify-center shrink-0">
                              <img src={brand.logo} className="w-full h-full object-cover" alt="Brand Logo" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded bg-coinbase-surface-strong text-coinbase-muted flex items-center justify-center text-xs shrink-0 font-semibold border border-coinbase-hairline">
                              {brand.name.charAt(0)}
                            </div>
                          )}
                          <span className="text-[16px] font-medium text-coinbase-ink">{brand.name}</span>
                          <span className="px-2 py-0.5 bg-[#f0f2f5] rounded text-[10px] text-coinbase-muted uppercase font-bold tracking-wider">{brand.type}</span>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!editingItemId && (
                                <button onClick={() => { setEditingItemId(brand.id); setEditBuffer(brand); }} className="p-2 text-coinbase-muted hover:text-coinbase-primary hover:bg-coinbase-surface-soft transition-colors rounded-full"><EditPencil className="w-5 h-5" /></button>
                            )}
                            <button onClick={() => confirm(`Delete ${brand.name}?`) && onDeleteBrand(brand.id)} className="p-2 text-coinbase-muted hover:text-ship-red hover:bg-[#fff5f5] transition-colors rounded-full"><Trash className="w-5 h-5" /></button>
                        </div>
                      </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-coinbase-hairline shadow-soft overflow-hidden">
          <div className="p-8 lg:p-10 space-y-8">
             <h2 className="text-[24px] font-semibold text-coinbase-ink">Manage Formats</h2>
            <div className="bg-coinbase-surface-soft p-4 rounded-xl border border-coinbase-hairline flex gap-3 z-10 relative">
              <div className="relative">
                <button 
                  type="button"
                  onClick={() => setIsNewIconDropdownOpen(!isNewIconDropdownOpen)}
                  className="w-14 h-12 bg-white border border-coinbase-hairline rounded-md flex items-center justify-center text-center outline-none focus:border-coinbase-primary hover:bg-coinbase-surface-soft transition-all"
                  title="Pilih Icon"
                >
                  {getEmojiIcon(newTypeIcon, "w-6 h-6 text-coinbase-muted") || <Page className="w-6 h-6 text-coinbase-muted" />}
                </button>
                {isNewIconDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsNewIconDropdownOpen(false)} />
                    <div className="absolute top-full left-0 mt-1 bg-white border border-coinbase-hairline rounded-lg shadow-soft py-1.5 z-50 min-w-[200px] max-h-60 overflow-y-auto">
                      {FORMAT_ICONS.map(item => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => {
                            setNewTypeIcon(item.key);
                            setIsNewIconDropdownOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-coinbase-surface-soft transition-colors text-[14px] text-left font-medium ${normalizeIconKey(newTypeIcon) === item.key ? 'text-coinbase-primary bg-coinbase-primary/5' : 'text-coinbase-body'}`}
                        >
                          {getEmojiIcon(item.key, "w-4 h-4 shrink-0 text-coinbase-muted")}
                          <span>{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <input value={newTypeName} onChange={e => setNewTypeName(e.target.value)} placeholder="New Format Name" className="flex-1 px-4 py-3 bg-white border border-coinbase-hairline rounded-md text-[15px] outline-none focus:border-coinbase-primary transition-colors placeholder:text-coinbase-muted" />
              <button onClick={() => { if(newTypeName){ onAddAssetType({id:'', name:newTypeName, icon:newTypeIcon, sortOrder: assetTypes.length}); setNewTypeName(''); } }} className="px-8 py-3 bg-coinbase-primary text-white text-[15px] font-semibold rounded-pill hover:bg-coinbase-primary-active transition-colors">Add</button>
            </div>
            <div className="space-y-3">
              <p className="text-[12px] font-semibold text-coinbase-muted uppercase tracking-wide mb-3">Draggable List</p>
              {assetTypes.map((type, index) => (
                <div key={type.id} draggable onDragStart={() => handleDragStart(index)} onDragOver={handleDragOver} onDrop={() => handleDrop(index, 'types')} className={`flex items-center justify-between p-4 bg-white border border-coinbase-hairline rounded-xl cursor-move group transition-all ${draggedIndex === index ? 'opacity-50 scale-[0.99]' : 'hover:shadow-soft'}`}>
                  {editingItemId === type.id ? (
                     <div className="flex-1 flex gap-3 mr-3 items-center">
                        <div className="relative">
                          <button 
                            type="button"
                            onClick={() => setIsEditIconDropdownOpen(!isEditIconDropdownOpen)}
                            className="w-14 h-10 bg-white border border-coinbase-hairline rounded-md flex items-center justify-center text-center outline-none focus:border-coinbase-primary hover:bg-coinbase-surface-soft transition-all"
                            title="Pilih Icon"
                          >
                            {getEmojiIcon(editBuffer.icon, "w-5 h-5 text-coinbase-muted") || <Page className="w-5 h-5 text-coinbase-muted" />}
                          </button>
                          {isEditIconDropdownOpen && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setIsEditIconDropdownOpen(false)} />
                              <div className="absolute top-full left-0 mt-1 bg-white border border-coinbase-hairline rounded-lg shadow-soft py-1.5 z-50 min-w-[200px] max-h-60 overflow-y-auto">
                                {FORMAT_ICONS.map(item => (
                                  <button
                                    key={item.key}
                                    type="button"
                                    onClick={() => {
                                      setEditBuffer({ ...editBuffer, icon: item.key });
                                      setIsEditIconDropdownOpen(false);
                                    }}
                                    className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-coinbase-surface-soft transition-colors text-[14px] text-left font-medium ${normalizeIconKey(editBuffer.icon) === item.key ? 'text-coinbase-primary bg-coinbase-primary/5' : 'text-coinbase-body'}`}
                                  >
                                    {getEmojiIcon(item.key, "w-4 h-4 shrink-0 text-coinbase-muted")}
                                    <span>{item.label}</span>
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
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
                        <div className="text-coinbase-muted group-hover:text-coinbase-ink transition-colors cursor-grab"><Menu className="w-5 h-5" /></div>
                        <div className="flex-1 flex items-center gap-3">
                          <span className="text-[20px] flex items-center shrink-0">
                            {getEmojiIcon(type.icon, "w-5 h-5 text-coinbase-muted") || <Page className="w-5 h-5 text-coinbase-muted" />}
                          </span>
                          <span className="text-[16px] font-medium text-coinbase-ink">{type.name}</span>
                        </div>
                      </div>
                  )}
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!editingItemId && (
                          <button onClick={() => { setEditingItemId(type.id); setEditBuffer(type); }} className="p-2 text-coinbase-muted hover:text-coinbase-primary hover:bg-coinbase-surface-soft transition-colors rounded-full"><EditPencil className="w-5 h-5" /></button>
                      )}
                      <button onClick={() => confirm(`Delete ${type.name}?`) && onDeleteAssetType(type.id)} className="p-2 text-coinbase-muted hover:text-ship-red hover:bg-[#fff5f5] transition-colors rounded-full"><Trash className="w-5 h-5" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;

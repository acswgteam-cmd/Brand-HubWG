import React, { useState, useEffect } from 'react';
import { Asset, Brand, AssetType } from '../types';
import { getPreviewLink, getFileType, getDownloadLink } from '../services/assetService';

interface AssetDetailsPanelProps {
  asset: Asset | null;
  brands: Brand[];
  assetTypes: AssetType[];
  onClose: () => void;
  onUpdate: (asset: Asset) => void;
  onDelete: (id: string) => void;
  isAdmin: boolean;
}

const AssetDetailsPanel: React.FC<AssetDetailsPanelProps> = ({ 
  asset, brands, assetTypes, onClose, onUpdate, onDelete, isAdmin 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Asset>>({});

  useEffect(() => {
    if (asset) {
      setEditForm({ ...asset });
      setIsEditing(false);
    }
  }, [asset]);

  if (!asset) return null;

  const fileType = getFileType(asset.link);
  const previewUrl = getPreviewLink(asset.link);
  const downloadUrl = getDownloadLink(asset.link);

  const handleSave = () => {
    if (editForm.title) {
        onUpdate({ ...asset, ...editForm } as Asset);
        setIsEditing(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-coinbase-canvas relative overflow-hidden">
      
      {/* Header Actions */}
      <div className="px-8 py-6 border-b border-coinbase-hairline flex justify-between items-center bg-coinbase-canvas shrink-0 z-10">
        <h2 className="text-[18px] font-semibold text-coinbase-ink truncate max-w-[250px]">
            {isEditing ? 'Editing Asset' : asset.title}
        </h2>
        <button onClick={onClose} className="p-2 hover:bg-coinbase-surface-strong rounded-full transition-colors text-coinbase-muted hover:text-coinbase-ink">
           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
        
        {/* Preview Container */}
        <div className="rounded-xl overflow-hidden bg-coinbase-surface-soft border border-coinbase-hairline flex items-center justify-center min-h-[250px] p-6 relative">
          {(() => {
            switch (fileType) {
              case 'image':
                return <img src={previewUrl} alt={asset.title} className="max-w-full h-auto max-h-[300px] object-contain rounded" />;
              case 'video':
                return <video controls src={previewUrl} className="w-full h-full max-h-[300px] bg-coinbase-ink rounded" />;
              case 'pdf':
              case 'google-drive':
                return (
                    <iframe 
                        src={previewUrl} 
                        className="w-full h-[300px] bg-white rounded shadow-soft border border-coinbase-hairline" 
                        title="Asset Preview"
                    />
                );
              case 'cdr':
                return (
                    <div className="text-center p-8 w-full h-full flex flex-col items-center justify-center rounded">
                        <div className="text-5xl mb-4 text-coinbase-muted">✏️</div>
                        <h3 className="text-[16px] font-semibold text-coinbase-ink">CorelDraw File</h3>
                        <p className="text-[14px] text-coinbase-body max-w-[200px] mt-2">Browser preview is not available for .cdr files. Please download to view.</p>
                    </div>
                );
              default:
                return (
                   <div className="text-center p-8">
                       <div className="text-4xl mb-4 opacity-50 text-coinbase-muted">🔗</div>
                       <p className="text-[14px] font-semibold text-coinbase-ink mb-2">External Link</p>
                       <a href={asset.link} target="_blank" rel="noreferrer" className="text-[14px] text-coinbase-primary hover:underline break-all">{asset.link}</a>
                   </div>
                );
            }
          })()}
        </div>

        {/* Info / Edit Form */}
        {isEditing ? (
            <div className="space-y-5">
                <div>
                    <label className="text-[13px] font-medium text-coinbase-ink block mb-2">Title</label>
                    <input 
                      value={editForm.title} 
                      onChange={e => setEditForm({...editForm, title: e.target.value})}
                      className="w-full p-3 bg-coinbase-canvas border border-coinbase-hairline rounded-md text-[16px] outline-none transition-all placeholder:text-coinbase-muted focus:border-coinbase-primary"
                    />
                </div>
                <div>
                    <label className="text-[13px] font-medium text-coinbase-ink block mb-2">Description</label>
                    <textarea 
                      value={editForm.description || ''} 
                      onChange={e => setEditForm({...editForm, description: e.target.value})}
                      rows={4}
                      className="w-full p-3 bg-coinbase-canvas border border-coinbase-hairline rounded-md text-[16px] outline-none transition-all placeholder:text-coinbase-muted resize-none focus:border-coinbase-primary"
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-[13px] font-medium text-coinbase-ink block mb-2">Entity</label>
                        <select 
                           value={editForm.brandId}
                           onChange={e => setEditForm({...editForm, brandId: e.target.value})}
                           className="w-full p-3 bg-coinbase-canvas border border-coinbase-hairline rounded-md text-[16px] outline-none focus:border-coinbase-primary"
                        >
                            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-[13px] font-medium text-coinbase-ink block mb-2">Type</label>
                        <select 
                           value={editForm.typeId}
                           onChange={e => setEditForm({...editForm, typeId: e.target.value})}
                           className="w-full p-3 bg-coinbase-canvas border border-coinbase-hairline rounded-md text-[16px] outline-none focus:border-coinbase-primary"
                        >
                            {assetTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>
                </div>
                
                <div className="flex gap-3 pt-4">
                    <button onClick={handleSave} className="flex-1 py-3 px-6 bg-coinbase-primary text-white rounded-pill text-[16px] font-semibold hover:bg-coinbase-primary-active transition-colors">Save Changes</button>
                    <button onClick={() => setIsEditing(false)} className="px-6 py-3 bg-coinbase-surface-strong text-coinbase-ink rounded-pill text-[16px] font-semibold hover:bg-coinbase-hairline transition-colors">Cancel</button>
                </div>
            </div>
        ) : (
            <div className="space-y-8">
                <div>
                    <h1 className="text-[24px] font-semibold text-coinbase-ink leading-tight mb-4">{asset.title}</h1>
                    <div className="flex flex-wrap gap-2">
                        <span className="px-3 py-1 bg-coinbase-surface-strong text-coinbase-ink rounded-pill text-[12px] font-semibold uppercase tracking-wide">
                            {brands.find(b => b.id === asset.brandId)?.name}
                        </span>
                        {asset.tags.map(t => (
                            <span key={t} className="px-3 py-1 border border-coinbase-hairline text-coinbase-ink rounded-pill text-[12px] font-semibold uppercase tracking-wide">#{t}</span>
                        ))}
                    </div>
                </div>

                <div>
                    <h3 className="text-[16px] font-semibold text-coinbase-ink mb-2">Description</h3>
                    <p className="text-[16px] text-coinbase-body leading-relaxed">
                        {asset.description || 'No description provided.'}
                    </p>
                </div>

                <div className="flex gap-3">
                     <a 
                       href={downloadUrl} 
                       download={asset.title}
                       target="_blank"
                       rel="noopener noreferrer"
                       className="flex-1 py-3 px-6 bg-coinbase-primary text-white rounded-pill text-[16px] font-semibold hover:bg-coinbase-primary-active transition-colors text-center flex items-center justify-center gap-2"
                     >
                       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                       Download File
                     </a>
                     <a 
                       href={asset.link} 
                       target="_blank"
                       rel="noopener noreferrer"
                       className="px-6 py-3 border border-coinbase-hairline text-coinbase-ink rounded-pill hover:bg-coinbase-surface-soft transition-colors flex items-center justify-center"
                       title="Open External Link"
                     >
                       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                     </a>
                </div>
                
                {/* Meta Info */}
                <div className="pt-6 border-t border-coinbase-hairline grid grid-cols-2 gap-6">
                     <div>
                         <span className="text-[13px] font-medium text-coinbase-muted block mb-1">Created</span>
                         <span className="text-[15px] font-mono text-coinbase-ink">{new Date(asset.createdAt).toLocaleDateString()}</span>
                     </div>
                     <div>
                         <span className="text-[13px] font-medium text-coinbase-muted block mb-1">Updated</span>
                         <span className="text-[15px] font-mono text-coinbase-ink">{new Date(asset.updatedAt).toLocaleDateString()}</span>
                     </div>
                </div>
            </div>
        )}

      </div>

      {/* Admin Footer Actions */}
      {isAdmin && !isEditing && (
         <div className="p-6 border-t border-coinbase-hairline bg-coinbase-surface-soft flex justify-between gap-4 shrink-0">
             <button onClick={() => setIsEditing(true)} className="flex-1 py-3 px-6 bg-white border border-coinbase-hairline text-coinbase-ink rounded-pill text-[16px] font-semibold hover:shadow-soft transition-colors">
                 Edit Asset
             </button>
             <button onClick={() => { if(confirm('Delete this asset?')) onDelete(asset.id); }} className="px-5 py-3 bg-white border border-ship-red text-ship-red rounded-pill hover:bg-[#fff5f5] transition-colors" title="Delete Asset">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
             </button>
         </div>
      )}
    </div>
  );
};

export default AssetDetailsPanel;

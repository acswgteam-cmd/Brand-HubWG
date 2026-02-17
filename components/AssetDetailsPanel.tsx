
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
    <div className="h-full flex flex-col bg-white border-l border-slate-200 relative overflow-hidden">
      
      {/* Header Actions */}
      <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white shrink-0 z-10">
        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest truncate max-w-[200px]">
            {isEditing ? 'Editing Asset' : asset.title}
        </h2>
        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400">
           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
        
        {/* Preview Container - Enhanced for Video/PDF/Drive/CDR */}
        <div className="rounded-xl overflow-hidden bg-slate-300 border border-slate-300 shadow-inner flex items-center justify-center min-h-[300px]">
          {(() => {
            switch (fileType) {
              case 'image':
                return <img src={previewUrl} alt={asset.title} className="w-full h-auto max-h-[400px] object-contain" />;
              case 'video':
                return <video controls src={previewUrl} className="w-full h-full max-h-[400px] bg-black" />;
              case 'pdf':
              case 'google-drive':
                return (
                    <iframe 
                        src={previewUrl} 
                        className="w-full h-[400px] bg-white" 
                        title="Asset Preview"
                    />
                );
              case 'cdr':
                return (
                    <div className="text-center p-8 bg-slate-100/50 w-full h-full flex flex-col items-center justify-center">
                        <div className="text-5xl mb-4 text-wg-lime">✏️</div>
                        <h3 className="text-lg font-bold text-slate-700">CorelDraw File</h3>
                        <p className="text-xs text-slate-500 max-w-[200px] mt-2">Browser preview is not available for .cdr files. Please download to view.</p>
                    </div>
                );
              default:
                return (
                   <div className="text-center p-8">
                       <div className="text-4xl mb-4 opacity-40 text-slate-600">🔗</div>
                       <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">External Link</p>
                       <a href={asset.link} target="_blank" rel="noreferrer" className="text-xs text-wg-honorable hover:underline break-all">{asset.link}</a>
                   </div>
                );
            }
          })()}
        </div>

        {/* Info / Edit Form */}
        {isEditing ? (
            <div className="space-y-4 animate-fade-in-up">
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Title</label>
                    <input 
                      value={editForm.title} 
                      onChange={e => setEditForm({...editForm, title: e.target.value})}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-wg-honorable/20"
                    />
                </div>
                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Description</label>
                    <textarea 
                      value={editForm.description || ''} 
                      onChange={e => setEditForm({...editForm, description: e.target.value})}
                      rows={4}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-wg-honorable/20 resize-none"
                    />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Entity</label>
                        <select 
                           value={editForm.brandId}
                           onChange={e => setEditForm({...editForm, brandId: e.target.value})}
                           className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                        >
                            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Type</label>
                        <select 
                           value={editForm.typeId}
                           onChange={e => setEditForm({...editForm, typeId: e.target.value})}
                           className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                        >
                            {assetTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>
                </div>
                
                <div className="flex gap-2 pt-4">
                    <button onClick={handleSave} className="flex-1 py-2.5 bg-wg-honorable text-white rounded-lg text-xs font-black uppercase tracking-widest shadow-lg shadow-wg-honorable/20">Save</button>
                    <button onClick={() => setIsEditing(false)} className="px-4 py-2.5 bg-slate-100 text-slate-500 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-slate-200">Cancel</button>
                </div>
            </div>
        ) : (
            <div className="space-y-6 animate-fade-in-up">
                <div>
                    <h1 className="text-xl font-extrabold text-slate-900 leading-tight mb-2">{asset.title}</h1>
                    <div className="flex flex-wrap gap-2">
                        <span className="px-2 py-1 bg-wg-honorable/10 text-wg-honorable rounded text-[10px] font-black uppercase tracking-widest">
                            {brands.find(b => b.id === asset.brandId)?.name}
                        </span>
                        {asset.tags.map(t => (
                            <span key={t} className="px-2 py-1 bg-slate-100 text-slate-400 rounded text-[10px] font-bold uppercase tracking-widest">#{t}</span>
                        ))}
                    </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Description</h3>
                    <p className="text-sm text-slate-600 leading-relaxed font-medium">
                        {asset.description || 'No description provided.'}
                    </p>
                </div>

                <div className="flex gap-3">
                     <a 
                       href={downloadUrl} 
                       download={asset.title}
                       target="_blank"
                       rel="noopener noreferrer"
                       className="flex-1 py-3.5 bg-wg-honorable text-white rounded-lg text-xs font-black uppercase tracking-widest shadow-md hover:bg-wg-royal transition-colors text-center flex items-center justify-center gap-2"
                     >
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                       Download
                     </a>
                     <a 
                       href={asset.link} 
                       target="_blank"
                       rel="noopener noreferrer"
                       className="px-5 py-3.5 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
                       title="Open External Link"
                     >
                       <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                     </a>
                </div>
                
                {/* Meta Info */}
                <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-4">
                     <div>
                         <span className="text-[9px] font-bold text-slate-400 uppercase block">Created</span>
                         <span className="text-xs font-mono text-slate-600">{new Date(asset.createdAt).toLocaleDateString()}</span>
                     </div>
                     <div>
                         <span className="text-[9px] font-bold text-slate-400 uppercase block">Updated</span>
                         <span className="text-xs font-mono text-slate-600">{new Date(asset.updatedAt).toLocaleDateString()}</span>
                     </div>
                </div>
            </div>
        )}

      </div>

      {/* Admin Footer Actions */}
      {isAdmin && !isEditing && (
         <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-between gap-4 shrink-0">
             <button onClick={() => setIsEditing(true)} className="flex-1 py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors">
                 Edit Asset
             </button>
             <button onClick={() => { if(confirm('Delete this asset?')) onDelete(asset.id); }} className="px-4 py-3 bg-white border border-red-100 hover:bg-red-50 text-wg-burgundy rounded-lg transition-colors">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
             </button>
         </div>
      )}
    </div>
  );
};

export default AssetDetailsPanel;

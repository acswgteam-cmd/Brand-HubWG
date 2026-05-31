import React, { useEffect, useState } from 'react';
import { Asset, Brand, AssetType, AssetFileMetadata } from '../types';
import { getPreviewLink, getFileType, getDownloadLink } from '../services/assetService';
import VersionHistoryPanel from './VersionHistoryPanel';
import {
  formatBytes,
  formatDuration,
  formatMimeType,
  extractGoogleDriveFileId,
  fetchGoogleDriveMetadata,
} from '../services/metadataService';

interface AssetDetailsPanelProps {
  asset: Asset | null;
  brands: Brand[];
  assetTypes: AssetType[];
  onClose: () => void;
  onUpdate: (asset: Asset) => void;
  onDelete: (id: string) => void;
  isAdmin: boolean;
  onEdit?: () => void; // Navigate to edit page
}

const StatusBadge: React.FC<{ status: Asset['status'] }> = ({ status }) => {
  if (status === 'DRAFT') {
    return (
      <span className="px-2.5 py-0.5 bg-[#fef5e7] text-[#b7791f] border border-[#fbd38d] rounded-full text-[11px] font-bold">
        Draft
      </span>
    );
  }
  return (
    <span className="px-2.5 py-0.5 bg-[#f0fff4] text-[#22543d] border border-[#c6f6d5] rounded-full text-[11px] font-bold">
      Published
    </span>
  );
};

const AssetDetailsPanel: React.FC<AssetDetailsPanelProps> = ({ 
  asset, brands, assetTypes, onClose, onDelete, isAdmin, onEdit
}) => {
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [liveMetadata, setLiveMetadata] = useState<AssetFileMetadata | null>(null);
  const [isFetchingMeta, setIsFetchingMeta] = useState(false);

  useEffect(() => {
    if (asset) {
      setShowVersionHistory(false);
      setLiveMetadata(null);

      // If asset already has stored metadata, use that
      if (asset.fileMetadata) {
        setLiveMetadata(asset.fileMetadata);
        return;
      }

      // Lazy-fetch Google Drive metadata if not stored yet
      const fileId = extractGoogleDriveFileId(asset.link);
      if (fileId) {
        setIsFetchingMeta(true);
        fetchGoogleDriveMetadata(fileId).then(meta => {
          setLiveMetadata(meta);
          setIsFetchingMeta(false);
        });
      }
    }
  }, [asset?.id]);

  if (!asset) return null;

  const fileType = getFileType(asset.link);
  const previewUrl = getPreviewLink(asset.link);
  const downloadUrl = getDownloadLink(asset.link);

  const brand = brands.find(b => b.id === asset.brandId);
  const assetType = assetTypes.find(t => t.id === asset.typeId);

  return (
    <div className="h-full flex flex-col bg-coinbase-canvas relative overflow-hidden">
      
      {/* Drag handle — visible on mobile bottom sheet */}
      <div className="flex justify-center pt-3 pb-1 lg:hidden shrink-0">
        <div className="w-10 h-1 bg-coinbase-hairline rounded-full" />
      </div>

      {/* Header */}
      <div className="px-6 py-4 lg:py-5 border-b border-coinbase-hairline flex justify-between items-center bg-coinbase-canvas shrink-0 z-10">
        <h2 className="text-[14px] lg:text-[15px] font-semibold text-coinbase-ink truncate max-w-[240px] lg:max-w-[260px]">
          {asset.title}
        </h2>
        <button onClick={onClose} className="p-2 hover:bg-coinbase-surface-strong rounded-full transition-colors text-coinbase-muted hover:text-coinbase-ink">
           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        
        {/* Preview Container */}
        <div className="bg-[#e2e8f0] flex items-center justify-center h-[220px] lg:h-[320px] border-b border-coinbase-hairline">
          {(() => {
            switch (fileType) {
              case 'image':
                return (
                  <div className="p-6 w-full h-full flex items-center justify-center">
                    <img src={previewUrl} alt={asset.title} className="max-w-full max-h-full object-contain rounded-lg shadow-sm" />
                  </div>
                );
              case 'video':
                return (
                  <div className="w-full h-full flex items-center justify-center bg-black">
                    <video controls src={previewUrl} className="w-full h-full object-contain" style={{maxHeight: '320px'}} />
                  </div>
                );
              case 'pdf':
              case 'google-drive':
                return (
                  <iframe 
                    src={previewUrl} 
                    className="w-full h-[320px] bg-white border-0" 
                    title="Asset Preview"
                  />
                );
              case 'cdr':
                return (
                  <div className="text-center p-8 w-full flex flex-col items-center justify-center">
                    <div className="text-5xl mb-3 text-coinbase-muted">✏️</div>
                    <h3 className="text-[15px] font-semibold text-coinbase-ink">CorelDraw File</h3>
                    <p className="text-[13px] text-coinbase-body max-w-[200px] mt-2">Browser preview not available. Download to view.</p>
                  </div>
                );
              default:
                return (
                  <div className="text-center p-8">
                    <div className="text-4xl mb-3 opacity-50 text-coinbase-muted">🔗</div>
                    <p className="text-[13px] font-semibold text-coinbase-ink mb-2">External Link</p>
                    <a href={asset.link} target="_blank" rel="noreferrer" className="text-[12px] text-coinbase-primary hover:underline break-all max-w-[200px] inline-block">{asset.link}</a>
                  </div>
                );
            }
          })()}
        </div>

        <div className="p-6 space-y-6">
          
          {/* Title + subtitle */}
          <div>
            <h1 className="text-[20px] font-semibold text-coinbase-ink leading-tight tracking-tight mb-1">{asset.title}</h1>
            <p className="text-[12px] text-coinbase-muted uppercase tracking-wide font-semibold">
              {assetType?.name || '—'} • {fileType === 'google-drive' ? 'Google Drive / Cloud Link' : fileType === 'image' ? 'Image File' : fileType === 'video' ? 'Video File' : fileType === 'pdf' ? 'PDF Document' : 'External Link'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <a 
              href={downloadUrl} 
              download={asset.title}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2.5 px-4 bg-coinbase-primary text-white rounded-pill text-[14px] font-semibold hover:bg-coinbase-primary-active transition-colors text-center flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Download
            </a>
            <a 
              href={asset.link} 
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 border border-coinbase-hairline text-coinbase-ink rounded-pill hover:bg-coinbase-surface-soft transition-colors flex items-center justify-center"
              title="Open External Link"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
            </a>
          </div>

          {/* Asset Summary — the rich metadata block */}
          <div className="bg-coinbase-surface-soft rounded-xl p-4 space-y-3 border border-coinbase-hairline">
            <h3 className="text-[11px] font-bold text-coinbase-muted uppercase tracking-wider">Asset Summary</h3>
            
            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-[13px]">
                <span className="text-coinbase-muted font-medium">🏢 Business & Brands</span>
                <span className="font-semibold text-coinbase-ink truncate max-w-[160px]">{brand?.name || '—'}</span>
              </div>
              <div className="flex justify-between items-center text-[13px]">
                <span className="text-coinbase-muted font-medium">🏷️ Format</span>
                <span className="font-semibold text-coinbase-ink flex items-center gap-1">
                  <span className="opacity-70">{assetType?.icon}</span>
                  {assetType?.name || '—'}
                </span>
              </div>
              <div className="flex justify-between items-start text-[13px]">
                <span className="text-coinbase-muted font-medium shrink-0">🔖 Tags</span>
                <span className="font-semibold text-coinbase-ink text-right max-w-[180px] truncate" title={asset.tags.join(', ')}>
                  {asset.tags.length > 0 ? asset.tags.join(', ') : '—'}
                </span>
              </div>
              <div className="flex justify-between items-center text-[13px]">
                <span className="text-coinbase-muted font-medium">📅 Uploaded date</span>
                <span className="font-semibold text-coinbase-ink font-mono">
                  {new Date(asset.createdAt).toLocaleDateString()}
                </span>
              </div>
          {/* Update Due Warning */}
          {asset.nextUpdateDue && (() => {
            const dueDate = new Date(asset.nextUpdateDue!);
            const now = new Date();
            const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays <= 30) {
              const urgency = diffDays <= 3 ? 'red' : diffDays <= 5 ? 'orange' : diffDays <= 15 ? 'amber' : 'yellow';
              const urgencyStyles = {
                red:    'bg-red-50 border-red-300 text-red-800',
                orange: 'bg-orange-50 border-orange-300 text-orange-800',
                amber:  'bg-amber-50 border-amber-300 text-amber-800',
                yellow: 'bg-yellow-50 border-yellow-300 text-yellow-800',
              };
              return (
                <div className={`rounded-xl border px-4 py-3 flex items-start gap-3 ${urgencyStyles[urgency]}`}>
                  <span className="text-xl shrink-0">{diffDays <= 3 ? '🚨' : diffDays <= 5 ? '⚠️' : '🔔'}</span>
                  <div>
                    <p className="text-[12px] font-bold uppercase tracking-wide mb-0.5">Jadwal Pembaruan Mendekat</p>
                    <p className="text-[13px]">
                      {diffDays <= 0
                        ? 'Aset ini sudah melewati jadwal pembaruan!'
                        : `Perlu diperbarui dalam ${diffDays} hari (${dueDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })})`
                      }
                    </p>
                  </div>
                </div>
              );
            }
            return null;
          })()}

          {/* Version History */}
          <div className="border border-coinbase-hairline rounded-xl p-4">
            {showVersionHistory ? (
              <VersionHistoryPanel asset={asset} compact={true} />
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-bold text-coinbase-muted uppercase tracking-wider">Version History</h3>
                  <button
                    onClick={() => setShowVersionHistory(true)}
                    className="text-[11px] font-semibold text-coinbase-primary hover:text-coinbase-primary-active transition-colors"
                  >
                    Lihat Semua
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-coinbase-primary flex items-center justify-center shrink-0">
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-bold text-coinbase-ink">Version {asset.version ?? 1}</span>
                      <span className="px-2 py-0.5 bg-coinbase-primary/10 text-coinbase-primary border border-coinbase-primary/20 rounded-full text-[10px] font-bold">Versi Terkini</span>
                    </div>
                    <p className="text-[12px] text-coinbase-muted mt-0.5">
                      {new Date(asset.updatedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
              <div className="flex justify-between items-center text-[13px]">
                <span className="text-coinbase-muted font-medium">🔒 Status</span>
                <StatusBadge status={asset.status} />
              </div>
            </div>
          </div>

          {/* File Details Card — like Google Drive screenshot */}
          {(liveMetadata || isFetchingMeta) && (
            <div className="bg-[#0d0f12] rounded-xl p-5 space-y-4">
              <h3 className="text-[12px] font-bold text-gray-400 uppercase tracking-wider">File details</h3>

              {isFetchingMeta && !liveMetadata && (
                <div className="flex items-center gap-2 py-2">
                  <div className="w-4 h-4 border border-gray-600 border-t-[#0052ff] rounded-full animate-spin" />
                  <span className="text-[12px] text-gray-500">Loading file details...</span>
                </div>
              )}

              {liveMetadata && (
                <div className="space-y-3.5">
                  {/* Type */}
                  {liveMetadata.mimeType && (
                    <div>
                      <p className="text-[13px] text-gray-500 mb-0.5">Type</p>
                      <p className="text-[15px] text-white font-light">
                        {liveMetadata.mimeType.startsWith('image/') ? 'Image' :
                         liveMetadata.mimeType.startsWith('video/') ? 'Video' :
                         liveMetadata.mimeType.startsWith('audio/') ? 'Audio' :
                         liveMetadata.mimeType.includes('pdf') ? 'PDF Document' :
                         formatMimeType(liveMetadata.mimeType)}
                      </p>
                    </div>
                  )}

                  {/* Size */}
                  {liveMetadata.size !== undefined && (
                    <div>
                      <p className="text-[13px] text-gray-500 mb-0.5">Size</p>
                      <p className="text-[15px] text-white font-light">{formatBytes(liveMetadata.size)}</p>
                    </div>
                  )}

                  {/* Storage used (same as size for direct; labeled differently for GDrive) */}
                  {liveMetadata.size !== undefined && (
                    <div>
                      <p className="text-[13px] text-gray-500 mb-0.5">Storage used</p>
                      <p className="text-[15px] text-white font-light">{formatBytes(liveMetadata.size)}</p>
                    </div>
                  )}

                  {/* Dimensions */}
                  {liveMetadata.width !== undefined && liveMetadata.height !== undefined && (
                    <div>
                      <p className="text-[13px] text-gray-500 mb-0.5">Dimensions</p>
                      <p className="text-[15px] text-white font-light">
                        {liveMetadata.width.toLocaleString()} × {liveMetadata.height.toLocaleString()}
                      </p>
                    </div>
                  )}

                  {/* Duration */}
                  {liveMetadata.durationSeconds !== undefined && (
                    <div>
                      <p className="text-[13px] text-gray-500 mb-0.5">Duration</p>
                      <p className="text-[15px] text-white font-light">{formatDuration(liveMetadata.durationSeconds)}</p>
                    </div>
                  )}

                  {/* Source badge */}
                  <div className="pt-1 border-t border-white/10">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                      liveMetadata.source === 'direct'
                        ? 'bg-[#0052ff]/20 text-[#4d9fff]'
                        : 'bg-white/10 text-gray-300'
                    }`}>
                      {liveMetadata.source === 'direct' ? '☁️ Direct Upload' :
                       liveMetadata.source === 'google-drive' ? '📁 Google Drive' : '🔗 External Link'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tags pills */}
          {asset.tags.length > 0 && (
            <div>
              <h3 className="text-[11px] font-bold text-coinbase-muted uppercase tracking-wider mb-2">Tags</h3>
              <div className="flex flex-wrap gap-1.5">
                {asset.tags.map(t => (
                  <span key={t} className="px-2.5 py-1 border border-coinbase-hairline text-coinbase-ink rounded-pill text-[11px] font-semibold uppercase tracking-wide">#{t}</span>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {asset.description && (
            <div>
              <h3 className="text-[11px] font-bold text-coinbase-muted uppercase tracking-wider mb-2">Description</h3>
              <p className="text-[14px] text-coinbase-body leading-relaxed">
                {asset.description}
              </p>
            </div>
          )}

        </div>
      </div>

      {/* Admin Footer Actions */}
      {isAdmin && (
        <div className="p-4 border-t border-coinbase-hairline bg-coinbase-surface-soft flex gap-3 shrink-0">
          <button 
            onClick={onEdit} 
            className="flex-1 py-2.5 px-4 bg-white border border-coinbase-hairline text-coinbase-ink rounded-pill text-[14px] font-semibold hover:shadow-soft transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
            Edit Asset
          </button>
          <button 
            onClick={() => { if(confirm('Delete this asset?')) onDelete(asset.id); }} 
            className="px-4 py-2.5 bg-white border border-[#cf202f] text-[#cf202f] rounded-pill hover:bg-[#fff5f5] transition-colors flex items-center justify-center" 
            title="Delete Asset"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default AssetDetailsPanel;

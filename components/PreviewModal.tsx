
import React, { useRef, useEffect } from 'react';
import { Xmark, Download, OpenNewWindow, Link, Building, Label, Calendar } from 'iconoir-react';
import { Asset, Brand, AssetType } from '../types';
import { getPreviewLink, getFileType, getDownloadLink } from '../services/assetService';
import { getEmojiIcon } from './IconHelper';

interface PreviewModalProps {
  asset: Asset | null;
  brands?: Brand[];
  assetTypes?: AssetType[];
  onClose: () => void;
  onDownload?: (asset: Asset) => void;
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

const PreviewModal: React.FC<PreviewModalProps> = ({ asset, brands = [], assetTypes = [], onClose, onDownload }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!asset) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  const fileType = getFileType(asset.link);
  const previewUrl = getPreviewLink(asset.link);
  const downloadUrl = getDownloadLink(asset.link);
  const brand = brands.find(b => b.id === asset.brandId);
  const assetType = assetTypes.find(t => t.id === asset.typeId);

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 lg:p-6 bg-coinbase-ink/80 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div 
        ref={modalRef}
        className="relative w-full max-w-5xl bg-coinbase-canvas rounded-xl overflow-hidden flex flex-col shadow-2xl max-h-[95vh]"
      >
        {/* Header */}
        <div className="px-6 lg:px-8 py-5 border-b border-coinbase-hairline flex items-center justify-between bg-coinbase-canvas shrink-0">
          <div className="min-w-0 pr-4">
            <h2 className="text-[18px] lg:text-[22px] font-semibold text-coinbase-ink tracking-tight truncate">{asset.title}</h2>
            <p className="text-[12px] text-coinbase-muted mt-0.5 uppercase tracking-wide font-semibold">
              {assetType?.name || 'Asset'} • {new Date(asset.createdAt).toLocaleDateString()}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 bg-coinbase-surface-soft hover:bg-coinbase-surface-strong rounded-full text-coinbase-muted hover:text-coinbase-ink transition-all shrink-0"
          >
            <Xmark className="w-5 h-5 lg:w-6 lg:h-6" />
          </button>
        </div>
        
        {/* Preview Area */}
        <div className="overflow-auto bg-[#e2e8f0] flex items-center justify-center min-h-[280px] lg:min-h-[400px] max-h-[55vh]">
          {(() => {
            switch (fileType) {
              case 'image':
                return <img src={previewUrl} alt={asset.title} className="max-w-full max-h-[55vh] object-contain" />;
              case 'video':
                return (
                  <video controls className="w-full bg-coinbase-ink" style={{maxHeight: '55vh'}}>
                    <source src={previewUrl} />
                    Your browser does not support the video tag.
                  </video>
                );
              case 'pdf':
              case 'google-drive':
              case 'google-drive-folder':
                return (
                  <iframe
                    src={previewUrl}
                    className="w-full h-[55vh] border-0 bg-white"
                    title={asset.title}
                  />
                );
              default:
                return (
                  <div className="p-12 lg:p-16 text-center bg-white rounded-xl m-6 border border-coinbase-hairline shadow-soft flex flex-col items-center justify-center">
                    <Link className="w-12 h-12 lg:w-16 lg:h-16 mb-5 opacity-30 text-coinbase-muted" />
                    <h3 className="text-[18px] font-semibold text-coinbase-ink mb-3">No Preview Available</h3>
                    <p className="text-coinbase-muted mb-6 max-w-sm mx-auto text-[14px]">This asset can be viewed by opening or downloading via the links below.</p>
                    <a 
                      href={asset.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex px-6 py-3 bg-coinbase-surface-strong text-coinbase-ink font-semibold text-[14px] rounded-pill hover:bg-coinbase-hairline transition-all"
                    >
                      Open Resource
                    </a>
                  </div>
                );
            }
          })()}
        </div>

        {/* Footer: Metadata + Actions */}
        <div className="px-6 lg:px-8 py-5 bg-coinbase-canvas border-t border-coinbase-hairline flex flex-col md:flex-row md:items-start justify-between gap-5 shrink-0">
          
          {/* Left: Metadata summary */}
          <div className="flex-1 min-w-0 space-y-2.5">
            <div className="flex flex-wrap gap-4 text-[13px]">
              {brand && (
                <div className="flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-coinbase-muted" />
                  <span className="font-semibold text-coinbase-ink">{brand.name}</span>
                </div>
              )}
              {assetType && (
                <div className="flex items-center gap-1.5">
                  <Label className="w-4 h-4 text-coinbase-muted" />
                  <span className="font-semibold text-coinbase-ink flex items-center gap-1.5">
                    {assetType.icon && getEmojiIcon(assetType.icon, "w-3.5 h-3.5 opacity-70")} <span>{assetType.name}</span>
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-coinbase-muted" />
                <span className="font-semibold text-coinbase-ink font-mono">{new Date(asset.createdAt).toLocaleDateString()}</span>
              </div>
              {(asset.version ?? 1) > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 bg-coinbase-primary/10 text-coinbase-primary border border-coinbase-primary/20 rounded-full text-[11px] font-bold font-mono">
                    v{asset.version ?? 1}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <StatusBadge status={asset.status} />
              </div>
            </div>
            
            {/* Description */}
            {asset.description && (
              <p className="text-coinbase-body text-[14px] leading-relaxed line-clamp-2">{asset.description}</p>
            )}

            {/* Tags */}
            {asset.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {asset.tags.map(tag => (
                  <span key={tag} className="px-2.5 py-0.5 border border-coinbase-hairline text-coinbase-ink text-[11px] font-semibold uppercase tracking-wide rounded-pill">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Right: Action Buttons */}
          <div className="flex gap-3 shrink-0">
            <a 
              href={downloadUrl} 
              download={asset.title}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onDownload && onDownload(asset)}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-coinbase-primary text-white font-semibold text-[14px] rounded-pill hover:bg-coinbase-primary-active transition-colors shadow-soft"
            >
              <Download className="w-4 h-4" />
              Download
            </a>
            <a 
              href={asset.link} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-coinbase-surface-strong text-coinbase-ink font-semibold text-[14px] rounded-pill hover:bg-coinbase-hairline transition-all border border-coinbase-hairline"
            >
              <OpenNewWindow className="w-4 h-4" />
              Open
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreviewModal;

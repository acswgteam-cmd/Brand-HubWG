import React, { useRef, useEffect } from 'react';
import { Asset } from '../types';
import { getPreviewLink, getFileType } from '../services/assetService';

interface PreviewModalProps {
  asset: Asset | null;
  onClose: () => void;
}

const PreviewModal: React.FC<PreviewModalProps> = ({ asset, onClose }) => {
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

  const renderPreview = () => {
    switch (fileType) {
      case 'image':
        return <img src={previewUrl} alt={asset.title} className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-xl" />;
      case 'video':
        return (
          <video controls className="w-full max-h-[60vh] rounded-lg shadow-xl bg-black">
            <source src={previewUrl} />
            Your browser does not support the video tag.
          </video>
        );
      case 'pdf':
      case 'google-drive':
        return (
          <iframe
            src={previewUrl}
            className="w-full h-[60vh] rounded-lg border-0 bg-white shadow-inner"
            title={asset.title}
          />
        );
      default:
        return (
          <div className="p-16 text-center bg-white rounded-2xl shadow-sm border border-slate-100">
            <div className="text-6xl mb-6 opacity-30">🔗</div>
            <h3 className="text-2xl font-extrabold text-slate-900 mb-4">No Preview Available</h3>
            <p className="text-slate-500 mb-8 max-w-sm mx-auto">This asset can be viewed by opening the direct link below.</p>
            <a 
              href={asset.link} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex px-10 py-4 bg-wg-honorable text-white font-bold uppercase tracking-widest text-xs rounded-full hover:bg-wg-royal transition-all shadow-lg hover:shadow-wg-honorable/20"
            >
              Open Resource
            </a>
          </div>
        );
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-md animate-in fade-in duration-300"
      onClick={handleBackdropClick}
    >
      <div 
        ref={modalRef}
        className="relative w-full max-w-5xl bg-white rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200"
      >
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">{asset.title}</h2>
            <div className="flex items-center gap-3 mt-1">
               <span className="text-[10px] font-black text-wg-honorable uppercase tracking-widest px-2 py-0.5 bg-wg-honorable/5 rounded">Official Asset</span>
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Modified {new Date(asset.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2.5 bg-slate-50 hover:bg-wg-burgundy hover:text-white rounded-full text-slate-400 transition-all active:scale-90"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-10 overflow-auto bg-slate-50/50 flex items-center justify-center min-h-[450px]">
          {renderPreview()}
        </div>

        <div className="px-8 py-8 bg-white border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex-1">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Description</h4>
            <p className="text-slate-700 text-sm leading-relaxed font-medium max-w-2xl">{asset.description || 'No description provided for this brand asset.'}</p>
          </div>
          <div className="flex flex-col items-start md:items-end gap-3 shrink-0">
             <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tags</h4>
             <div className="flex flex-wrap gap-2 justify-end">
                {asset.tags.map(tag => (
                  <span key={tag} className="px-3 py-1 bg-wg-sky/40 text-wg-honorable text-[10px] font-black uppercase tracking-widest rounded-full border border-wg-honorable/5">
                    #{tag}
                  </span>
                ))}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreviewModal;
import React, { useState } from 'react';
import { Asset, Brand, AssetType } from '../types';
import { getThumbnailUrl, getDownloadLink } from '../services/assetService';

interface AssetCardProps {
  asset: Asset;
  brandName: string;
  icon: string;
  onSelect: (asset: Asset) => void;
  onToggleSelection: (id: string) => void;
  isChecked: boolean;
  isSelected?: boolean;
}

const AssetCard: React.FC<AssetCardProps> = ({ 
  asset, brandName, icon, onSelect, isSelected, onToggleSelection, isChecked
}) => {
  const [imgError, setImgError] = useState(false);
  const thumbnailUrl = getThumbnailUrl(asset.link);
  const downloadUrl = getDownloadLink(asset.link);

  return (
    <div 
      className={`
        bg-coinbase-canvas rounded-xl p-4 cursor-pointer transition-all duration-300 relative group
        ${isSelected ? 'border-2 border-coinbase-primary' : 'border border-coinbase-hairline hover:shadow-soft hover:border-transparent'}
        ${isChecked ? 'bg-coinbase-surface-soft border-2 border-coinbase-primary' : ''}
      `}
      onClick={() => onSelect(asset)}
    >
      {/* Selection Checkbox (Visible on hover or checked) */}
      <div 
        className={`absolute top-6 left-6 z-20 transition-opacity duration-200 ${isChecked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
        onClick={(e) => { e.stopPropagation(); onToggleSelection(asset.id); }}
      >
        <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${isChecked ? 'bg-coinbase-primary border-coinbase-primary text-white' : 'bg-white border-coinbase-muted text-transparent hover:border-coinbase-ink'}`}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
        </div>
      </div>

      {/* Direct Download Button (Visible on hover) */}
      <a 
         href={downloadUrl}
         download={asset.title}
         target="_blank"
         rel="noopener noreferrer"
         onClick={(e) => e.stopPropagation()}
         className="absolute top-6 right-6 z-20 w-8 h-8 bg-white/95 rounded-full flex items-center justify-center border border-coinbase-hairline opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-coinbase-ink hover:text-white text-coinbase-ink shadow-soft"
         title="Download"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
      </a>

      {/* Image Container */}
      <div className="bg-coinbase-surface-soft rounded-lg aspect-[4/3] w-full flex items-center justify-center p-6 mb-4 overflow-hidden border border-coinbase-hairline">
        {thumbnailUrl && !imgError ? (
          <img 
            src={thumbnailUrl} 
            alt={asset.title} 
            className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-[1.02]" 
            onError={() => setImgError(true)} 
            loading="lazy" 
          />
        ) : (
          <div className="text-3xl opacity-50 text-coinbase-muted transition-transform group-hover:scale-[1.02]">{icon}</div>
        )}
      </div>

      <div className="px-1">
        <h3 className="text-coinbase-ink font-semibold text-[15px] mb-1.5 leading-snug line-clamp-2 min-h-[2.5em] tracking-tight">
          {asset.title}
        </h3>
        <div className="flex items-center justify-between">
           <span className="text-[13px] text-coinbase-muted truncate max-w-[60%] font-medium">
             {brandName}
           </span>
           {asset.tags.length > 0 && (
             <span className="px-2 py-0.5 bg-coinbase-surface-strong rounded-pill text-[11px] text-coinbase-ink uppercase tracking-wide font-semibold">
               {asset.tags[0]}
             </span>
           )}
        </div>
      </div>
    </div>
  );
};

interface AssetGridProps {
  assets: Asset[];
  brands: Brand[];
  assetTypes: AssetType[];
  onSelectAsset: (asset: Asset) => void;
  selectedAssetId?: string | null;
  viewMode: 'grid' | 'list';
  multiSelection: Set<string>;
  onToggleSelection: (id: string) => void;
}

const AssetGrid: React.FC<AssetGridProps> = ({
  assets,
  brands,
  assetTypes,
  onSelectAsset,
  selectedAssetId,
  viewMode,
  multiSelection,
  onToggleSelection
}) => {
  
  if (assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-coinbase-surface-soft rounded-xl border border-dashed border-coinbase-hairline">
        <div className="text-4xl mb-4 opacity-40">📂</div>
        <h3 className="text-[18px] font-semibold text-coinbase-ink mb-1">No Assets Found</h3>
        <p className="text-coinbase-muted text-[15px]">Try changing filters or search terms.</p>
      </div>
    );
  }

  if (viewMode === 'list') {
      return (
          <div className="bg-coinbase-canvas rounded-xl border border-coinbase-hairline overflow-hidden mb-20">
              <table className="w-full text-left border-collapse">
                  <thead>
                      <tr className="bg-coinbase-surface-soft border-b border-coinbase-hairline">
                          <th className="p-4 w-12"></th>
                          <th className="p-4 text-[12px] text-coinbase-muted uppercase font-semibold tracking-wide w-16">Preview</th>
                          <th className="p-4 text-[12px] text-coinbase-muted uppercase font-semibold tracking-wide">Title</th>
                          <th className="p-4 text-[12px] text-coinbase-muted uppercase font-semibold tracking-wide">Entity</th>
                          <th className="p-4 text-[12px] text-coinbase-muted uppercase font-semibold tracking-wide">Type</th>
                          <th className="p-4 text-[12px] text-coinbase-muted uppercase font-semibold tracking-wide">Date</th>
                          <th className="p-4 text-[12px] text-coinbase-muted uppercase font-semibold tracking-wide text-right">Action</th>
                      </tr>
                  </thead>
                  <tbody>
                      {assets.map(asset => {
                          const brand = brands.find(b => b.id === asset.brandId);
                          const type = assetTypes.find(t => t.id === asset.typeId);
                          const thumb = getThumbnailUrl(asset.link);
                          const isSelected = selectedAssetId === asset.id;
                          const isChecked = multiSelection.has(asset.id);
                          const downloadUrl = getDownloadLink(asset.link);

                          return (
                              <tr 
                                key={asset.id} 
                                onClick={() => onSelectAsset(asset)}
                                className={`cursor-pointer transition-colors border-b border-coinbase-hairline last:border-0 group ${isSelected || isChecked ? 'bg-coinbase-surface-strong' : 'hover:bg-coinbase-surface-soft'}`}
                              >
                                  <td className="p-4">
                                      <div 
                                        className={`w-4 h-4 rounded-sm border flex items-center justify-center cursor-pointer ${isChecked ? 'bg-coinbase-primary border-coinbase-primary text-white' : 'border-coinbase-muted bg-white text-transparent hover:border-coinbase-ink'}`}
                                        onClick={(e) => { e.stopPropagation(); onToggleSelection(asset.id); }}
                                      >
                                          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                      </div>
                                  </td>
                                  <td className="p-4">
                                      <div className="w-10 h-10 rounded-full bg-coinbase-surface-strong flex items-center justify-center overflow-hidden border border-coinbase-hairline">
                                          {thumb ? (
                                              <img src={thumb} className="w-full h-full object-cover" loading="lazy" />
                                          ) : (
                                              <span className="text-[15px] opacity-70">{type?.icon}</span>
                                          )}
                                      </div>
                                  </td>
                                  <td className="p-4">
                                      <div className={`text-[15px] font-semibold ${isSelected ? 'text-coinbase-primary' : 'text-coinbase-ink'}`}>{asset.title}</div>
                                      <div className="text-[13px] text-coinbase-muted mt-0.5">{asset.tags.slice(0, 3).map(t => `#${t} `)}</div>
                                  </td>
                                  <td className="p-4 text-[15px] text-coinbase-ink font-medium">{brand?.name}</td>
                                  <td className="p-4 text-[15px] text-coinbase-ink font-medium flex items-center gap-2">
                                      <span className="opacity-70">{type?.icon}</span>{type?.name}
                                  </td>
                                  <td className="p-4 text-[15px] text-coinbase-ink font-mono">
                                      {new Date(asset.updatedAt).toLocaleDateString()}
                                  </td>
                                  <td className="p-4 text-right">
                                     <a 
                                        href={downloadUrl}
                                        download={asset.title}
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="inline-flex p-2 text-coinbase-muted hover:text-coinbase-ink hover:bg-coinbase-surface-strong rounded-full transition-colors"
                                        title="Download"
                                     >
                                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                     </a>
                                  </td>
                              </tr>
                          )
                      })}
                  </tbody>
              </table>
          </div>
      )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 lg:gap-8 pb-20">
      {assets.map(asset => {
         const brand = brands.find(b => b.id === asset.brandId);
         const type = assetTypes.find(t => t.id === asset.typeId);
         return (
           <AssetCard 
             key={asset.id}
             asset={asset}
             brandName={brand?.name || 'Unknown'}
             icon={type?.icon || '📄'}
             onSelect={onSelectAsset}
             isSelected={selectedAssetId === asset.id}
             isChecked={multiSelection.has(asset.id)}
             onToggleSelection={onToggleSelection}
           />
         );
      })}
    </div>
  );
};

export default AssetGrid;

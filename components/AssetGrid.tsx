import React, { useState } from 'react';
import { Asset, Brand, AssetType } from '../types';
import { getThumbnailUrl, getDownloadLink } from '../services/assetService';

interface AssetCardProps {
  asset: Asset;
  brand: Brand | undefined;
  assetType: AssetType | undefined;
  onSelect: (asset: Asset) => void;
  onToggleSelection: (id: string) => void;
  isChecked: boolean;
  isSelected?: boolean;
  isAdmin?: boolean;
}

const StatusBadge: React.FC<{ status: Asset['status'] }> = ({ status }) => {
  if (status === 'DRAFT') {
    return (
      <span className="px-2 py-0.5 bg-[#fef5e7] text-[#b7791f] border border-[#fbd38d] rounded-full text-[10px] font-bold uppercase tracking-wide">
        Draft
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 bg-[#f0fff4] text-[#22543d] border border-[#c6f6d5] rounded-full text-[10px] font-bold uppercase tracking-wide">
      Published
    </span>
  );
};

const AssetCard: React.FC<AssetCardProps> = ({ 
  asset, brand, assetType, onSelect, isSelected, onToggleSelection, isChecked, isAdmin
}) => {
  const [imgError, setImgError] = useState(false);
  const thumbnailUrl = getThumbnailUrl(asset.link);
  const downloadUrl = getDownloadLink(asset.link);

  return (
    <div 
      className={`
        bg-coinbase-canvas rounded-xl cursor-pointer transition-all duration-300 relative group overflow-hidden flex flex-col
        ${isSelected ? 'border-2 border-coinbase-primary shadow-soft' : 'border border-coinbase-hairline hover:shadow-soft hover:border-coinbase-muted'}
        ${isChecked ? 'bg-coinbase-surface-soft border-2 border-coinbase-primary' : ''}
      `}
      onClick={() => onSelect(asset)}
    >
      {/* Selection Checkbox (Visible on hover or checked) */}
      <div 
        className={`absolute top-3 left-3 z-20 transition-opacity duration-200 ${isChecked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
        onClick={(e) => { e.stopPropagation(); onToggleSelection(asset.id); }}
      >
        <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${isChecked ? 'bg-coinbase-primary border-coinbase-primary text-white' : 'bg-white border-coinbase-muted text-transparent hover:border-coinbase-ink'}`}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
        </div>
      </div>

      {/* Status Badge top-right */}
      {isAdmin && (
        <div className="absolute top-3 right-3 z-20">
          <StatusBadge status={asset.status} />
        </div>
      )}

      {/* Direct Download Button (Visible on hover) */}
      <a 
         href={downloadUrl}
         download={asset.title}
         target="_blank"
         rel="noopener noreferrer"
         onClick={(e) => e.stopPropagation()}
         className="absolute bottom-[calc(50%-20px)] right-3 z-20 w-8 h-8 bg-white/95 rounded-full flex items-center justify-center border border-coinbase-hairline opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-coinbase-ink hover:text-white text-coinbase-ink shadow-soft"
         title="Download"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
      </a>

      {/* Image Container */}
      <div className="bg-[#e2e8f0] aspect-[4/3] w-full flex items-center justify-center p-6 overflow-hidden border-b border-coinbase-hairline">
        {thumbnailUrl && !imgError ? (
          <img 
            src={thumbnailUrl} 
            alt={asset.title} 
            className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-[1.03]" 
            onError={() => setImgError(true)} 
            loading="lazy" 
          />
        ) : (
          <div className="text-3xl opacity-40 text-coinbase-muted transition-transform group-hover:scale-[1.03]">{assetType?.icon || '📄'}</div>
        )}
      </div>

      {/* Card Body: Metadata */}
      <div className="p-4 flex flex-col gap-2.5 flex-1">
        {/* Title */}
        <h3 className="text-coinbase-ink font-semibold text-[14px] leading-snug line-clamp-2 tracking-tight">
          {asset.title}
        </h3>

        {/* Brand + Format row */}
        <div className="flex items-center gap-2 text-[12px]">
          <span className="text-coinbase-muted font-medium truncate">{brand?.name || '—'}</span>
          <span className="text-coinbase-hairline">•</span>
          <span className="flex items-center gap-1 text-coinbase-muted font-medium">
            <span className="opacity-70">{assetType?.icon}</span>
            <span>{assetType?.name || '—'}</span>
          </span>
        </div>

        {/* Tags row */}
        {asset.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {asset.tags.slice(0, 3).map(t => (
              <span key={t} className="px-1.5 py-0.5 bg-coinbase-surface-strong rounded text-[10px] text-coinbase-ink uppercase tracking-wide font-semibold">
                #{t}
              </span>
            ))}
            {asset.tags.length > 3 && (
              <span className="px-1.5 py-0.5 text-[10px] text-coinbase-muted font-semibold">+{asset.tags.length - 3}</span>
            )}
          </div>
        )}

        {/* Date row */}
        <div className="text-[11px] text-coinbase-muted font-mono mt-auto pt-1 border-t border-coinbase-hairline">
          {new Date(asset.createdAt).toLocaleDateString()}
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
  isAdmin?: boolean;
}

const AssetGrid: React.FC<AssetGridProps> = ({
  assets,
  brands,
  assetTypes,
  onSelectAsset,
  selectedAssetId,
  viewMode,
  multiSelection,
  onToggleSelection,
  isAdmin
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
              {/* Mobile card list */}
              <div className="divide-y divide-coinbase-hairline md:hidden">
                {assets.map(asset => {
                  const brand = brands.find(b => b.id === asset.brandId);
                  const type = assetTypes.find(t => t.id === asset.typeId);
                  const thumb = getThumbnailUrl(asset.link);
                  const isSelected = selectedAssetId === asset.id;
                  const isChecked = multiSelection.has(asset.id);
                  const downloadUrl = getDownloadLink(asset.link);

                  return (
                    <div
                      key={asset.id}
                      onClick={() => onSelectAsset(asset)}
                      className={`p-3 flex items-center gap-3 cursor-pointer transition-colors ${isSelected || isChecked ? 'bg-coinbase-surface-strong' : 'hover:bg-coinbase-surface-soft'}`}
                    >
                      <div
                        className={`w-4 h-4 rounded-sm border flex items-center justify-center shrink-0 ${isChecked ? 'bg-coinbase-primary border-coinbase-primary text-white' : 'border-coinbase-muted bg-white text-transparent'}`}
                        onClick={(e) => { e.stopPropagation(); onToggleSelection(asset.id); }}
                      >
                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      </div>
                      <div className="w-10 h-10 rounded-lg bg-coinbase-surface-strong flex items-center justify-center overflow-hidden border border-coinbase-hairline shrink-0">
                        {thumb ? (
                          <img src={thumb} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <span className="text-[15px] opacity-70">{type?.icon}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className={`text-[14px] font-semibold truncate ${isSelected ? 'text-coinbase-primary' : 'text-coinbase-ink'}`}>{asset.title}</div>
                        <div className="text-[12px] text-coinbase-muted mt-0.5 flex items-center gap-1 flex-wrap">
                          <span>{brand?.name || '—'}</span>
                          <span className="text-coinbase-hairline">•</span>
                          <span className="flex items-center gap-0.5"><span className="opacity-70">{type?.icon}</span>{type?.name}</span>
                        </div>
                      </div>
                      <a
                        href={downloadUrl}
                        download={asset.title}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="shrink-0 p-2 text-coinbase-muted hover:text-coinbase-ink hover:bg-coinbase-surface-strong rounded-full transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      </a>
                    </div>
                  );
                })}
              </div>

              {/* Desktop table */}
              <table className="w-full text-left border-collapse hidden md:table">
                  <thead>
                      <tr className="bg-coinbase-surface-soft border-b border-coinbase-hairline">
                          <th className="p-4 w-12"></th>
                          <th className="p-4 text-[12px] text-coinbase-muted uppercase font-semibold tracking-wide w-16">Preview</th>
                          <th className="p-4 text-[12px] text-coinbase-muted uppercase font-semibold tracking-wide">Title</th>
                          <th className="p-4 text-[12px] text-coinbase-muted uppercase font-semibold tracking-wide">Brand</th>
                          <th className="p-4 text-[12px] text-coinbase-muted uppercase font-semibold tracking-wide">Format</th>
                          <th className="p-4 text-[12px] text-coinbase-muted uppercase font-semibold tracking-wide">Date</th>
                          {isAdmin && <th className="p-4 text-[12px] text-coinbase-muted uppercase font-semibold tracking-wide">Status</th>}
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
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {asset.tags.slice(0, 3).map(t => (
                                          <span key={t} className="text-[11px] text-coinbase-muted font-medium">#{t}</span>
                                        ))}
                                      </div>
                                  </td>
                                  <td className="p-4 text-[14px] text-coinbase-ink font-medium">{brand?.name || '—'}</td>
                                  <td className="p-4 text-[14px] text-coinbase-ink font-medium">
                                      <span className="flex items-center gap-1.5">
                                        <span className="opacity-70">{type?.icon}</span>{type?.name}
                                      </span>
                                  </td>
                                  <td className="p-4 text-[13px] text-coinbase-muted font-mono">
                                      {new Date(asset.createdAt).toLocaleDateString()}
                                  </td>
                                  {isAdmin && (
                                    <td className="p-4">
                                      <StatusBadge status={asset.status} />
                                    </td>
                                  )}
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
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5 lg:gap-6 pb-20">
      {assets.map(asset => {
         const brand = brands.find(b => b.id === asset.brandId);
         const type = assetTypes.find(t => t.id === asset.typeId);
         return (
           <AssetCard 
             key={asset.id}
             asset={asset}
             brand={brand}
             assetType={type}
             onSelect={onSelectAsset}
             isSelected={selectedAssetId === asset.id}
             isChecked={multiSelection.has(asset.id)}
             onToggleSelection={onToggleSelection}
             isAdmin={isAdmin}
           />
         );
      })}
    </div>
  );
};

export default AssetGrid;

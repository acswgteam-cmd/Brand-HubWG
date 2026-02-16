
import React, { useState } from 'react';
import { Asset, Brand, AssetType } from '../types';
import { getThumbnailUrl } from '../services/assetService';

interface AssetCardProps {
  asset: Asset;
  brandName: string;
  icon: string;
  onSelect: (asset: Asset) => void;
  isSelected?: boolean;
}

const AssetCard: React.FC<AssetCardProps> = ({ 
  asset, brandName, icon, onSelect, isSelected
}) => {
  const [imgError, setImgError] = useState(false);
  const thumbnailUrl = getThumbnailUrl(asset.link);

  return (
    <div 
      onClick={() => onSelect(asset)}
      className={`
        bg-white rounded-xl p-3 cursor-pointer transition-all duration-300 relative group border border-slate-200
        ${isSelected ? 'ring-2 ring-wg-honorable shadow-lg' : 'hover:-translate-y-1 hover:shadow-md'}
      `}
    >
      {/* Image Container - Darker BG (slate-300) for contrast */}
      <div className="bg-slate-300 rounded-lg aspect-[4/3] w-full flex items-center justify-center p-6 mb-3 overflow-hidden">
        {thumbnailUrl && !imgError ? (
          <img 
            src={thumbnailUrl} 
            alt={asset.title} 
            className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105" 
            onError={() => setImgError(true)} 
            loading="lazy" 
          />
        ) : (
          <div className="text-3xl opacity-40 text-slate-500 group-hover:scale-110 transition-transform">{icon}</div>
        )}
      </div>

      <div className="px-1">
        <h3 className="text-slate-900 font-bold text-xs mb-1.5 leading-snug line-clamp-2 min-h-[2.5em]">
          {asset.title}
        </h3>
        <div className="flex items-center justify-between">
           <span className="text-[10px] font-bold text-slate-400 truncate max-w-[60%]">
             {brandName}
           </span>
           {asset.tags.length > 0 && (
             <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[9px] font-bold text-slate-500 uppercase tracking-wide">
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
}

const AssetGrid: React.FC<AssetGridProps> = ({
  assets,
  brands,
  assetTypes,
  onSelectAsset,
  selectedAssetId,
  viewMode
}) => {
  
  if (assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-white rounded-xl border-2 border-dashed border-slate-200">
        <div className="text-4xl mb-4 opacity-30">📂</div>
        <h3 className="text-base font-bold text-slate-900 mb-1">No Assets Found</h3>
        <p className="text-slate-500 text-xs">Try changing filters or search terms.</p>
      </div>
    );
  }

  if (viewMode === 'list') {
      return (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm mb-20">
              <table className="w-full text-left border-collapse">
                  <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-16">Preview</th>
                          <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Title</th>
                          <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Entity</th>
                          <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                          <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                      </tr>
                  </thead>
                  <tbody>
                      {assets.map(asset => {
                          const brand = brands.find(b => b.id === asset.brandId);
                          const type = assetTypes.find(t => t.id === asset.typeId);
                          const thumb = getThumbnailUrl(asset.link);
                          const isSelected = selectedAssetId === asset.id;

                          return (
                              <tr 
                                key={asset.id} 
                                onClick={() => onSelectAsset(asset)}
                                className={`cursor-pointer transition-colors border-b border-slate-50 last:border-0 ${isSelected ? 'bg-wg-honorable/5' : 'hover:bg-slate-50'}`}
                              >
                                  <td className="p-3">
                                      <div className="w-10 h-10 rounded bg-slate-200 flex items-center justify-center overflow-hidden border border-slate-300">
                                          {thumb ? (
                                              <img src={thumb} className="w-full h-full object-cover" loading="lazy" />
                                          ) : (
                                              <span className="text-sm">{type?.icon}</span>
                                          )}
                                      </div>
                                  </td>
                                  <td className="p-3">
                                      <div className={`text-sm font-bold ${isSelected ? 'text-wg-honorable' : 'text-slate-900'}`}>{asset.title}</div>
                                      <div className="text-[10px] text-slate-400 mt-0.5">{asset.tags.slice(0, 3).map(t => `#${t} `)}</div>
                                  </td>
                                  <td className="p-3 text-xs font-semibold text-slate-600">{brand?.name}</td>
                                  <td className="p-3 text-xs font-semibold text-slate-600 flex items-center gap-2">
                                      <span>{type?.icon}</span>{type?.name}
                                  </td>
                                  <td className="p-3 text-xs text-slate-400 font-mono">
                                      {new Date(asset.updatedAt).toLocaleDateString()}
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
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 lg:gap-6 pb-20">
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
           />
         );
      })}
    </div>
  );
};

export default AssetGrid;

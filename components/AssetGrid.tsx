
import React, { useState, useMemo } from 'react';
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
      {/* Image Container - Darker background for contrast */}
      <div className="bg-slate-200 rounded-lg aspect-[4/3] w-full flex items-center justify-center p-6 mb-3 overflow-hidden">
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
}

const AssetGrid: React.FC<AssetGridProps> = ({
  assets,
  brands,
  assetTypes,
  onSelectAsset,
  selectedAssetId
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

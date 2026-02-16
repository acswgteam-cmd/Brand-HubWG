
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
        glass-card rounded-[2rem] p-4 cursor-pointer transition-all duration-300 relative group
        ${isSelected ? 'ring-2 ring-wg-honorable shadow-lg scale-[1.02] bg-white' : 'hover:-translate-y-1 hover:shadow-xl hover:bg-white/80'}
      `}
    >
      {/* Image Container - Minimalist with padding */}
      <div className="bg-slate-50/80 rounded-[1.5rem] aspect-[4/3] w-full flex items-center justify-center p-6 mb-4 overflow-hidden border border-slate-100">
        {thumbnailUrl && !imgError ? (
          <img 
            src={thumbnailUrl} 
            alt={asset.title} 
            className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105" 
            onError={() => setImgError(true)} 
            loading="lazy" 
          />
        ) : (
          <div className="text-4xl opacity-30 text-slate-400 group-hover:scale-110 transition-transform">{icon}</div>
        )}
      </div>

      <div className="px-1">
        <h3 className="text-slate-900 font-bold text-sm mb-1 leading-tight line-clamp-2 min-h-[2.5em]">
          {asset.title}
        </h3>
        <div className="flex items-center justify-between mt-2">
           <span className="text-[9px] font-black text-wg-honorable/70 uppercase tracking-widest truncate max-w-[60%]">
             {brandName}
           </span>
           {asset.tags.length > 0 && (
             <span className="px-2 py-0.5 bg-slate-100 rounded-full text-[9px] font-bold text-slate-400 uppercase tracking-wide">
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
  
  // Grouping Logic (Simplified)
  const groupedAssets = useMemo(() => {
    // Just simple flat list for now or minimal grouping if needed.
    // Let's keep it clean as requested -> "Spacing antar elemen buat yang agak lega"
    // We will render a flat grid for maximum breathability
    return assets;
  }, [assets]);

  if (assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 glass-card rounded-[2.5rem] border-dashed border-slate-300">
        <div className="text-5xl mb-4 opacity-30">📂</div>
        <h3 className="text-lg font-bold text-slate-900 mb-2">No Assets Found</h3>
        <p className="text-slate-500 text-sm">Try changing filters.</p>
      </div>
    );
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
           />
         );
      })}
    </div>
  );
};

export default AssetGrid;

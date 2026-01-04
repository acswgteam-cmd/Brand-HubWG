
import React, { useState } from 'react';
import { Asset, Brand, AssetType } from '../types';
import { getThumbnailUrl } from '../services/assetService';

interface AssetCardProps {
  asset: Asset;
  brandName: string;
  icon: string;
  onSelect: (asset: Asset) => void;
  onEdit?: (asset: Asset) => void;
  isAdmin: boolean;
}

const AssetCard: React.FC<AssetCardProps> = ({ asset, brandName, icon, onSelect, onEdit, isAdmin }) => {
  const [imgError, setImgError] = useState(false);
  const isNew = new Date().getTime() - new Date(asset.createdAt).getTime() < 1000 * 60 * 60 * 24 * 7;
  const thumbnailUrl = getThumbnailUrl(asset.link);

  return (
    <div className="group bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col relative">
      {isNew && (
        <span className="absolute top-3 left-3 z-20 px-2 py-0.5 bg-wg-honorable text-white text-[10px] font-bold rounded uppercase tracking-wider shadow-sm">
          New
        </span>
      )}
      
      <div 
        className="aspect-video bg-slate-50 relative overflow-hidden cursor-pointer"
        onClick={() => onSelect(asset)}
      >
        {thumbnailUrl && !imgError ? (
          <img 
            src={thumbnailUrl} 
            alt={asset.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-5xl opacity-40 group-hover:scale-110 transition-transform duration-300">
            {icon}
          </div>
        )}
        <div className="absolute inset-0 bg-wg-honorable/0 group-hover:bg-wg-honorable/5 transition-colors duration-300" />
      </div>

      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between mb-1">
          <span className="text-[10px] font-black text-wg-honorable uppercase tracking-widest">{brandName}</span>
          <span className="text-[10px] text-wg-text-dark/40 font-bold">{new Date(asset.createdAt).toLocaleDateString()}</span>
        </div>
        
        <h3 
          className="text-wg-text-dark font-bold mb-2 group-hover:text-wg-honorable transition-colors line-clamp-1 cursor-pointer"
          onClick={() => onSelect(asset)}
        >
          {asset.title}
        </h3>
        
        <p className="text-wg-text-dark/50 text-xs line-clamp-2 mb-4 h-8 font-medium">
          {asset.description || 'No description provided.'}
        </p>

        <div className="mt-auto pt-3 border-t border-slate-50 flex items-center justify-between">
          <div className="flex gap-1 overflow-hidden">
            {asset.tags.slice(0, 2).map(tag => (
              <span key={tag} className="px-2 py-0.5 bg-wg-sky/40 text-wg-honorable text-[10px] font-black uppercase rounded truncate">#{tag}</span>
            ))}
          </div>
          
          <div className="flex gap-2">
            {isAdmin && onEdit && (
              <button 
                onClick={(e) => { e.stopPropagation(); onEdit(asset); }}
                className="p-1.5 text-wg-text-dark/20 hover:text-wg-burgundy hover:bg-wg-burgundy/5 rounded-md transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}
            <button 
              onClick={() => onSelect(asset)}
              className="p-1.5 text-wg-text-dark/20 hover:text-wg-honorable hover:bg-wg-sky/30 rounded-md transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
          </div>
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
  onEditAsset?: (asset: Asset) => void;
  isAdmin: boolean;
}

const AssetGrid: React.FC<AssetGridProps> = ({ assets, brands, assetTypes, onSelectAsset, onEditAsset, isAdmin }) => {
  const getBrandName = (id: string) => brands.find(b => b.id === id)?.name || 'Unknown';
  const getIcon = (id: string) => assetTypes.find(t => t.id === id)?.icon || '📁';

  if (assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-wg-text-dark/20">
        <svg className="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <p className="text-lg font-bold">No assets found</p>
        <p className="text-sm font-medium">Try adjusting your search or filters</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {assets.map((asset) => (
        <AssetCard 
          key={asset.id}
          asset={asset}
          brandName={getBrandName(asset.brandId)}
          icon={getIcon(asset.typeId)}
          onSelect={onSelectAsset}
          onEdit={onEditAsset}
          isAdmin={isAdmin}
        />
      ))}
    </div>
  );
};

export default AssetGrid;

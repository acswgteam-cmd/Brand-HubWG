
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
  isDragging?: boolean;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: () => void;
}

const AssetCard: React.FC<AssetCardProps> = ({ 
  asset, brandName, icon, onSelect, onEdit, isAdmin,
  isDragging, onDragStart, onDragOver, onDrop 
}) => {
  const [imgError, setImgError] = useState(false);
  const thumbnailUrl = getThumbnailUrl(asset.link);

  return (
    <div 
      draggable={isAdmin}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`group bg-white rounded-xl border border-slate-100 overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col relative ${isAdmin ? 'cursor-move' : ''} ${isDragging ? 'opacity-30 scale-95 border-wg-honorable border-2' : ''}`}
    >
      {isAdmin && (
        <div className="absolute top-2 right-2 z-20 p-1 bg-white/80 backdrop-blur shadow-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
          <svg className="w-3.5 h-3.5 text-slate-400" fill="currentColor" viewBox="0 0 20 20"><path d="M7 2a2 2 0 100 4h2a2 2 0 100-4H7zM11 2a2 2 0 100 4h2a2 2 0 100-4h-2zM7 8a2 2 0 100 4h2a2 2 0 100-4H7zM11 8a2 2 0 100 4h2a2 2 0 100-4h-2zM7 14a2 2 0 100 4h2a2 2 0 100-4H7zM11 14a2 2 0 100 4h2a2 2 0 100-4h-2z" /></svg>
        </div>
      )}
      
      <div className="aspect-[4/3] bg-slate-50 relative overflow-hidden cursor-pointer" onClick={() => onSelect(asset)}>
        {thumbnailUrl && !imgError ? (
          <img src={thumbnailUrl} alt={asset.title} className="w-full h-full object-cover" onError={() => setImgError(true)} loading="lazy" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-4xl opacity-40">{icon}</div>
        )}
      </div>

      <div className="p-3 flex flex-col flex-1">
        <div className="flex items-start justify-between mb-1">
          <span className="text-[9px] font-black text-wg-honorable uppercase tracking-widest truncate max-w-[80%]">{brandName}</span>
          <span className="text-[9px] text-slate-400 font-bold">#{asset.sortOrder || 0}</span>
        </div>
        <h3 className="text-slate-900 font-bold text-xs mb-2 line-clamp-1" title={asset.title}>{asset.title}</h3>
        
        <div className="mt-auto pt-2 border-t border-slate-50 flex items-center justify-between">
          <div className="flex gap-1 overflow-hidden">
            {asset.tags.slice(0, 1).map(tag => (
              <span key={tag} className="px-1.5 py-0.5 bg-wg-sky/40 text-wg-honorable text-[9px] font-black uppercase rounded truncate max-w-[60px]">#{tag}</span>
            ))}
          </div>
          <div className="flex gap-1">
            {isAdmin && onEdit && (
              <button onClick={(e) => { e.stopPropagation(); onEdit(asset); }} className="p-1 text-slate-300 hover:text-wg-burgundy transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              </button>
            )}
            <button onClick={() => onSelect(asset)} className="p-1 text-slate-300 hover:text-wg-honorable transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface AssetListRowProps {
  asset: Asset;
  brandName: string;
  icon: string;
  onSelect: (asset: Asset) => void;
  onEdit?: (asset: Asset) => void;
  isAdmin: boolean;
  isDragging?: boolean;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: () => void;
}

const AssetListRow: React.FC<AssetListRowProps> = ({
  asset, brandName, icon, onSelect, onEdit, isAdmin,
  isDragging, onDragStart, onDragOver, onDrop
}) => {
  return (
    <div 
      draggable={isAdmin}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`flex items-center gap-4 p-3 bg-white border border-slate-100 rounded-xl hover:shadow-md transition-all group ${isAdmin ? 'cursor-move' : ''} ${isDragging ? 'opacity-30 border-wg-honorable scale-[0.99]' : ''}`}
    >
      <div className="w-10 h-10 shrink-0 bg-slate-50 rounded-lg flex items-center justify-center text-xl" onClick={() => onSelect(asset)}>
        {icon}
      </div>
      
      <div className="flex-1 min-w-0" onClick={() => onSelect(asset)}>
        <h3 className="text-sm font-bold text-slate-900 truncate">{asset.title}</h3>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-[9px] font-black text-wg-honorable uppercase tracking-widest">{brandName}</span>
          <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
          <span className="text-[9px] text-slate-400 font-bold">#{asset.sortOrder || 0}</span>
        </div>
      </div>

      <div className="hidden md:flex gap-1.5">
        {asset.tags.slice(0, 2).map(tag => (
          <span key={tag} className="px-2 py-0.5 bg-wg-sky/30 text-wg-honorable text-[8px] font-black uppercase rounded">#{tag}</span>
        ))}
      </div>

      <div className="flex gap-2">
        {isAdmin && onEdit && (
          <button onClick={(e) => { e.stopPropagation(); onEdit(asset); }} className="p-2 text-slate-300 hover:text-wg-burgundy transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          </button>
        )}
        <button onClick={() => onSelect(asset)} className="p-2 text-slate-300 hover:text-wg-honorable transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
        </button>
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
  onReorderAssets?: (assets: Asset[]) => void;
  isAdmin: boolean;
  viewMode: 'grid' | 'list';
}

const AssetGrid: React.FC<AssetGridProps> = ({ assets, brands, assetTypes, onSelectAsset, onEditAsset, onReorderAssets, isAdmin, viewMode }) => {
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  const getBrandName = (id: string) => brands.find(b => b.id === id)?.name || 'Unknown';
  const getIcon = (id: string) => assetTypes.find(t => t.id === id)?.icon || '📁';

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  
  const handleDrop = (targetIdx: number) => {
    if (draggedIdx === null || draggedIdx === targetIdx || !onReorderAssets) return;
    const newList = [...assets];
    const [draggedItem] = newList.splice(draggedIdx, 1);
    newList.splice(targetIdx, 0, draggedItem);
    onReorderAssets(newList.map((item, idx) => ({ ...item, sortOrder: idx })));
    setDraggedIdx(null);
  };

  if (assets.length === 0) return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-300">
      <p className="text-lg font-bold">No assets found</p>
    </div>
  );

  return (
    <div className={viewMode === 'grid' ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6" : "flex flex-col gap-3"}>
      {assets.map((asset, index) => (
        viewMode === 'grid' ? (
          <AssetCard 
            key={asset.id}
            asset={asset}
            brandName={getBrandName(asset.brandId)}
            icon={getIcon(asset.typeId)}
            onSelect={onSelectAsset}
            onEdit={onEditAsset}
            isAdmin={isAdmin}
            isDragging={draggedIdx === index}
            onDragStart={() => isAdmin && setDraggedIdx(index)}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(index)}
          />
        ) : (
          <AssetListRow
            key={asset.id}
            asset={asset}
            brandName={getBrandName(asset.brandId)}
            icon={getIcon(asset.typeId)}
            onSelect={onSelectAsset}
            onEdit={onEditAsset}
            isAdmin={isAdmin}
            isDragging={draggedIdx === index}
            onDragStart={() => isAdmin && setDraggedIdx(index)}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(index)}
          />
        )
      ))}
    </div>
  );
};

export default AssetGrid;

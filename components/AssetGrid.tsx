
import React, { useState, useMemo } from 'react';
import { Asset, Brand, AssetType } from '../types';
import { getThumbnailUrl, getDownloadLink } from '../services/assetService';

interface AssetCardProps {
  asset: Asset;
  brandName: string;
  icon: string;
  onSelect: (asset: Asset) => void;
  onEdit?: (asset: Asset) => void;
  onDelete?: (assetId: string) => void;
  isAdmin: boolean;
  isDragging?: boolean;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: () => void;
  // Selection props
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (id: string) => void;
  onDownload?: (asset: Asset) => void;
}

const AssetCard: React.FC<AssetCardProps> = ({ 
  asset, brandName, icon, onSelect, onEdit, onDelete, isAdmin,
  isDragging, onDragStart, onDragOver, onDrop,
  selectionMode, isSelected, onToggleSelection, onDownload
}) => {
  const [imgError, setImgError] = useState(false);
  const thumbnailUrl = getThumbnailUrl(asset.link);
  const downloadUrl = getDownloadLink(asset.link);

  return (
    <div 
      draggable={isAdmin}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={() => selectionMode && onToggleSelection && onToggleSelection(asset.id)}
      className={`group bg-white rounded-xl border overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col relative animate-fade-in-up 
        ${isAdmin ? 'cursor-move' : ''} 
        ${isDragging ? 'opacity-30 scale-95 border-wg-honorable border-2' : ''}
        ${isSelected ? 'border-wg-honorable ring-2 ring-wg-honorable ring-offset-2' : 'border-slate-100'}
      `}
    >
      {/* Selection Checkbox Overlay */}
      {selectionMode && (
        <div className="absolute top-3 left-3 z-30 pointer-events-none">
          <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${isSelected ? 'bg-wg-honorable border-wg-honorable' : 'bg-white/80 border-slate-300'}`}>
            {isSelected && <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
          </div>
        </div>
      )}

      {isAdmin && !selectionMode && (
        <div className="absolute top-2 right-2 z-20 p-1 bg-white/80 backdrop-blur shadow-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
          <svg className="w-3.5 h-3.5 text-slate-400" fill="currentColor" viewBox="0 0 20 20"><path d="M7 2a2 2 0 100 4h2a2 2 0 100-4H7zM11 2a2 2 0 100 4h2a2 2 0 100-4h-2zM7 8a2 2 0 100 4h2a2 2 0 100-4H7zM11 8a2 2 0 100 4h2a2 2 0 100-4h-2zM7 14a2 2 0 100 4h2a2 2 0 100-4H7zM11 14a2 2 0 100 4h2a2 2 0 100-4h-2z" /></svg>
        </div>
      )}
      
      <div className="aspect-[4/3] bg-slate-200 relative overflow-hidden cursor-pointer flex items-center justify-center p-2" onClick={() => !selectionMode && onSelect(asset)}>
        {thumbnailUrl && !imgError ? (
          <img src={thumbnailUrl} alt={asset.title} className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105" onError={() => setImgError(true)} loading="lazy" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-4xl opacity-40 group-hover:scale-110 transition-transform duration-300 text-slate-400">{icon}</div>
        )}
      </div>

      <div className="p-3 flex flex-col flex-1">
        <div className="flex items-start justify-between mb-1">
          <span className="text-[9px] font-black text-wg-honorable uppercase tracking-widest truncate max-w-[80%]">{brandName}</span>
          <span className="text-[9px] text-slate-400 font-bold">#{asset.sortOrder || 0}</span>
        </div>
        <h3 className="text-slate-900 font-bold text-xs mb-2 line-clamp-1" title={asset.title}>{asset.title}</h3>
        
        <div className="mt-auto pt-2 border-t border-slate-50 flex items-center justify-between">
          <div className="flex gap-1 overflow-hidden flex-1 mr-2">
            {asset.tags && asset.tags.slice(0, 3).map(tag => (
              <span key={tag} className="px-1.5 py-0.5 bg-wg-sky/40 text-wg-honorable text-[9px] font-black uppercase rounded truncate max-w-[60px]">#{tag}</span>
            ))}
          </div>
          <div className="flex gap-1 shrink-0">
            {!selectionMode && (
              <>
                <a 
                  href={downloadUrl} 
                  download={asset.title} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  onClick={(e) => { e.stopPropagation(); onDownload && onDownload(asset); }}
                  className="p-1 text-slate-300 hover:text-wg-honorable transition-colors hover:scale-110"
                  title="Download"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                </a>
                {isAdmin && onEdit && (
                  <button onClick={(e) => { e.stopPropagation(); onEdit(asset); }} className="p-1 text-slate-300 hover:text-wg-royal transition-colors hover:scale-110" title="Edit">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                )}
                {isAdmin && onDelete && (
                  <button onClick={(e) => { e.stopPropagation(); onDelete(asset.id); }} className="p-1 text-slate-300 hover:text-wg-burgundy transition-colors hover:scale-110" title="Delete">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                )}
                <button onClick={() => onSelect(asset)} className="p-1 text-slate-300 hover:text-wg-honorable transition-colors hover:scale-110" title="View">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                </button>
              </>
            )}
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
  onDelete?: (assetId: string) => void;
  isAdmin: boolean;
  isDragging?: boolean;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: () => void;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (id: string) => void;
  onDownload?: (asset: Asset) => void;
}

const AssetListRow: React.FC<AssetListRowProps> = ({
  asset, brandName, icon, onSelect, onEdit, onDelete, isAdmin,
  isDragging, onDragStart, onDragOver, onDrop,
  selectionMode, isSelected, onToggleSelection, onDownload
}) => {
  const [imgError, setImgError] = useState(false);
  const thumbnailUrl = getThumbnailUrl(asset.link);
  const downloadUrl = getDownloadLink(asset.link);

  return (
    <div 
      draggable={isAdmin}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={() => selectionMode && onToggleSelection && onToggleSelection(asset.id)}
      className={`flex items-center gap-4 p-3 bg-white border rounded-xl hover:shadow-md transition-all group animate-fade-in-up 
        ${isAdmin ? 'cursor-move' : ''} 
        ${isDragging ? 'opacity-30 border-wg-honorable scale-[0.99]' : ''}
        ${isSelected ? 'border-wg-honorable bg-wg-honorable/5' : 'border-slate-100'}
      `}
    >
      {selectionMode && (
         <div className={`w-5 h-5 shrink-0 rounded-md border flex items-center justify-center transition-colors ${isSelected ? 'bg-wg-honorable border-wg-honorable' : 'bg-white border-slate-300'}`}>
            {isSelected && <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
         </div>
      )}

      <div className="w-10 h-10 shrink-0 bg-slate-200 rounded-lg flex items-center justify-center text-xl overflow-hidden" onClick={() => !selectionMode && onSelect(asset)}>
        {thumbnailUrl && !imgError ? (
          <img src={thumbnailUrl} alt={asset.title} className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-110" onError={() => setImgError(true)} loading="lazy" />
        ) : (
          <span className="text-slate-400">{icon}</span>
        )}
      </div>
      
      <div className="flex-1 min-w-0" onClick={() => !selectionMode && onSelect(asset)}>
        <h3 className="text-sm font-bold text-slate-900 truncate group-hover:text-wg-honorable transition-colors">{asset.title}</h3>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-[9px] font-black text-wg-honorable uppercase tracking-widest">{brandName}</span>
          <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
          <span className="text-[9px] text-slate-400 font-bold">#{asset.sortOrder || 0}</span>
        </div>
      </div>

      <div className="hidden md:flex gap-1.5">
        {asset.tags && asset.tags.slice(0, 2).map(tag => (
          <span key={tag} className="px-2 py-0.5 bg-wg-sky/30 text-wg-honorable text-[8px] font-black uppercase rounded">#{tag}</span>
        ))}
      </div>

      <div className="flex gap-2">
        {!selectionMode && (
          <>
            <a 
              href={downloadUrl} 
              download={asset.title} 
              target="_blank" 
              rel="noopener noreferrer"
              onClick={(e) => { e.stopPropagation(); onDownload && onDownload(asset); }}
              className="p-2 text-slate-300 hover:text-wg-honorable transition-colors hover:scale-110"
              title="Download"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            </a>
            {isAdmin && onEdit && (
              <button onClick={(e) => { e.stopPropagation(); onEdit(asset); }} className="p-2 text-slate-300 hover:text-wg-royal transition-colors hover:scale-110" title="Edit">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              </button>
            )}
            {isAdmin && onDelete && (
              <button onClick={(e) => { e.stopPropagation(); onDelete(asset.id); }} className="p-2 text-slate-300 hover:text-wg-burgundy transition-colors hover:scale-110" title="Delete">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            )}
            <button onClick={() => onSelect(asset)} className="p-2 text-slate-300 hover:text-wg-honorable transition-colors hover:scale-110" title="View">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
};

interface AssetGridProps {
  assets: Asset[];
  brands: Brand[];
  assetTypes: AssetType[];
  isAdmin: boolean;
  viewMode: 'grid' | 'list';
  onSelectAsset: (asset: Asset) => void;
  onEditAsset?: (asset: Asset) => void;
  onDeleteAsset?: (assetId: string) => void;
  onReorderAssets?: (assets: Asset[]) => void;
  selectionMode?: boolean;
  selectedAssetIds?: Set<string>;
  onToggleSelection?: (id: string) => void;
  onDownloadAsset?: (asset: Asset) => void;
}

const getAssetGroup = (asset: Asset) => {
  const title = asset.title.toLowerCase();
  
  // 1. Color Variants
  if (title.includes('white') || title.includes('putih') || title.includes('negative')) return 'White / Negative';
  if (title.includes('black') || title.includes('hitam') || title.includes('monochrome')) return 'Black / Monochrome';
  if (title.includes('color') || title.includes('full') || title.includes('warna') || title.includes('blue') || title.includes('biru')) return 'Full Color / Brand';
  
  // 2. Shape / Orientation
  if (title.includes('round') || title.includes('bulat') || title.includes('circle')) return 'Round / Circular';
  if (title.includes('vert') || title.includes('port')) return 'Vertical';
  if (title.includes('horiz') || title.includes('land')) return 'Horizontal';
  if (title.includes('icon') || title.includes('symbol') || title.includes('logogram')) return 'Icon Only';
  
  // 3. Fallback to File Type via Extension
  if (asset.link.match(/\.png$/i)) return 'PNG Images';
  if (asset.link.match(/\.jpe?g$/i)) return 'JPG Images';
  if (asset.link.match(/\.svg$/i)) return 'Vector (SVG)';
  if (asset.link.match(/\.pdf$/i)) return 'Documents (PDF)';
  if (asset.link.match(/\.mp4$/i) || asset.link.match(/\.mov$/i)) return 'Video Files';
  
  return 'Other Assets';
};

const GROUP_ORDER = [
  'Full Color / Brand', 
  'White / Negative', 
  'Black / Monochrome', 
  'Vertical', 
  'Horizontal', 
  'Round / Circular', 
  'Icon Only',
  'Vector (SVG)',
  'PNG Images',
  'JPG Images',
  'Documents (PDF)',
  'Video Files',
  'Other Assets'
];

const AssetGrid: React.FC<AssetGridProps> = ({
  assets,
  brands,
  assetTypes,
  isAdmin,
  viewMode,
  onSelectAsset,
  onEditAsset,
  onDeleteAsset,
  onReorderAssets,
  selectionMode = false,
  selectedAssetIds = new Set(),
  onToggleSelection,
  onDownloadAsset
}) => {
  const [draggedAssetId, setDraggedAssetId] = useState<string | null>(null);

  const handleDragStart = (id: string) => {
    if (!isAdmin) return;
    setDraggedAssetId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!isAdmin) return;
    e.preventDefault(); 
  };

  const handleDrop = (targetId: string) => {
    if (!isAdmin || !draggedAssetId || !onReorderAssets) return;
    if (draggedAssetId === targetId) return;

    const draggedIndex = assets.findIndex(a => a.id === draggedAssetId);
    const targetIndex = assets.findIndex(a => a.id === targetId);
    
    if (draggedIndex === -1 || targetIndex === -1) return;

    const newAssets = [...assets];
    const [movedAsset] = newAssets.splice(draggedIndex, 1);
    newAssets.splice(targetIndex, 0, movedAsset);
    
    onReorderAssets(newAssets);
    setDraggedAssetId(null);
  };

  // Grouping Logic
  const groupedAssets = useMemo(() => {
    const groups: Record<string, Asset[]> = {};
    assets.forEach(asset => {
      const group = getAssetGroup(asset);
      if (!groups[group]) groups[group] = [];
      groups[group].push(asset);
    });
    return groups;
  }, [assets]);

  const sortedGroupKeys = useMemo(() => {
    return Object.keys(groupedAssets).sort((a, b) => {
      const idxA = GROUP_ORDER.indexOf(a);
      const idxB = GROUP_ORDER.indexOf(b);
      // If both are in the known list, sort by index
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      // If only A is known, A comes first
      if (idxA !== -1) return -1;
      // If only B is known, B comes first
      if (idxB !== -1) return 1;
      // Otherwise alphabetical
      return a.localeCompare(b);
    });
  }, [groupedAssets]);

  if (assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
        <div className="text-4xl mb-4 opacity-50">📂</div>
        <h3 className="text-lg font-bold text-slate-900 mb-2">No Assets Found</h3>
        <p className="text-slate-500 text-sm max-w-xs text-center">Try adjusting your filters or search query to find what you're looking for.</p>
      </div>
    );
  }

  // If mostly everything falls into "Other" or single group, render standard flat grid
  const shouldRenderFlat = Object.keys(groupedAssets).length <= 1 || (Object.keys(groupedAssets).length === 2 && groupedAssets['Other Assets']?.length > 0);

  if (shouldRenderFlat) {
    return (
        <div className={viewMode === 'grid' ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6" : "flex flex-col gap-3"}>
          {assets.map(asset => {
             const brand = brands.find(b => b.id === asset.brandId);
             const type = assetTypes.find(t => t.id === asset.typeId);
             const commonProps = {
                key: asset.id,
                asset,
                brandName: brand?.name || 'Unknown Entity',
                icon: type?.icon || '📄',
                onSelect: onSelectAsset,
                onEdit: onEditAsset,
                onDelete: onDeleteAsset,
                isAdmin,
                isDragging: draggedAssetId === asset.id,
                onDragStart: () => handleDragStart(asset.id),
                onDragOver: handleDragOver,
                onDrop: () => handleDrop(asset.id),
                selectionMode,
                isSelected: selectedAssetIds.has(asset.id),
                onToggleSelection,
                onDownload: onDownloadAsset
              };
             return viewMode === 'grid' ? <AssetCard {...commonProps} /> : <AssetListRow {...commonProps} />;
          })}
        </div>
    )
  }

  return (
    <div className="space-y-10">
      {sortedGroupKeys.map(group => (
        <div key={group} className="animate-fade-in-up">
          <div className="flex items-center gap-3 mb-4">
             <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">{group}</h3>
             <div className="h-px bg-slate-100 flex-1"></div>
             <span className="text-[10px] font-bold text-slate-300 bg-slate-50 px-2 py-0.5 rounded-full">{groupedAssets[group].length}</span>
          </div>
          <div className={viewMode === 'grid' 
            ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6" 
            : "flex flex-col gap-3"
          }>
            {groupedAssets[group].map((asset) => {
              const brand = brands.find(b => b.id === asset.brandId);
              const type = assetTypes.find(t => t.id === asset.typeId);
              
              const commonProps = {
                key: asset.id,
                asset,
                brandName: brand?.name || 'Unknown Entity',
                icon: type?.icon || '📄',
                onSelect: onSelectAsset,
                onEdit: onEditAsset,
                onDelete: onDeleteAsset,
                isAdmin,
                isDragging: draggedAssetId === asset.id,
                onDragStart: () => handleDragStart(asset.id),
                onDragOver: handleDragOver,
                onDrop: () => handleDrop(asset.id),
                selectionMode,
                isSelected: selectedAssetIds.has(asset.id),
                onToggleSelection,
                onDownload: onDownloadAsset
              };

              return viewMode === 'grid' 
                ? <AssetCard {...commonProps} />
                : <AssetListRow {...commonProps} />;
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default AssetGrid;

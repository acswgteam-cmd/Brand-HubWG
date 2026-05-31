import React, { useMemo, useState, useEffect } from 'react';
import { Asset, Brand, AssetType, AssetRequest } from '../types';
import * as service from '../services/assetService';

interface DashboardProps {
  assets: Asset[];
  brands: Brand[];
  assetTypes: AssetType[];
  onNavigateToAsset: (asset: Asset) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ assets, brands, assetTypes, onNavigateToAsset }) => {
  const [requests, setRequests] = useState<AssetRequest[]>([]);

  useEffect(() => {
    service.fetchAssetRequests()
      .then(data => setRequests(data))
      .catch(err => console.error("Error loading requests on dashboard:", err));
  }, []);

  const stats = useMemo(() => {
    // Only count PUBLISHED assets for the public dashboard stats
    const publishedAssets = assets.filter(a => a.status === 'PUBLISHED');
    const totalAssets = publishedAssets.length;
    const totalBrands = brands.length;
    const totalDownloads = publishedAssets.reduce((acc, curr) => acc + (curr.downloadCount || 0), 0);
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const newFilesCount = publishedAssets.filter(a => new Date(a.createdAt) > oneWeekAgo).length;
    return { totalAssets, totalBrands, totalDownloads, newFilesCount };
  }, [assets, brands]);

  // Get 5 latest uploaded published assets
  const latestAssets = useMemo(() => {
    return assets
      .filter(a => a.status === 'PUBLISHED')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [assets]);

  // Request status counts
  const requestSummary = useMemo(() => {
    const total = requests.length;
    const pending = requests.filter(r => r.status === 'PENDING').length;
    const inProgress = requests.filter(r => r.status === 'IN_PROGRESS').length;
    const completed = requests.filter(r => r.status === 'COMPLETED').length;
    const rejected = requests.filter(r => r.status === 'REJECTED').length;
    return { total, pending, inProgress, completed, rejected };
  }, [requests]);

  // Latest 3 requests
  const latestRequests = useMemo(() => {
    return [...requests]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3);
  }, [requests]);

  return (
    <div className="p-4 lg:p-16 pb-24 max-w-[1000px] mx-auto space-y-6 lg:space-y-12">
      
      {/* Header Area */}
      <div className="flex flex-wrap items-center gap-2 mb-4 lg:mb-8">
         <h2 className="text-[20px] lg:text-[24px] font-medium tracking-[-0.01em] text-coinbase-ink">Overview Dashboard</h2>
         <div className="hidden sm:block w-[1px] h-5 bg-coinbase-hairline"></div>
         <span className="text-[14px] lg:text-[16px] font-medium text-coinbase-muted">Statistik &amp; Aset Terbaru</span>
      </div>

      {/* Stats Row */}
      <div className="bg-white border border-coinbase-hairline rounded-xl p-5 lg:p-10 grid grid-cols-2 md:grid-cols-4 gap-5 lg:gap-10 relative overflow-hidden shadow-soft">
        <div className="relative z-10">
          <div className="text-[32px] lg:text-[40px] font-medium tracking-[-0.02em] text-coinbase-ink mb-1 tabular-nums">{stats.totalAssets}</div>
          <div className="text-[11px] lg:text-[14px] font-semibold text-coinbase-muted uppercase tracking-wide">Total Assets</div>
        </div>
        <div className="relative z-10 md:border-l border-coinbase-hairline md:pl-10">
          <div className="text-[32px] lg:text-[40px] font-medium tracking-[-0.02em] text-coinbase-ink mb-1 tabular-nums">{stats.totalBrands}</div>
          <div className="text-[11px] lg:text-[14px] font-semibold text-coinbase-muted uppercase tracking-wide">Entities</div>
        </div>
        <div className="relative z-10 md:border-l border-coinbase-hairline md:pl-10">
          <div className="text-[32px] lg:text-[40px] font-medium tracking-[-0.02em] text-coinbase-ink mb-1 tabular-nums">{stats.totalDownloads}</div>
          <div className="text-[11px] lg:text-[14px] font-semibold text-coinbase-muted uppercase tracking-wide">Downloads</div>
        </div>
        <div className="relative z-10 md:border-l border-coinbase-hairline md:pl-10">
          <div className="text-[32px] lg:text-[40px] font-medium tracking-[-0.02em] text-coinbase-primary mb-1 tabular-nums">{stats.newFilesCount}</div>
          <div className="text-[11px] lg:text-[14px] font-semibold text-coinbase-muted uppercase tracking-wide">New This Week</div>
        </div>
      </div>

      {/* User Request Summary Section */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* Summary Request Cards */}
        <div className="md:col-span-5 bg-white rounded-xl border border-coinbase-hairline shadow-soft p-6 space-y-6">
          <div>
            <h3 className="text-base font-bold text-coinbase-ink flex items-center gap-2">
              📋 Summary Request Aset
            </h3>
            <p className="text-[12px] text-coinbase-muted mt-1">Status permintaan aset Anda saat ini</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-coinbase-surface-soft p-4 rounded-xl border border-coinbase-hairline text-center">
              <span className="text-[20px] font-bold text-coinbase-ink block">{requestSummary.total}</span>
              <span className="text-[11px] font-semibold text-coinbase-muted uppercase tracking-wider block mt-1">Total</span>
            </div>
            <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100 text-center">
              <span className="text-[20px] font-bold text-amber-700 block">{requestSummary.pending}</span>
              <span className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider block mt-1">Menunggu</span>
            </div>
            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 text-center">
              <span className="text-[20px] font-bold text-blue-700 block">{requestSummary.inProgress}</span>
              <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider block mt-1">Diproses</span>
            </div>
            <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 text-center">
              <span className="text-[20px] font-bold text-emerald-700 block">{requestSummary.completed}</span>
              <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider block mt-1">Selesai</span>
            </div>
          </div>
        </div>

        {/* Latest Requests List */}
        <div className="md:col-span-7 bg-white rounded-xl border border-coinbase-hairline shadow-soft p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-coinbase-hairline pb-3">
            <h3 className="text-sm font-bold text-coinbase-ink">Request Terbaru</h3>
            <span className="text-[11px] text-coinbase-muted font-semibold">Update Terakhir</span>
          </div>

          <div className="space-y-3">
            {latestRequests.map(req => {
              const statusLabel = 
                req.status === 'PENDING' ? 'Menunggu' :
                req.status === 'IN_PROGRESS' ? 'Diproses' :
                req.status === 'COMPLETED' ? 'Selesai' : 'Ditolak';
              
              const statusClass = 
                req.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                req.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                req.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                'bg-red-50 text-red-700 border-red-200';

              return (
                <div key={req.id} className="flex items-center justify-between p-3 bg-coinbase-surface-soft/40 border border-coinbase-hairline rounded-lg text-xs gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-coinbase-ink truncate">{req.assetName}</p>
                    <p className="text-[10px] text-coinbase-muted mt-0.5">
                      Oleh {req.requesterName} • {new Date(req.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full border text-[10px] font-bold ${statusClass}`}>
                    {statusLabel}
                  </span>
                </div>
              );
            })}
            {latestRequests.length === 0 && (
              <div className="text-center py-6 text-coinbase-muted text-[13px]">Belum ada request aset yang diajukan.</div>
            )}
          </div>
        </div>

      </div>

      {/* Latest Uploads Section */}
      <div className="bg-white rounded-xl border border-coinbase-hairline shadow-soft p-4 lg:p-8">
        <h3 className="text-lg font-bold text-coinbase-ink mb-6">Aset yang Baru Diunggah</h3>
        <div className="divide-y divide-coinbase-hairline">
          {latestAssets.map(asset => {
            const brand = brands.find(b => b.id === asset.brandId);
            const type = assetTypes.find(t => t.id === asset.typeId);
            return (
              <div 
                key={asset.id} 
                className="py-3 lg:py-4 flex items-center justify-between gap-3 hover:bg-coinbase-surface-soft/50 px-2 rounded-lg transition-colors cursor-pointer"
                onClick={() => onNavigateToAsset(asset)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-coinbase-surface-strong flex items-center justify-center text-lg shrink-0">
                    {type?.icon || '📂'}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-semibold text-coinbase-ink text-[14px] truncate group-hover:text-coinbase-primary transition-colors">
                      {asset.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[12px] text-coinbase-muted">{brand?.name}</span>
                      <span className="text-coinbase-hairline text-[10px]">•</span>
                      <span className="text-[12px] text-coinbase-muted">{type?.name}</span>
                      <span className="text-coinbase-hairline text-[10px]">•</span>
                      <span className="text-[11px] text-coinbase-muted font-mono">{new Date(asset.createdAt).toLocaleDateString()}</span>
                      <span className="px-2 py-0.5 bg-[#f0fff4] text-[#22543d] border border-[#c6f6d5] rounded-full text-[10px] font-bold">
                        Published
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button 
                    className="hidden sm:block px-3 lg:px-4 py-1.5 text-xs font-semibold text-coinbase-primary hover:bg-coinbase-primary/10 rounded-pill transition-colors border border-coinbase-hairline"
                  >
                    Lihat Aset
                  </button>
                  <button className="sm:hidden p-2 rounded-full text-coinbase-primary hover:bg-coinbase-primary/10 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>
              </div>
            );
          })}
          {latestAssets.length === 0 && (
            <div className="text-center py-8 text-coinbase-muted text-sm">Belum ada aset yang diunggah.</div>
          )}
        </div>
      </div>

    </div>
  );
};

export default Dashboard;


import React, { useMemo } from 'react';
import { Asset, Brand, AssetType } from '../types';
import { getThumbnailUrl } from '../services/assetService';

interface DashboardProps {
  assets: Asset[];
  brands: Brand[];
  assetTypes: AssetType[];
  onNavigateToAsset: (asset: Asset) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ assets, brands, assetTypes, onNavigateToAsset }) => {
  const stats = useMemo(() => {
    const totalAssets = assets.length;
    const totalBrands = brands.length;
    // Mocking download count summation if not present in DB yet
    const totalDownloads = assets.reduce((acc, curr) => acc + (curr.downloadCount || Math.floor(Math.random() * 50)), 0);
    
    // Most downloaded (Popular)
    const sortedByPop = [...assets].sort((a, b) => (b.downloadCount || 0) - (a.downloadCount || 0));
    const mostPopular = sortedByPop[0];

    // New files this week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const newFilesCount = assets.filter(a => new Date(a.createdAt) > oneWeekAgo).length;

    return { totalAssets, totalBrands, totalDownloads, mostPopular, newFilesCount };
  }, [assets, brands]);

  return (
    <div className="p-6 lg:p-10 animate-fade-in-up pb-20">
      <h2 className="text-3xl font-extrabold text-slate-900 mb-2">Dashboard Overview</h2>
      <p className="text-slate-500 text-sm font-medium mb-8">Welcome back! Here is what's happening in the Brand Hub.</p>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
          <div className="text-slate-400 mb-2"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>
          <span className="text-3xl font-black text-slate-900">{stats.totalAssets}</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total Assets</span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
          <div className="text-slate-400 mb-2"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg></div>
          <span className="text-3xl font-black text-slate-900">{stats.totalBrands}</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Active Entities</span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
          <div className="text-slate-400 mb-2"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg></div>
          <span className="text-3xl font-black text-slate-900">{stats.totalDownloads.toLocaleString()}</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total Downloads</span>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
          <div className="text-wg-honorable mb-2"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
          <span className="text-3xl font-black text-slate-900">{stats.newFilesCount}</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">New Files This Week</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Most Popular */}
        <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
          <h3 className="text-lg font-extrabold text-slate-900 mb-6 flex items-center gap-2">
            <span className="text-xl">🔥</span> Most Popular Asset
          </h3>
          {stats.mostPopular ? (
            <div className="flex items-start gap-6 group cursor-pointer" onClick={() => onNavigateToAsset(stats.mostPopular)}>
              <div className="w-24 h-24 bg-slate-100 rounded-xl overflow-hidden shrink-0 border border-slate-200">
                {getThumbnailUrl(stats.mostPopular.link) ? (
                  <img src={getThumbnailUrl(stats.mostPopular.link)!} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">📄</div>
                )}
              </div>
              <div>
                <div className="text-[10px] font-black text-wg-honorable uppercase tracking-widest mb-1">
                  {brands.find(b => b.id === stats.mostPopular.brandId)?.name}
                </div>
                <h4 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-wg-honorable transition-colors">{stats.mostPopular.title}</h4>
                <div className="flex gap-2">
                   {stats.mostPopular.tags.slice(0,3).map(t => (
                     <span key={t} className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded uppercase">{t}</span>
                   ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-slate-400 text-sm">No data available.</p>
          )}
        </div>

        {/* Quick Actions / Recent */}
        <div className="bg-wg-honorable rounded-3xl p-8 shadow-xl shadow-wg-honorable/20 text-white relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
          <h3 className="text-lg font-extrabold mb-4 relative z-10">Brand Hub Status</h3>
          <p className="text-wg-sky text-sm font-medium mb-6 max-w-sm relative z-10 leading-relaxed">
            All systems are operational. The library contains {stats.totalAssets} assets across {stats.totalBrands} entities. 
            Keep your brand identity consistent by using the latest approved assets.
          </p>
          <div className="flex gap-3 relative z-10">
            <div className="px-4 py-2 bg-white/10 rounded-lg backdrop-blur text-xs font-bold border border-white/20">
              Last Updated: {new Date().toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

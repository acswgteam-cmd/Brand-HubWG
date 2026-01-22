
import React, { useMemo } from 'react';
import { Asset, Brand, AssetType } from '../types';
import { getThumbnailUrl } from '../services/assetService';

interface AboutProps {
  assets: Asset[];
  brands: Brand[];
  assetTypes: AssetType[];
  onNavigateToAsset: (asset: Asset) => void;
}

const About: React.FC<AboutProps> = ({ assets, brands, assetTypes, onNavigateToAsset }) => {
  const stats = useMemo(() => {
    const totalAssets = assets.length;
    const totalBrands = brands.length;
    const totalDownloads = assets.reduce((acc, curr) => acc + (curr.downloadCount || 0), 0);
    
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
      <div className="flex items-center gap-3 mb-6">
         <h2 className="text-2xl font-extrabold text-slate-900">About Brand Hub</h2>
         <div className="h-px bg-slate-200 flex-1"></div>
      </div>

      {/* Minimalist Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        
        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3 hover:border-wg-honorable/30 transition-colors">
          <div className="w-10 h-10 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center shrink-0">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          </div>
          <div>
            <div className="text-lg font-black text-slate-900 leading-none">{stats.totalAssets}</div>
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Assets</div>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3 hover:border-wg-honorable/30 transition-colors">
          <div className="w-10 h-10 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center shrink-0">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
          </div>
          <div>
            <div className="text-lg font-black text-slate-900 leading-none">{stats.totalBrands}</div>
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Entities</div>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3 hover:border-wg-honorable/30 transition-colors">
          <div className="w-10 h-10 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center shrink-0">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
          </div>
          <div>
            <div className="text-lg font-black text-slate-900 leading-none">{stats.totalDownloads.toLocaleString()}</div>
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Downloads</div>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3 hover:border-wg-honorable/30 transition-colors">
          <div className="w-10 h-10 rounded-lg bg-slate-50 text-wg-honorable flex items-center justify-center shrink-0">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div>
            <div className="text-lg font-black text-slate-900 leading-none">{stats.newFilesCount}</div>
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">New This Week</div>
          </div>
        </div>

      </div>

      {/* Content Area for About Brand (Currently holds legacy dashboard widgets, ready to be replaced) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 opacity-50 hover:opacity-100 transition-opacity">
        {/* Most Popular */}
        <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
          <h3 className="text-lg font-extrabold text-slate-900 mb-6 flex items-center gap-2">
            <span className="text-xl">🔥</span> Trending Asset
          </h3>
          {stats.mostPopular && stats.mostPopular.downloadCount && stats.mostPopular.downloadCount > 0 ? (
            <div className="flex items-start gap-6 group cursor-pointer" onClick={() => onNavigateToAsset(stats.mostPopular)}>
              <div className="w-20 h-20 bg-slate-100 rounded-xl overflow-hidden shrink-0 border border-slate-200">
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
                <h4 className="text-sm font-bold text-slate-900 mb-2 group-hover:text-wg-honorable transition-colors line-clamp-1">{stats.mostPopular.title}</h4>
                <div className="text-xs text-slate-400 font-bold">
                  {stats.mostPopular.downloadCount} Downloads
                </div>
              </div>
            </div>
          ) : (
            <p className="text-slate-400 text-sm">No significant download activity yet.</p>
          )}
        </div>

        {/* System Status */}
        <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 text-slate-500 relative overflow-hidden">
           <h3 className="text-lg font-extrabold mb-2 text-slate-900">System Status</h3>
           <p className="text-xs font-medium max-w-sm leading-relaxed">
             Operational. {stats.totalAssets} assets active.
           </p>
        </div>
      </div>
    </div>
  );
};

export default About;

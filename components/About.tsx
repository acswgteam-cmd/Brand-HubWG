
import React, { useMemo, useState, useEffect } from 'react';
import { Asset, Brand, AssetType, AboutContent } from '../types';
import { fetchAboutContent, saveAboutContent } from '../services/assetService';

interface AboutProps {
  assets: Asset[];
  brands: Brand[];
  assetTypes: AssetType[];
  onNavigateToAsset: (asset: Asset) => void;
  isAdmin: boolean;
}

const About: React.FC<AboutProps> = ({ assets, brands, assetTypes, onNavigateToAsset, isAdmin }) => {
  const [content, setContent] = useState<AboutContent | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Edit buffers
  const [editData, setEditData] = useState<AboutContent | null>(null);
  const [editServicesString, setEditServicesString] = useState('');
  const [editPrinciplesString, setEditPrinciplesString] = useState('');

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    const data = await fetchAboutContent();
    setContent(data);
  };

  const handleEditClick = () => {
    if (!content) return;
    setEditData({ ...content });
    setEditServicesString(content.services.join(', '));
    setEditPrinciplesString(content.principles.join('\n'));
    setIsEditing(true);
  };

  const handleSaveClick = async () => {
    if (!editData) return;

    const newContent: AboutContent = {
      ...editData,
      principles: editPrinciplesString.split('\n').filter(line => line.trim() !== ''),
      services: editServicesString.split(',').map(s => s.trim()).filter(s => s !== '')
    };
    
    await saveAboutContent(newContent);
    setContent(newContent);
    setIsEditing(false);
  };

  const stats = useMemo(() => {
    const totalAssets = assets.length;
    const totalBrands = brands.length;
    const totalDownloads = assets.reduce((acc, curr) => acc + (curr.downloadCount || 0), 0);
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const newFilesCount = assets.filter(a => new Date(a.createdAt) > oneWeekAgo).length;
    return { totalAssets, totalBrands, totalDownloads, newFilesCount };
  }, [assets, brands]);

  if (!content) return <div className="p-10 text-center text-slate-400">Loading information...</div>;

  return (
    <div className="p-8 lg:p-12 animate-fade-in-up pb-24 max-w-6xl mx-auto">
      
      {/* Header Area */}
      <div className="flex items-center justify-between mb-12">
         <div className="bg-white border border-slate-200 px-6 py-3 rounded-full flex items-center gap-4">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">About Brand Hub</h2>
            <div className="w-px h-6 bg-slate-300"></div>
            <span className="text-xs font-bold text-slate-500">Overview & Guidelines</span>
         </div>
         
         {isAdmin && (
           <div className="bg-white border border-slate-200 p-1.5 rounded-lg">
             {isEditing ? (
               <div className="flex gap-2">
                 <button onClick={() => setIsEditing(false)} className="px-5 py-2.5 bg-slate-100 text-slate-600 font-bold text-xs rounded-lg hover:bg-slate-200 transition-colors">Cancel</button>
                 <button onClick={handleSaveClick} className="px-5 py-2.5 bg-wg-honorable text-white font-bold text-xs rounded-lg hover:bg-wg-royal transition-colors shadow-lg shadow-wg-honorable/20">Save Changes</button>
               </div>
             ) : (
               <button onClick={handleEditClick} className="flex items-center gap-2 px-5 py-2.5 hover:bg-slate-50 text-slate-500 font-bold text-xs rounded-lg transition-colors">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                 Edit Page
               </button>
             )}
           </div>
         )}
      </div>

      {/* Stats Row */}
      <div className="bg-white border border-slate-200 rounded-xl p-8 grid grid-cols-2 md:grid-cols-4 gap-8 mb-16 relative overflow-hidden">
        {/* Decorative Blur */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-wg-sky/30 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

        <div className="relative z-10">
          <div className="text-4xl font-black text-slate-900 mb-2">{stats.totalAssets}</div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Assets</div>
        </div>
        <div className="relative z-10 border-l border-slate-100 pl-8">
          <div className="text-4xl font-black text-slate-900 mb-2">{stats.totalBrands}</div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Entities</div>
        </div>
        <div className="relative z-10 border-l border-slate-100 pl-8">
          <div className="text-4xl font-black text-slate-900 mb-2">{stats.totalDownloads}</div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Downloads</div>
        </div>
        <div className="relative z-10 border-l border-slate-100 pl-8">
          <div className="text-4xl font-black text-wg-honorable mb-2">{stats.newFilesCount}</div>
          <div className="text-[10px] font-bold text-wg-honorable/60 uppercase tracking-widest">New This Week</div>
        </div>
      </div>

      {/* Content Sections */}
      <div className="max-w-4xl mx-auto space-y-20">
        
        {/* Section 1: About */}
        <section className="relative">
           {isEditing && editData ? (
             <div className="space-y-4 p-6 bg-white rounded-xl border border-slate-200">
                <input 
                  value={editData.titleAbout} 
                  onChange={e => setEditData({...editData, titleAbout: e.target.value})}
                  className="w-full bg-transparent text-xs font-black text-slate-400 uppercase tracking-widest outline-none border-b border-slate-300 focus:border-wg-honorable pb-2"
                  placeholder="SECTION TITLE"
                />
                <textarea 
                  value={editData.aboutText}
                  onChange={(e) => setEditData({...editData, aboutText: e.target.value})}
                  className="w-full h-48 bg-transparent outline-none font-medium text-slate-700 leading-relaxed text-xl resize-none"
                />
             </div>
           ) : (
             <>
               <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">{content.titleAbout}</h3>
               <p className="text-xl lg:text-3xl font-medium text-slate-900 leading-relaxed whitespace-pre-wrap">
                 {content.aboutText}
               </p>
             </>
           )}
        </section>

        {/* Section 2: Operating Principles */}
        <section>
           {isEditing && editData ? (
             <div className="space-y-4 p-6 bg-white rounded-xl border border-slate-200">
                <input 
                  value={editData.titlePrinciples} 
                  onChange={e => setEditData({...editData, titlePrinciples: e.target.value})}
                  className="w-full bg-transparent text-xs font-black text-slate-400 uppercase tracking-widest outline-none border-b border-slate-300 focus:border-wg-honorable pb-2"
                  placeholder="SECTION TITLE"
                />
                <textarea 
                  value={editPrinciplesString}
                  onChange={(e) => setEditPrinciplesString(e.target.value)}
                  className="w-full h-48 bg-transparent outline-none font-medium text-slate-700 leading-relaxed text-base resize-none"
                  placeholder="One item per line"
                />
             </div>
           ) : (
             <>
               <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-8">{content.titlePrinciples}</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {content.principles.map((principle, i) => (
                   <div key={i} className="bg-white border border-slate-200 p-6 rounded-xl flex items-start gap-4 group hover:shadow-md transition-all">
                     <span className="mt-1 w-2 h-2 bg-wg-honorable rounded-full shrink-0 group-hover:scale-150 transition-transform"></span>
                     <span className="text-lg text-slate-700 font-bold leading-relaxed">{principle}</span>
                   </div>
                 ))}
               </div>
             </>
           )}
        </section>

        {/* Section 3: Diversity */}
        <section>
           {isEditing && editData ? (
             <div className="space-y-4 p-6 bg-white rounded-xl border border-slate-200">
                <input 
                  value={editData.titleDiversity} 
                  onChange={e => setEditData({...editData, titleDiversity: e.target.value})}
                  className="w-full bg-transparent text-xs font-black text-slate-400 uppercase tracking-widest outline-none border-b border-slate-300 focus:border-wg-honorable pb-2"
                  placeholder="SECTION TITLE"
                />
                <textarea 
                  value={editData.diversityText}
                  onChange={(e) => setEditData({...editData, diversityText: e.target.value})}
                  className="w-full h-40 bg-transparent outline-none font-medium text-slate-700 leading-relaxed text-lg resize-none"
                />
             </div>
           ) : (
             <div className="bg-white border border-slate-200 p-10 rounded-xl relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-wg-honorable to-wg-ice"></div>
               <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">{content.titleDiversity}</h3>
               <p className="text-xl text-slate-800 leading-relaxed font-medium">
                 {content.diversityText}
               </p>
             </div>
           )}
        </section>

        {/* Section 4: Services */}
        <section>
           {isEditing && editData ? (
             <div className="space-y-4 p-6 bg-white rounded-xl border border-slate-200">
                <input 
                  value={editData.titleServices} 
                  onChange={e => setEditData({...editData, titleServices: e.target.value})}
                  className="w-full bg-transparent text-xs font-black text-slate-400 uppercase tracking-widest outline-none border-b border-slate-300 focus:border-wg-honorable pb-2"
                  placeholder="SECTION TITLE"
                />
                <textarea 
                  value={editServicesString}
                  onChange={(e) => setEditServicesString(e.target.value)}
                  className="w-full h-32 bg-transparent outline-none font-medium text-slate-700 text-base resize-none"
                  placeholder="Comma separated"
                />
             </div>
           ) : (
             <>
               <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-8">{content.titleServices}</h3>
               <div className="flex flex-wrap gap-3">
                 {content.services.map((service, i) => (
                   <span key={i} className="px-6 py-3 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-full hover:border-wg-honorable hover:text-wg-honorable transition-all cursor-default">
                     {service}
                   </span>
                 ))}
               </div>
             </>
           )}
        </section>

      </div>
    </div>
  );
};

export default About;

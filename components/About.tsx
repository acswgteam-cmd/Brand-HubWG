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

  if (!content) return <div className="p-10 text-center text-coinbase-muted text-[15px]">Loading...</div>;

  return (
    <div className="p-10 lg:p-16 pb-24 max-w-[1000px] mx-auto">
      
      {/* Header Area */}
      <div className="flex items-center justify-between mb-16">
         <div className="flex items-center gap-4">
            <h2 className="text-[24px] font-medium tracking-[-0.01em] text-coinbase-ink">About BrandHub</h2>
            <div className="w-[1px] h-6 bg-coinbase-hairline"></div>
            <span className="text-[16px] font-medium text-coinbase-muted">Overview & Guidelines</span>
         </div>
         
         {isAdmin && (
           <div className="flex items-center">
             {isEditing ? (
               <div className="flex gap-3">
                 <button onClick={() => setIsEditing(false)} className="px-6 py-2.5 bg-coinbase-surface-strong text-coinbase-ink font-semibold text-[15px] rounded-pill hover:bg-coinbase-hairline transition-colors">Cancel</button>
                 <button onClick={handleSaveClick} className="px-6 py-2.5 bg-coinbase-primary text-white font-semibold text-[15px] rounded-pill hover:bg-coinbase-primary-active transition-colors">Save Changes</button>
               </div>
             ) : (
               <button onClick={handleEditClick} className="flex items-center gap-2 px-6 py-2.5 bg-white border border-coinbase-hairline hover:bg-coinbase-surface-soft text-coinbase-ink font-semibold text-[15px] rounded-pill transition-colors shadow-soft">
                 <svg className="w-4 h-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                 Edit Page
               </button>
             )}
           </div>
         )}
      </div>

      {/* Stats Row */}
      <div className="bg-white border border-coinbase-hairline rounded-xl p-10 grid grid-cols-2 md:grid-cols-4 gap-10 mb-24 relative overflow-hidden shadow-soft">
        <div className="relative z-10">
          <div className="text-[40px] font-medium tracking-[-0.02em] text-coinbase-ink mb-2 tabular-nums">{stats.totalAssets}</div>
          <div className="text-[14px] font-semibold text-coinbase-muted uppercase tracking-wide">Total Assets</div>
        </div>
        <div className="relative z-10 md:border-l border-coinbase-hairline md:pl-10">
          <div className="text-[40px] font-medium tracking-[-0.02em] text-coinbase-ink mb-2 tabular-nums">{stats.totalBrands}</div>
          <div className="text-[14px] font-semibold text-coinbase-muted uppercase tracking-wide">Entities</div>
        </div>
        <div className="relative z-10 md:border-l border-coinbase-hairline md:pl-10">
          <div className="text-[40px] font-medium tracking-[-0.02em] text-coinbase-ink mb-2 tabular-nums">{stats.totalDownloads}</div>
          <div className="text-[14px] font-semibold text-coinbase-muted uppercase tracking-wide">Downloads</div>
        </div>
        <div className="relative z-10 md:border-l border-coinbase-hairline md:pl-10">
          <div className="text-[40px] font-medium tracking-[-0.02em] text-coinbase-primary mb-2 tabular-nums">{stats.newFilesCount}</div>
          <div className="text-[14px] font-semibold text-coinbase-muted uppercase tracking-wide">New This Week</div>
        </div>
      </div>

      {/* Content Sections */}
      <div className="space-y-24">
        
        {/* Section 1: About */}
        <section className="relative">
           {isEditing && editData ? (
             <div className="space-y-6 p-8 bg-coinbase-surface-soft rounded-xl border border-coinbase-hairline">
                <input 
                  value={editData.titleAbout} 
                  onChange={e => setEditData({...editData, titleAbout: e.target.value})}
                  className="w-full bg-transparent text-[16px] font-semibold text-coinbase-muted uppercase tracking-wide outline-none border-b border-coinbase-hairline focus:border-coinbase-primary pb-3 transition-colors"
                  placeholder="SECTION TITLE"
                />
                <textarea 
                  value={editData.aboutText}
                  onChange={(e) => setEditData({...editData, aboutText: e.target.value})}
                  className="w-full h-48 bg-transparent outline-none font-normal text-coinbase-ink leading-relaxed text-[24px] resize-none"
                />
             </div>
           ) : (
             <>
               <h3 className="text-[14px] font-semibold text-coinbase-muted uppercase tracking-wide mb-8">{content.titleAbout}</h3>
               <p className="text-[32px] lg:text-[40px] font-normal tracking-[-0.01em] text-coinbase-ink leading-[1.2] whitespace-pre-wrap [text-wrap:balance]">
                 {content.aboutText}
               </p>
             </>
           )}
        </section>

        {/* Section 2: Operating Principles */}
        <section>
           {isEditing && editData ? (
             <div className="space-y-6 p-8 bg-coinbase-surface-soft rounded-xl border border-coinbase-hairline">
                <input 
                  value={editData.titlePrinciples} 
                  onChange={e => setEditData({...editData, titlePrinciples: e.target.value})}
                  className="w-full bg-transparent text-[16px] font-semibold text-coinbase-muted uppercase tracking-wide outline-none border-b border-coinbase-hairline focus:border-coinbase-primary pb-3 transition-colors"
                  placeholder="SECTION TITLE"
                />
                <textarea 
                  value={editPrinciplesString}
                  onChange={(e) => setEditPrinciplesString(e.target.value)}
                  className="w-full h-48 bg-transparent outline-none font-normal text-coinbase-ink leading-relaxed text-[18px] resize-none"
                  placeholder="One item per line"
                />
             </div>
           ) : (
             <>
               <h3 className="text-[14px] font-semibold text-coinbase-muted uppercase tracking-wide mb-8">{content.titlePrinciples}</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {content.principles.map((principle, i) => (
                   <div key={i} className="bg-white border border-coinbase-hairline p-8 rounded-xl flex items-start gap-5 shadow-soft">
                     <span className="mt-2 w-2 h-2 bg-coinbase-primary rounded-full shrink-0"></span>
                     <span className="text-[18px] text-coinbase-ink font-normal leading-relaxed">{principle}</span>
                   </div>
                 ))}
               </div>
             </>
           )}
        </section>

        {/* Section 3: Diversity */}
        <section>
           {isEditing && editData ? (
             <div className="space-y-6 p-8 bg-coinbase-surface-soft rounded-xl border border-coinbase-hairline">
                <input 
                  value={editData.titleDiversity} 
                  onChange={e => setEditData({...editData, titleDiversity: e.target.value})}
                  className="w-full bg-transparent text-[16px] font-semibold text-coinbase-muted uppercase tracking-wide outline-none border-b border-coinbase-hairline focus:border-coinbase-primary pb-3 transition-colors"
                  placeholder="SECTION TITLE"
                />
                <textarea 
                  value={editData.diversityText}
                  onChange={(e) => setEditData({...editData, diversityText: e.target.value})}
                  className="w-full h-40 bg-transparent outline-none font-normal text-coinbase-ink leading-relaxed text-[20px] resize-none"
                />
             </div>
           ) : (
             <div className="bg-white border border-coinbase-hairline p-12 rounded-xl relative overflow-hidden shadow-soft">
               <div className="absolute top-0 left-0 w-full h-1.5 bg-coinbase-primary"></div>
               <h3 className="text-[14px] font-semibold text-coinbase-muted uppercase tracking-wide mb-8">{content.titleDiversity}</h3>
               <p className="text-[24px] text-coinbase-ink leading-[1.4] font-normal tracking-[-0.01em]">
                 {content.diversityText}
               </p>
             </div>
           )}
        </section>

        {/* Section 4: Services */}
        <section>
           {isEditing && editData ? (
             <div className="space-y-6 p-8 bg-coinbase-surface-soft rounded-xl border border-coinbase-hairline">
                <input 
                  value={editData.titleServices} 
                  onChange={e => setEditData({...editData, titleServices: e.target.value})}
                  className="w-full bg-transparent text-[16px] font-semibold text-coinbase-muted uppercase tracking-wide outline-none border-b border-coinbase-hairline focus:border-coinbase-primary pb-3 transition-colors"
                  placeholder="SECTION TITLE"
                />
                <textarea 
                  value={editServicesString}
                  onChange={(e) => setEditServicesString(e.target.value)}
                  className="w-full h-32 bg-transparent outline-none font-normal text-coinbase-ink text-[18px] resize-none"
                  placeholder="Comma separated"
                />
             </div>
           ) : (
             <>
               <h3 className="text-[14px] font-semibold text-coinbase-muted uppercase tracking-wide mb-8">{content.titleServices}</h3>
               <div className="flex flex-wrap gap-3">
                 {content.services.map((service, i) => (
                   <span key={i} className="px-5 py-2.5 bg-coinbase-surface-strong border border-coinbase-hairline text-coinbase-ink font-semibold text-[15px] rounded-pill cursor-default">
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

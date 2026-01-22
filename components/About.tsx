
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
  const [editAbout, setEditAbout] = useState('');
  const [editPrinciples, setEditPrinciples] = useState('');
  const [editDiversity, setEditDiversity] = useState('');
  const [editServices, setEditServices] = useState('');

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    const data = await fetchAboutContent();
    setContent(data);
  };

  const handleEditClick = () => {
    if (!content) return;
    setEditAbout(content.aboutText);
    setEditPrinciples(content.principles.join('\n'));
    setEditDiversity(content.diversityText);
    setEditServices(content.services.join(', '));
    setIsEditing(true);
  };

  const handleSaveClick = async () => {
    const newContent: AboutContent = {
      aboutText: editAbout,
      principles: editPrinciples.split('\n').filter(line => line.trim() !== ''),
      diversityText: editDiversity,
      services: editServices.split(',').map(s => s.trim()).filter(s => s !== '')
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
    <div className="p-6 lg:p-10 animate-fade-in-up pb-20 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
         <div className="flex items-center gap-3">
            <h2 className="text-2xl font-extrabold text-slate-900">About Brand Hub</h2>
            <div className="h-px bg-slate-200 w-12 md:w-24"></div>
         </div>
         {isAdmin && (
           <div>
             {isEditing ? (
               <div className="flex gap-2">
                 <button onClick={() => setIsEditing(false)} className="px-4 py-2 bg-slate-200 text-slate-600 font-bold text-xs rounded-lg hover:bg-slate-300 transition-colors">Cancel</button>
                 <button onClick={handleSaveClick} className="px-4 py-2 bg-wg-honorable text-white font-bold text-xs rounded-lg hover:bg-wg-royal transition-colors shadow-lg shadow-wg-honorable/20">Save Changes</button>
               </div>
             ) : (
               <button onClick={handleEditClick} className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-500 font-bold text-xs rounded-lg hover:bg-slate-50 transition-colors">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                 Edit Content
               </button>
             )}
           </div>
         )}
      </div>

      {/* Minimalist Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xl font-black text-slate-900 leading-none">{stats.totalAssets}</div>
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Assets</div>
          </div>
          <div className="text-slate-300"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xl font-black text-slate-900 leading-none">{stats.totalBrands}</div>
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Entities</div>
          </div>
          <div className="text-slate-300"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg></div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xl font-black text-slate-900 leading-none">{stats.totalDownloads}</div>
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Downloads</div>
          </div>
          <div className="text-slate-300"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg></div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xl font-black text-slate-900 leading-none">{stats.newFilesCount}</div>
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">New Files</div>
          </div>
          <div className="text-wg-honorable"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
        </div>
      </div>

      {/* Brand Information Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Column (About & Services) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Section 1: About */}
          <section className="bg-white rounded-[2rem] p-8 lg:p-10 border border-slate-100 shadow-sm">
             <div className="mb-6">
                <span className="text-[10px] font-black text-wg-honorable uppercase tracking-widest px-3 py-1 bg-wg-honorable/5 rounded-lg">Who We Are</span>
             </div>
             {isEditing ? (
               <textarea 
                 value={editAbout}
                 onChange={(e) => setEditAbout(e.target.value)}
                 className="w-full h-48 p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-slate-700 leading-relaxed text-sm resize-none focus:ring-2 focus:ring-wg-honorable/20"
               />
             ) : (
               <p className="text-xl lg:text-2xl font-bold text-slate-900 leading-relaxed whitespace-pre-wrap">
                 {content.aboutText}
               </p>
             )}
          </section>

          {/* Section 4: Services */}
          <section className="bg-wg-dark rounded-[2rem] p-8 lg:p-10 border border-slate-200/50">
             <h3 className="text-lg font-extrabold text-slate-900 mb-6">Our Services</h3>
             {isEditing ? (
               <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-2">Comma separated list</label>
                  <textarea 
                    value={editServices}
                    onChange={(e) => setEditServices(e.target.value)}
                    className="w-full h-32 p-4 bg-white border border-slate-200 rounded-xl outline-none font-medium text-slate-700 text-sm resize-none focus:ring-2 focus:ring-wg-honorable/20"
                  />
               </div>
             ) : (
               <div className="flex flex-wrap gap-3">
                 {content.services.map((service, i) => (
                   <span key={i} className="px-5 py-3 bg-white text-slate-700 font-bold text-sm rounded-xl border border-slate-200 shadow-sm hover:border-wg-honorable hover:text-wg-honorable transition-colors cursor-default">
                     {service}
                   </span>
                 ))}
               </div>
             )}
          </section>

        </div>

        {/* Sidebar Column (Principles & Diversity) */}
        <div className="space-y-8">
          
          {/* Section 2: Operating Principles */}
          <section className="bg-wg-honorable text-white rounded-[2rem] p-8 lg:p-10 shadow-xl shadow-wg-honorable/20 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
             <h3 className="text-lg font-extrabold mb-6 relative z-10">Operating Principles</h3>
             
             {isEditing ? (
               <textarea 
                 value={editPrinciples}
                 onChange={(e) => setEditPrinciples(e.target.value)}
                 className="w-full h-48 p-4 bg-white/10 border border-white/20 rounded-xl outline-none font-medium text-white text-sm resize-none focus:bg-white/20"
                 placeholder="One principle per line"
               />
             ) : (
               <ul className="space-y-4 relative z-10">
                 {content.principles.map((principle, i) => (
                   <li key={i} className="flex gap-3 items-start">
                     <span className="mt-1 w-1.5 h-1.5 bg-wg-sky rounded-full shrink-0"></span>
                     <span className="text-sm font-medium leading-relaxed text-wg-sky">{principle}</span>
                   </li>
                 ))}
               </ul>
             )}
          </section>

          {/* Section 3: Diversity */}
          <section className="bg-white rounded-[2rem] p-8 lg:p-10 border border-slate-100 shadow-sm">
             <h3 className="text-lg font-extrabold text-slate-900 mb-4">Diversity & Inclusion</h3>
             {isEditing ? (
               <textarea 
                 value={editDiversity}
                 onChange={(e) => setEditDiversity(e.target.value)}
                 className="w-full h-40 p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-slate-700 leading-relaxed text-sm resize-none focus:ring-2 focus:ring-wg-honorable/20"
               />
             ) : (
               <p className="text-sm font-medium text-slate-500 leading-relaxed">
                 {content.diversityText}
               </p>
             )}
          </section>

        </div>

      </div>
    </div>
  );
};

export default About;

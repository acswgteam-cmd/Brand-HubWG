
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
    <div className="p-6 lg:p-10 animate-fade-in-up pb-20 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-10">
         <div className="flex items-center gap-3">
            <h2 className="text-2xl font-extrabold text-slate-900">About Brand Hub</h2>
            <div className="h-px bg-slate-200 w-12 md:w-24"></div>
         </div>
         {isAdmin && (
           <div>
             {isEditing ? (
               <div className="flex gap-2">
                 <button onClick={() => setIsEditing(false)} className="px-4 py-2 bg-slate-100 text-slate-600 font-bold text-xs rounded-lg hover:bg-slate-200 transition-colors">Cancel</button>
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

      {/* Stats Row - Simplified */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16 border-b border-slate-100 pb-10">
        <div className="px-4 border-l-2 border-slate-100">
          <div className="text-2xl font-black text-slate-900 leading-none">{stats.totalAssets}</div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Assets</div>
        </div>
        <div className="px-4 border-l-2 border-slate-100">
          <div className="text-2xl font-black text-slate-900 leading-none">{stats.totalBrands}</div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Entities</div>
        </div>
        <div className="px-4 border-l-2 border-slate-100">
          <div className="text-2xl font-black text-slate-900 leading-none">{stats.totalDownloads}</div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Downloads</div>
        </div>
        <div className="px-4 border-l-2 border-wg-honorable bg-wg-honorable/5 py-1">
          <div className="text-2xl font-black text-wg-honorable leading-none">{stats.newFilesCount}</div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">New Files</div>
        </div>
      </div>

      {/* Main Content - Single Column Layout */}
      <div className="max-w-3xl space-y-12">
        
        {/* Section 1: About */}
        <section>
           <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Who We Are</h3>
           {isEditing ? (
             <textarea 
               value={editAbout}
               onChange={(e) => setEditAbout(e.target.value)}
               className="w-full h-48 p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-slate-700 leading-relaxed text-lg resize-none focus:ring-2 focus:ring-wg-honorable/20"
             />
           ) : (
             <p className="text-xl lg:text-2xl font-medium text-slate-900 leading-relaxed whitespace-pre-wrap">
               {content.aboutText}
             </p>
           )}
        </section>

        <div className="h-px bg-slate-100 w-full"></div>

        {/* Section 2: Operating Principles */}
        <section>
           <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Operating Principles</h3>
           {isEditing ? (
             <textarea 
               value={editPrinciples}
               onChange={(e) => setEditPrinciples(e.target.value)}
               className="w-full h-48 p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-slate-700 leading-relaxed text-base resize-none focus:ring-2 focus:ring-wg-honorable/20"
               placeholder="One principle per line"
             />
           ) : (
             <ul className="space-y-4">
               {content.principles.map((principle, i) => (
                 <li key={i} className="flex gap-4 items-start group">
                   <span className="mt-2 w-1.5 h-1.5 bg-wg-honorable rounded-full shrink-0 group-hover:scale-150 transition-transform"></span>
                   <span className="text-lg text-slate-700 font-medium leading-relaxed">{principle}</span>
                 </li>
               ))}
             </ul>
           )}
        </section>

        <div className="h-px bg-slate-100 w-full"></div>

        {/* Section 3: Diversity */}
        <section>
           <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Diversity & Inclusion</h3>
           {isEditing ? (
             <textarea 
               value={editDiversity}
               onChange={(e) => setEditDiversity(e.target.value)}
               className="w-full h-40 p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-slate-700 leading-relaxed text-lg resize-none focus:ring-2 focus:ring-wg-honorable/20"
             />
           ) : (
             <p className="text-lg text-slate-600 leading-relaxed">
               {content.diversityText}
             </p>
           )}
        </section>

        <div className="h-px bg-slate-100 w-full"></div>

        {/* Section 4: Services */}
        <section>
           <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Our Services</h3>
           {isEditing ? (
             <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-2">Comma separated list</label>
                <textarea 
                  value={editServices}
                  onChange={(e) => setEditServices(e.target.value)}
                  className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none font-medium text-slate-700 text-base resize-none focus:ring-2 focus:ring-wg-honorable/20"
                />
             </div>
           ) : (
             <div className="flex flex-wrap gap-x-2 gap-y-3">
               {content.services.map((service, i) => (
                 <span key={i} className="px-4 py-2 bg-slate-50 text-slate-600 font-semibold text-sm rounded-lg border border-slate-200">
                   {service}
                 </span>
               ))}
             </div>
           )}
        </section>

      </div>
    </div>
  );
};

export default About;

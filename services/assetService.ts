
import { Asset, Brand, AssetType, AboutContent, AssetVersion, AssetRequest } from '../types';
import { supabase } from './supabaseClient';
import { DEFAULT_ABOUT_CONTENT } from '../constants';

const mapAsset = (dbAsset: any): Asset => ({
  id: dbAsset.id,
  title: dbAsset.title,
  brandId: dbAsset.brand_id,
  typeId: dbAsset.type_id,
  description: dbAsset.description,
  link: dbAsset.link,
  createdAt: dbAsset.created_at,
  updatedAt: dbAsset.updated_at,
  tags: dbAsset.tags || [],
  status: dbAsset.status,
  sortOrder: dbAsset.sort_order ?? 0,
  downloadCount: dbAsset.download_count ?? 0,
  version: dbAsset.version ?? 1,
  updateIntervalMonths: dbAsset.update_interval_months ?? null,
  nextUpdateDue: dbAsset.next_update_due ?? null,
});

const mapAssetVersion = (db: any): AssetVersion => ({
  id: db.id,
  assetId: db.asset_id,
  versionNumber: db.version_number,
  changelog: db.changelog,
  createdAt: db.created_at,
});

const mapAssetRequest = (db: any): AssetRequest => ({
  id: db.id,
  requesterName: db.requester_name,
  requesterEmail: db.requester_email,
  assetName: db.asset_name,
  description: db.description,
  brandId: db.brand_id,
  assetTypeId: db.asset_type_id,
  status: db.status,
  adminNotes: db.admin_notes,
  createdAt: db.created_at,
  updatedAt: db.updated_at,
});

const mapBrand = (dbBrand: any): Brand => ({
  id: dbBrand.id,
  name: dbBrand.name,
  type: dbBrand.type,
  description: dbBrand.description,
  logo: dbBrand.logo,
  sortOrder: dbBrand.sort_order ?? 0
});

const mapAssetType = (dbType: any): AssetType => ({
  id: dbType.id,
  name: dbType.name,
  icon: dbType.icon,
  sortOrder: dbType.sort_order ?? 0
});

/**
 * Robust fetcher that falls back to default ordering if sort_order column is missing
 */
export const fetchAllData = async () => {
  // Helper to fetch and handle "missing column" errors
  const safeFetch = async (table: string) => {
    let query = supabase.from(table).select('*');
    
    // Attempt to order by sort_order
    const { data, error } = await query.order('sort_order', { ascending: true });
    
    // If column doesn't exist (error 42703), fetch without ordering
    if (error && error.code === '42703') {
      console.warn(`Column sort_order missing in ${table}, falling back to default order.`);
      const fallback = await supabase.from(table).select('*');
      if (fallback.error) throw fallback.error;
      return fallback.data;
    }
    
    if (error) throw error;
    return data;
  };

  try {
    const [brandsData, typesData, assetsData] = await Promise.all([
      safeFetch('brands'),
      safeFetch('asset_types'),
      safeFetch('assets')
    ]);

    return {
      brands: (brandsData || []).map(mapBrand),
      assetTypes: (typesData || []).map(mapAssetType),
      assets: (assetsData || []).map(mapAsset)
    };
  } catch (err) {
    console.error("Data fetch failed", err);
    throw err;
  }
};

// --- About Content Management ---

export const fetchAboutContent = async (): Promise<AboutContent> => {
  // In a real scenario, this would fetch from a 'site_content' table.
  // For this demo, we check localStorage first, then fallback to CONSTANT.
  const stored = localStorage.getItem('wg_about_content');
  if (stored) {
    return JSON.parse(stored);
  }
  return DEFAULT_ABOUT_CONTENT;
};

export const saveAboutContent = async (content: AboutContent): Promise<void> => {
  // Simulate saving to DB by saving to localStorage
  localStorage.setItem('wg_about_content', JSON.stringify(content));
  
  // Optional: Try to save to Supabase if table exists (Mock implementation)
  // const { error } = await supabase.from('site_content').upsert({ id: 'about_page', content });
};

// --- CRUD Operations ---

export const upsertAsset = async (asset: Partial<Asset>) => {
  const payload: any = {
    id: asset.id,
    title: asset.title,
    brand_id: asset.brandId,
    type_id: asset.typeId,
    description: asset.description,
    link: asset.link,
    tags: asset.tags,
    status: asset.status,
    updated_at: new Date().toISOString()
  };

  // Only include sort_order if it's explicitly provided
  if (asset.sortOrder !== undefined) {
    payload.sort_order = asset.sortOrder;
  }

  // Include version if provided
  if (asset.version !== undefined) {
    payload.version = asset.version;
  }

  // Include update schedule fields if provided
  if (asset.updateIntervalMonths !== undefined) {
    payload.update_interval_months = asset.updateIntervalMonths;
  }
  if (asset.nextUpdateDue !== undefined) {
    payload.next_update_due = asset.nextUpdateDue;
  }

  const { data, error } = await supabase
    .from('assets')
    .upsert(payload)
    .select()
    .single();

  if (error) throw error;
  return mapAsset(data);
};

export const upsertAssets = async (assets: Asset[]) => {
  const payloads = assets.map(a => ({
    id: a.id,
    title: a.title,
    brand_id: a.brandId,
    type_id: a.typeId,
    description: a.description,
    link: a.link,
    tags: a.tags,
    status: a.status,
    sort_order: a.sortOrder ?? 0,
    version: a.version ?? 1,
    updated_at: new Date().toISOString()
  }));

  const { data, error } = await supabase
    .from('assets')
    .upsert(payloads)
    .select();

  if (error) throw error;
  return (data || []).map(mapAsset);
};

export const deleteAsset = async (id: string) => {
  const { error } = await supabase.from('assets').delete().eq('id', id);
  if (error) throw error;
};

export const incrementDownloadCount = async (id: string) => {
  const { data } = await supabase.from('assets').select('download_count').eq('id', id).single();
  const current = data?.download_count || 0;
  
  const { error } = await supabase.from('assets').update({ 
    download_count: current + 1 
  }).eq('id', id);
  
  if (error) console.error("Failed to increment download count", error);
  return current + 1;
};

export const createBrand = async (brand: Omit<Brand, 'id'>) => {
  const { data, error } = await supabase.from('brands').insert({
    name: brand.name,
    type: brand.type,
    sort_order: brand.sortOrder ?? 0
  }).select().single();
  if (error) throw error;
  return mapBrand(data);
};

export const updateBrand = async (id: string, updates: Partial<Brand>) => {
  const payload: any = {
    name: updates.name,
    type: updates.type
  };
  if (updates.sortOrder !== undefined) payload.sort_order = updates.sortOrder;

  const { data, error } = await supabase.from('brands').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return mapBrand(data);
};

export const updateBrands = async (brands: Brand[]) => {
  const payloads = brands.map(b => ({
    id: b.id,
    name: b.name,
    type: b.type,
    sort_order: b.sortOrder ?? 0
  }));
  const { data, error } = await supabase.from('brands').upsert(payloads).select();
  if (error) throw error;
  return (data || []).map(mapBrand);
};

export const deleteBrand = async (id: string) => {
  const { error } = await supabase.from('brands').delete().eq('id', id);
  if (error) throw error;
};

export const createAssetType = async (type: Omit<AssetType, 'id'>) => {
  const { data, error } = await supabase.from('asset_types').insert({
    name: type.name,
    icon: type.icon,
    sort_order: type.sortOrder ?? 0
  }).select().single();
  if (error) throw error;
  return mapAssetType(data);
};

export const updateAssetType = async (id: string, updates: Partial<AssetType>) => {
  const payload: any = {
    name: updates.name,
    icon: updates.icon
  };
  if (updates.sortOrder !== undefined) payload.sort_order = updates.sortOrder;

  const { data, error } = await supabase.from('asset_types').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return mapAssetType(data);
};

export const updateAssetTypes = async (types: AssetType[]) => {
  const payloads = types.map(t => ({
    id: t.id,
    name: t.name,
    icon: t.icon,
    sort_order: t.sortOrder ?? 0
  }));
  const { data, error } = await supabase.from('asset_types').upsert(payloads).select();
  if (error) throw error;
  return (data || []).map(mapAssetType);
};

export const deleteAssetType = async (id: string) => {
  const { error } = await supabase.from('asset_types').delete().eq('id', id);
  if (error) throw error;
};

export const getPreviewLink = (url: string) => {
  if (!url) return '';
  if (url.includes('drive.google.com')) {
    const fileIdMatch = url.match(/\/d\/([^/]+)/) || url.match(/id=([^&]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      return `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`;
    }
  }
  return url;
};

export const getDownloadLink = (url: string) => {
  if (!url) return '';
  if (url.startsWith('data:')) return url;
  if (url.includes('drive.google.com')) {
    const fileIdMatch = url.match(/\/d\/([^/]+)/) || url.match(/id=([^&]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      return `https://drive.google.com/uc?export=download&id=${fileIdMatch[1]}`;
    }
  }
  return url;
};

export const getThumbnailUrl = (url: string) => {
  if (!url) return null;
  if (url.startsWith('data:image/')) return url;
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.match(/\.(jpeg|jpg|gif|png|webp|svg)$/)) return url;
  if (url.includes('drive.google.com')) {
    const fileIdMatch = url.match(/\/d\/([^/]+)/) || url.match(/id=([^&]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      return `https://drive.google.com/thumbnail?id=${fileIdMatch[1]}&sz=w800`;
    }
  }
  return null;
};

export const getFileType = (url: string) => {
  if (!url) return 'unknown';
  if (url.startsWith('data:')) {
    if (url.startsWith('data:image/')) return 'image';
    if (url.startsWith('data:video/')) return 'video';
    if (url.startsWith('data:application/pdf')) return 'pdf';
    return 'file';
  }
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.match(/\.(jpeg|jpg|gif|png|webp|svg)$/)) return 'image';
  if (lowerUrl.match(/\.(mp4|webm|ogg)$/)) return 'video';
  if (lowerUrl.match(/\.(pdf)$/)) return 'pdf';
  if (lowerUrl.match(/\.(cdr)$/)) return 'cdr'; // Added CDR support
  if (url.includes('drive.google.com')) return 'google-drive';
  return 'link';
};

// =========================================================================
// Asset Versions
// =========================================================================

export const fetchAssetVersions = async (assetId: string): Promise<AssetVersion[]> => {
  const { data, error } = await supabase
    .from('asset_versions')
    .select('*')
    .eq('asset_id', assetId)
    .order('version_number', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapAssetVersion);
};

export const createAssetVersion = async (assetId: string, versionNumber: number, changelog: string): Promise<AssetVersion> => {
  const { data, error } = await supabase
    .from('asset_versions')
    .insert({ asset_id: assetId, version_number: versionNumber, changelog })
    .select()
    .single();
  if (error) throw error;
  return mapAssetVersion(data);
};

// =========================================================================
// Asset Requests
// =========================================================================

export const fetchAssetRequests = async (): Promise<AssetRequest[]> => {
  const { data, error } = await supabase
    .from('asset_requests')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapAssetRequest);
};

export const createAssetRequest = async (req: {
  requesterName: string;
  requesterEmail?: string;
  assetName: string;
  description?: string;
  brandId?: string;
  assetTypeId?: string;
}): Promise<AssetRequest> => {
  const { data, error } = await supabase
    .from('asset_requests')
    .insert({
      requester_name: req.requesterName,
      requester_email: req.requesterEmail || null,
      asset_name: req.assetName,
      description: req.description || null,
      brand_id: req.brandId || null,
      asset_type_id: req.assetTypeId || null,
    })
    .select()
    .single();
  if (error) throw error;
  return mapAssetRequest(data);
};

export const updateAssetRequest = async (
  id: string,
  updates: { status?: AssetRequest['status']; adminNotes?: string }
): Promise<AssetRequest> => {
  const payload: any = { updated_at: new Date().toISOString() };
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.adminNotes !== undefined) payload.admin_notes = updates.adminNotes;

  const { data, error } = await supabase
    .from('asset_requests')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return mapAssetRequest(data);
};

export const deleteAssetRequest = async (id: string): Promise<void> => {
  const { error } = await supabase.from('asset_requests').delete().eq('id', id);
  if (error) throw error;
};

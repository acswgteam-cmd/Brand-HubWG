
import { Asset, Brand, AssetType } from '../types';
import { supabase } from './supabaseClient';

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
  sortOrder: dbAsset.sort_order ?? 0
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
    updated_at: new Date().toISOString()
  }));

  const { data, error } = await supabase
    .from('assets')
    .upsert(payloads)
    .select();

  if (error) throw error;
  return (data || []).map(mapAsset);
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
  if (url.includes('drive.google.com')) return 'google-drive';
  return 'link';
};

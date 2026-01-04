import { Asset, Brand, AssetType } from '../types';
import { supabase } from './supabaseClient';

// Helper to map Supabase database objects (snake_case) to Frontend Types (camelCase)
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
  status: dbAsset.status
});

const mapBrand = (dbBrand: any): Brand => ({
  id: dbBrand.id,
  name: dbBrand.name,
  type: dbBrand.type,
  description: dbBrand.description,
  logo: dbBrand.logo
});

const mapAssetType = (dbType: any): AssetType => ({
  id: dbType.id,
  name: dbType.name,
  icon: dbType.icon
});

export const fetchAllData = async () => {
  const [brandsRes, typesRes, assetsRes] = await Promise.all([
    supabase.from('brands').select('*').order('name'),
    supabase.from('asset_types').select('*').order('name'),
    supabase.from('assets').select('*').order('created_at', { ascending: false })
  ]);

  if (brandsRes.error) throw brandsRes.error;
  if (typesRes.error) throw typesRes.error;
  if (assetsRes.error) throw assetsRes.error;

  return {
    brands: (brandsRes.data || []).map(mapBrand),
    assetTypes: (typesRes.data || []).map(mapAssetType),
    assets: (assetsRes.data || []).map(mapAsset)
  };
};

export const upsertAsset = async (asset: Partial<Asset>) => {
  const payload = {
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

  const { data, error } = await supabase
    .from('assets')
    .upsert(payload)
    .select()
    .single();

  if (error) throw error;
  return mapAsset(data);
};

export const createBrand = async (brand: Omit<Brand, 'id'>) => {
  const { data, error } = await supabase.from('brands').insert(brand).select().single();
  if (error) throw error;
  return mapBrand(data);
};

export const updateBrand = async (id: string, updates: Partial<Brand>) => {
  const { data, error } = await supabase.from('brands').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return mapBrand(data);
};

export const deleteBrand = async (id: string) => {
  const { error } = await supabase.from('brands').delete().eq('id', id);
  if (error) throw error;
};

export const createAssetType = async (type: Omit<AssetType, 'id'>) => {
  const { data, error } = await supabase.from('asset_types').insert(type).select().single();
  if (error) throw error;
  return mapAssetType(data);
};

export const updateAssetType = async (id: string, updates: Partial<AssetType>) => {
  const { data, error } = await supabase.from('asset_types').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return mapAssetType(data);
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

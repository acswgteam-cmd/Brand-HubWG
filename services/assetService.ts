import { Asset, Brand, AssetType } from '../types';
import { supabase } from './supabaseClient';

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
    brands: brandsRes.data as Brand[],
    assetTypes: typesRes.data as AssetType[],
    assets: assetsRes.data as Asset[]
  };
};

export const upsertAsset = async (asset: Partial<Asset>) => {
  const { data, error } = await supabase
    .from('assets')
    .upsert({
      ...asset,
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  return data as Asset;
};

export const createBrand = async (brand: Omit<Brand, 'id'>) => {
  const { data, error } = await supabase.from('brands').insert(brand).select().single();
  if (error) throw error;
  return data as Brand;
};

export const updateBrand = async (id: string, updates: Partial<Brand>) => {
  const { data, error } = await supabase.from('brands').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data as Brand;
};

export const deleteBrand = async (id: string) => {
  const { error } = await supabase.from('brands').delete().eq('id', id);
  if (error) throw error;
};

export const createAssetType = async (type: Omit<AssetType, 'id'>) => {
  const { data, error } = await supabase.from('asset_types').insert(type).select().single();
  if (error) throw error;
  return data as AssetType;
};

export const updateAssetType = async (id: string, updates: Partial<AssetType>) => {
  const { data, error } = await supabase.from('asset_types').update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data as AssetType;
};

export const deleteAssetType = async (id: string) => {
  const { error } = await supabase.from('asset_types').delete().eq('id', id);
  if (error) throw error;
};

// Preview Helper Functions
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

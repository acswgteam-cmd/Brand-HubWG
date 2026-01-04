
import { Asset, Brand, AssetType, UserRole } from '../types';
import { INITIAL_ASSETS, INITIAL_BRANDS, INITIAL_ASSET_TYPES } from '../constants';

const STORAGE_KEY = 'brandhub_data';

interface StorageData {
  assets: Asset[];
  brands: Brand[];
  assetTypes: AssetType[];
}

export const loadData = (): StorageData => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse storage data', e);
    }
  }
  return {
    assets: INITIAL_ASSETS,
    brands: INITIAL_BRANDS,
    assetTypes: INITIAL_ASSET_TYPES
  };
};

export const saveData = (data: StorageData) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Storage limit reached. Clear some assets.', e);
    alert('Storage limit reached (browser local storage). Please remove some large uploaded files.');
  }
};

export const getPreviewLink = (url: string) => {
  if (!url) return '';
  
  // Google Drive Link Conversion
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

  // Handle local uploaded images (Data URL)
  if (url.startsWith('data:image/')) {
    return url;
  }

  // Handle direct images from URL
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.match(/\.(jpeg|jpg|gif|png|webp|svg)$/)) {
    return url;
  }

  // Handle Google Drive Thumbnails
  if (url.includes('drive.google.com')) {
    const fileIdMatch = url.match(/\/d\/([^/]+)/) || url.match(/id=([^&]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      return `https://drive.google.com/thumbnail?id=${fileIdMatch[1]}&sz=w800`;
    }
  }

  // Fallback for mock picsum images
  if (url.includes('picsum.photos')) {
    return url;
  }

  return null;
};

export const getFileType = (url: string) => {
  if (!url) return 'unknown';
  
  // Data URL detection
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

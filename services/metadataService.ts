import { AssetFileMetadata } from '../types';

// =========================================================================
// Format helpers
// =========================================================================

export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export const formatDuration = (seconds: number): string => {
  if (!seconds || isNaN(seconds)) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export const formatMimeType = (mimeType: string): string => {
  const map: Record<string, string> = {
    'image/jpeg': 'JPEG Image',
    'image/jpg': 'JPEG Image',
    'image/png': 'PNG Image',
    'image/gif': 'GIF Image',
    'image/webp': 'WebP Image',
    'image/svg+xml': 'SVG Vector',
    'video/mp4': 'MP4 Video',
    'video/webm': 'WebM Video',
    'video/ogg': 'OGG Video',
    'video/quicktime': 'QuickTime Video',
    'application/pdf': 'PDF Document',
    'application/postscript': 'PostScript',
    'image/vnd.adobe.photoshop': 'Photoshop',
    'application/illustrator': 'Illustrator',
    'application/zip': 'ZIP Archive',
  };
  return map[mimeType] || mimeType;
};

// =========================================================================
// Extract metadata from a browser File object (direct upload)
// =========================================================================

export const extractLocalFileMetadata = (file: File): Promise<AssetFileMetadata> => {
  return new Promise((resolve) => {
    const base: AssetFileMetadata = {
      size: file.size,
      mimeType: file.type,
      source: 'direct',
    };

    if (file.type.startsWith('image/')) {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ ...base, width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(base);
      };
      img.src = url;
    } else if (file.type.startsWith('video/') || file.type.startsWith('audio/')) {
      const media = document.createElement(file.type.startsWith('video/') ? 'video' : 'audio') as HTMLVideoElement;
      const url = URL.createObjectURL(file);
      media.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        const meta: AssetFileMetadata = {
          ...base,
          durationSeconds: media.duration,
        };
        if (file.type.startsWith('video/')) {
          meta.width = (media as HTMLVideoElement).videoWidth;
          meta.height = (media as HTMLVideoElement).videoHeight;
        }
        resolve(meta);
      };
      media.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(base);
      };
      media.src = url;
    } else {
      resolve(base);
    }
  });
};

// =========================================================================
// Extract Google Drive File ID from various URL formats
// =========================================================================

export const extractGoogleDriveFileId = (url: string): string | null => {
  if (!url) return null;
  if (!url.includes('drive.google.com') && !url.includes('docs.google.com')) return null;
  // If it's a folder URL, it shouldn't be parsed as a file ID
  if (url.includes('/folders/')) return null;
  const patterns = [
    /\/d\/([a-zA-Z0-9_-]+)/,          // /d/{fileId}
    /[?&]id=([a-zA-Z0-9_-]+)/,         // ?id={fileId}
    /\/file\/d\/([a-zA-Z0-9_-]+)/,      // /file/d/{fileId}
    /open\?id=([a-zA-Z0-9_-]+)/,        // open?id={fileId}
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
};

// =========================================================================
// Extract Google Drive Folder ID from folder URLs
// =========================================================================

export const extractGoogleDriveFolderId = (url: string): string | null => {
  if (!url || !url.includes('drive.google.com')) return null;
  const patterns = [
    /\/folders\/([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/,
  ];
  // Prioritize /folders/ pattern
  const foldersMatch = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (foldersMatch?.[1]) return foldersMatch[1];
  
  // Fallback to ?id= pattern if it's explicitly a folder structure
  if (url.includes('/folderview') || url.includes('/folders')) {
    const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idMatch?.[1]) return idMatch[1];
  }
  return null;
};

// =========================================================================
// Fetch metadata from Google Drive API v3
// Returns null if not configured or file is not accessible
// =========================================================================

export const fetchGoogleDriveMetadata = async (fileId: string): Promise<AssetFileMetadata | null> => {
  const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
  
  if (!apiKey) {
    // No API key configured — return a shell with source set
    return { source: 'google-drive' };
  }

  try {
    const fields = 'id,name,size,mimeType,imageMediaMetadata,videoMediaMetadata';
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?fields=${encodeURIComponent(fields)}&key=${apiKey}`;
    
    const res = await fetch(url);
    if (!res.ok) {
      console.warn('Google Drive API error:', res.status, res.statusText);
      return { source: 'google-drive' };
    }
    
    const data = await res.json();
    
    const meta: AssetFileMetadata = {
      source: 'google-drive',
      mimeType: data.mimeType,
      size: data.size ? parseInt(data.size) : undefined,
    };

    // Image metadata
    if (data.imageMediaMetadata) {
      meta.width = data.imageMediaMetadata.width;
      meta.height = data.imageMediaMetadata.height;
    }

    // Video metadata
    if (data.videoMediaMetadata) {
      meta.width = data.videoMediaMetadata.width;
      meta.height = data.videoMediaMetadata.height;
      meta.durationSeconds = data.videoMediaMetadata.durationMillis
        ? data.videoMediaMetadata.durationMillis / 1000
        : undefined;
    }

    return meta;
  } catch (err) {
    console.warn('Failed to fetch Google Drive metadata:', err);
    return { source: 'google-drive' };
  }
};

// =========================================================================
// Detect metadata from URL alone (no API, best-effort)
// =========================================================================

export const detectMetadataFromUrl = (url: string): AssetFileMetadata => {
  if (!url) return { source: 'unknown' };
  
  if (url.includes('drive.google.com')) {
    return { source: 'google-drive' };
  }
  
  const lowerUrl = url.toLowerCase();
  let mimeType: string | undefined;
  
  if (lowerUrl.match(/\.(jpeg|jpg)(\?|$)/)) mimeType = 'image/jpeg';
  else if (lowerUrl.match(/\.png(\?|$)/)) mimeType = 'image/png';
  else if (lowerUrl.match(/\.gif(\?|$)/)) mimeType = 'image/gif';
  else if (lowerUrl.match(/\.webp(\?|$)/)) mimeType = 'image/webp';
  else if (lowerUrl.match(/\.svg(\?|$)/)) mimeType = 'image/svg+xml';
  else if (lowerUrl.match(/\.mp4(\?|$)/)) mimeType = 'video/mp4';
  else if (lowerUrl.match(/\.webm(\?|$)/)) mimeType = 'video/webm';
  else if (lowerUrl.match(/\.pdf(\?|$)/)) mimeType = 'application/pdf';
  
  return { source: 'unknown', mimeType };
};


export type UserRole = 'ADMIN' | 'VIEWER';
export type BrandType = 'UNIT' | 'ENTITAS';

export type AssetRequestStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED';

export interface Brand {
  id: string;
  name: string;
  type: BrandType;
  description?: string;
  logo?: string;
  sortOrder?: number;
}

export interface AssetType {
  id: string;
  name: string;
  icon: string;
  sortOrder?: number;
}

export interface AssetFileMetadata {
  size?: number;            // bytes
  mimeType?: string;        // e.g. "image/png", "video/mp4"
  width?: number;           // pixels — for image/video
  height?: number;          // pixels — for image/video
  durationSeconds?: number; // for video/audio
  source: 'direct' | 'google-drive' | 'unknown';
}

export interface Asset {
  id: string;
  title: string;
  brandId: string;
  typeId: string;
  description?: string;
  link: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  status: 'PUBLISHED' | 'DRAFT';
  sortOrder?: number;
  downloadCount?: number;
  version?: number;
  updateIntervalMonths?: number | null;
  nextUpdateDue?: string | null;
  fileMetadata?: AssetFileMetadata | null;
}

export interface AssetVersion {
  id: string;
  assetId: string;
  versionNumber: number;
  changelog?: string;
  createdAt: string;
}

export interface AssetActivity {
  id: string;
  assetId: string;
  actionType: 'CREATE' | 'REUPLOAD' | 'VERSION_UPDATE' | 'UPDATE_INFO';
  description: string;
  details: Record<string, any>;
  createdAt: string;
}

export interface AssetRequest {
  id: string;
  requesterName: string;
  requesterEmail?: string;
  assetName: string;
  description?: string;
  brandId?: string;
  assetTypeId?: string;
  status: AssetRequestStatus;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AboutContent {
  // Content
  aboutText: string;
  principles: string[];
  diversityText: string;
  services: string[];
  
  // Editable Titles
  titleAbout: string;
  titlePrinciples: string;
  titleDiversity: string;
  titleServices: string;
}

export interface AppState {
  assets: Asset[];
  brands: Brand[];
  assetTypes: AssetType[];
  currentUser: {
    role: UserRole;
    name: string;
  };
}

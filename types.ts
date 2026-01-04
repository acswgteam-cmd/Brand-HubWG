export type UserRole = 'ADMIN' | 'VIEWER';
export type BrandType = 'UNIT' | 'ENTITAS';

export interface Brand {
  id: string;
  name: string;
  type: BrandType;
  description?: string;
  logo?: string;
}

export interface AssetType {
  id: string;
  name: string;
  icon: string;
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
  status: 'ACTIVE' | 'ARCHIVED';
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
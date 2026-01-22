
import { Brand, AssetType, Asset, AboutContent } from './types';

// Placeholder for Pegasus logo - circular blue theme
export const LOGO_URL = "https://api.dicebear.com/7.x/initials/svg?seed=WG&backgroundColor=1551A0&radius=50&fontFamily=Arial&bold=true";

export const DEFAULT_ABOUT_CONTENT: AboutContent = {
  aboutText: "We Are Experience Designers. Based in Bali and Yogyakarta, Indonesia, Werkudara Group creates full experiences across corporate events, travel programs, wellness retreats, training sessions, and creative content. We don’t just deliver services we think through the entire journey, from start to finish.\n\nWhat makes us different is how we approach every detail with intention, clarity, and meaningful impact.",
  principles: [
    "Purpose-driven in everything we do",
    "Rooted in local wisdom and culture",
    "Committed to sustainability and inclusion",
    "Supportive and thoughtful team from start to finish",
    "Personalized approach that goes beyond expectations"
  ],
  diversityText: "Diversity & Inclusion Are Who We Are. Our team comes from different backgrounds, stories, and abilities, and through this diversity, our creativity flows. It’s the spirit of inclusion in our workplace that empowers us to design experiences with empathy, meaning, and heart.",
  services: [
    "Event Management",
    "Travel Services",
    "Wellness Experiences",
    "Creative Solutions",
    "Corporate Training",
    "Retail Service",
    "Eco-Friendly Products"
  ]
};

export const INITIAL_BRANDS: Brand[] = [
  { id: 'b1', name: 'Werkudara Group', type: 'ENTITAS', description: 'Parent holding company.' },
  { id: 'b2', name: 'Takshaka', type: 'UNIT', description: 'Hospitality & Events' },
  { id: 'b3', name: 'Atibhagya', type: 'UNIT', description: 'Logistics & Services' },
  { id: 'b4', name: 'Creative', type: 'UNIT', description: 'Design & Media Production' },
  { id: 'b5', name: 'Training', type: 'UNIT', description: 'Corporate Training & HR' },
  { id: 'b6', name: 'Retail', type: 'UNIT', description: 'Consumer Goods & Retail' },
  { id: 'b7', name: 'Gooper', type: 'UNIT', description: 'Tech & Digital Solutions' },
];

export const INITIAL_ASSET_TYPES: AssetType[] = [
  { id: 't1', name: 'Logos', icon: '🎨' },
  { id: 't2', name: 'Supergraphics', icon: '🖼️' },
  { id: 't3', name: 'Design templates', icon: '📐' },
  { id: 't4', name: 'PowerPoint templates', icon: '📊' },
  { id: 't5', name: 'Videos', icon: '🎥' },
  { id: 't6', name: 'Company profiles', icon: '📖' },
  { id: 't7', name: 'Digital channels', icon: '🌐' },
];

export const INITIAL_ASSETS: Asset[] = [
  {
    id: 'a1',
    title: 'Main Logo 2024 - Vertical',
    brandId: 'b1',
    typeId: 't1',
    description: 'The primary vertical orientation logo for Werkudara Group.',
    link: 'https://picsum.photos/1200/800',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
    tags: ['logo', 'branding', 'official'],
    status: 'ACTIVE'
  },
  {
    id: 'a2',
    title: 'Takshaka Brand Guidelines PDF',
    brandId: 'b2',
    typeId: 't6',
    description: 'Detailed brand guidelines for Takshaka Hospitality.',
    link: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    createdAt: '2024-02-10T14:30:00Z',
    updatedAt: '2024-02-12T09:15:00Z',
    tags: ['guidelines', 'pdf', 'strategy'],
    status: 'ACTIVE'
  },
  {
    id: 'a3',
    title: 'Gooper Teaser Video',
    brandId: 'b7',
    typeId: 't5',
    description: 'Teaser video for the new Gooper app launch.',
    link: 'https://www.w3schools.com/html/mov_bbb.mp4',
    createdAt: '2024-03-01T16:45:00Z',
    updatedAt: '2024-03-01T16:45:00Z',
    tags: ['video', 'teaser', 'launch'],
    status: 'ACTIVE'
  }
];

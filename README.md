# Brand-Hub — Werkudara Group

A centralized Digital Asset Management (DAM) system designed for Werkudara Group entities. This application provides a streamlined interface for managing, previewing, and organizing brand assets across different corporate units.

## ✨ Features

- **Dynamic Categorization**: Group entities by "ENTITAS" atau "UNIT".
- **Asset Type Management**: Fully customizable categories (Logos, Videos, Templates, etc.) with emoji icons.
- **Smart Metadata**: Integrated with Google Gemini API to automatically suggest descriptions and tags for new assets.
- **Unified Preview**: In-app previews for images, videos, PDFs, and Google Drive links.
- **Admin Access**: Secure role-based access for uploading and managing brands.
- **Responsive Design**: High-fidelity UI built with Tailwind CSS and "Plus Jakarta Sans" typography.

## 🔑 Demo Credentials (Temporary)

Untuk mencoba fitur Admin:
- **Email**: `admin@werkudara.com`
- **Password**: `admin123`

## 🛠️ Tech Stack

- **Frontend**: React 19 (ES6+ Modules)
- **Styling**: Tailwind CSS
- **AI Integration**: Google Generative AI (Gemini 3 Flash)
- **Storage**: Browser LocalStorage
- **Deployment**: Vercel / GitHub Pages

## 🚀 Getting Started

1. **Clone the repository**
2. **Setup Environment**:
   Dapatkan API Key di [Google AI Studio](https://aistudio.google.com/) dan pasang sebagai environment variable:
   ```bash
   API_KEY=your_gemini_api_key_here
   ```
3. **Open `index.html`** via live server atau deploy langsung ke Vercel.

## 📂 Project Structure

- `App.tsx`: Main logic & State management.
- `components/`: Modular UI components (AssetGrid, Preview, AdminPanel, Login).
- `services/`: logic for LocalStorage & Gemini AI integration.
- `types.ts`: TypeScript interfaces for data consistency.

---

© 2024 Werkudara Group. All rights reserved.
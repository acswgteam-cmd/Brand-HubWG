import React, { useState, useEffect } from 'react';
import { Asset, AssetVersion } from '../types';
import * as service from '../services/assetService';

interface VersionHistoryPanelProps {
  asset: Asset;
  compact?: boolean; // compact = show only 3 items inline, no modal
  onClose?: () => void;
}

const VersionHistoryPanel: React.FC<VersionHistoryPanelProps> = ({ asset, compact = false, onClose }) => {
  const [versions, setVersions] = useState<AssetVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (asset?.id) {
      loadVersions();
    }
  }, [asset?.id]);

  const loadVersions = async () => {
    setLoading(true);
    try {
      const data = await service.fetchAssetVersions(asset.id);
      // If no versions exist in DB yet, synthesize from current asset version
      if (data.length === 0) {
        const synthetic: AssetVersion[] = [{
          id: 'synthetic-1',
          assetId: asset.id,
          versionNumber: asset.version ?? 1,
          changelog: asset.version && asset.version > 1 ? undefined : 'Versi awal aset ini diunggah.',
          createdAt: asset.createdAt,
        }];
        setVersions(synthetic);
      } else {
        setVersions(data);
      }
    } catch (e) {
      console.error('Failed to load versions', e);
      setVersions([]);
    } finally {
      setLoading(false);
    }
  };

  const displayedVersions = compact && !showAll ? versions.slice(0, 3) : versions;
  const currentVersion = versions[0]; // highest version (sorted desc)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-5 h-5 border-2 border-coinbase-surface-strong border-t-coinbase-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (compact) {
    // Inline compact view used inside AssetDetailsPanel
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[11px] font-bold text-coinbase-muted uppercase tracking-wider">Version History</h3>
          {versions.length > 3 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-[11px] font-semibold text-coinbase-primary hover:text-coinbase-primary-active transition-colors"
            >
              {showAll ? 'Tampilkan Sedikit' : `Lihat Semua (${versions.length})`}
            </button>
          )}
        </div>

        {versions.length === 0 ? (
          <p className="text-[13px] text-coinbase-muted italic">Belum ada riwayat versi.</p>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[15px] top-2 bottom-2 w-[2px] bg-coinbase-hairline" />

            <div className="space-y-4">
              {displayedVersions.map((v, i) => {
                const isCurrent = i === 0;
                return (
                  <div key={v.id} className="flex gap-4 relative">
                    {/* Icon node */}
                    <div className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center shrink-0 z-10 transition-all ${
                      isCurrent
                        ? 'bg-coinbase-primary border-coinbase-primary text-white'
                        : 'bg-white border-coinbase-hairline text-coinbase-muted'
                    }`}>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>

                    <div className="flex-1 min-w-0 pb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[14px] font-bold text-coinbase-ink">
                          Version {v.versionNumber}
                        </span>
                        {isCurrent && (
                          <span className="px-2 py-0.5 bg-coinbase-primary/10 text-coinbase-primary border border-coinbase-primary/20 rounded-full text-[10px] font-bold">
                            Versi Terkini
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] text-coinbase-muted mt-0.5">
                        {new Date(v.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric', month: 'long', year: 'numeric',
                        })}
                        {' • '}
                        {new Date(v.createdAt).toLocaleTimeString('id-ID', {
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                      {v.changelog && (
                        <p className="text-[13px] text-coinbase-body mt-1.5 leading-relaxed">
                          {v.changelog}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full-page / modal view
  return (
    <div className="h-full flex flex-col bg-coinbase-canvas">
      <div className="px-6 py-5 border-b border-coinbase-hairline flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-[16px] font-bold text-coinbase-ink">Version History</h2>
          <p className="text-[12px] text-coinbase-muted mt-0.5 truncate max-w-[240px]">{asset.title}</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-2 hover:bg-coinbase-surface-strong rounded-full transition-colors text-coinbase-muted hover:text-coinbase-ink">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 no-scrollbar">
        {versions.length === 0 ? (
          <div className="text-center py-12 text-coinbase-muted">
            <div className="text-5xl mb-3">📂</div>
            <p className="text-[14px] font-medium">Belum ada riwayat versi untuk aset ini.</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-[19px] top-4 bottom-4 w-[2px] bg-coinbase-hairline" />
            <div className="space-y-6">
              {versions.map((v, i) => {
                const isCurrent = i === 0;
                return (
                  <div key={v.id} className="flex gap-5 relative">
                    <div className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center shrink-0 z-10 shadow-soft ${
                      isCurrent
                        ? 'bg-coinbase-primary border-coinbase-primary text-white'
                        : 'bg-white border-coinbase-hairline text-coinbase-muted'
                    }`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>

                    <div className={`flex-1 rounded-xl border p-4 ${isCurrent ? 'bg-coinbase-primary/5 border-coinbase-primary/20' : 'bg-white border-coinbase-hairline'}`}>
                      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[15px] font-bold text-coinbase-ink">Version {v.versionNumber}</span>
                          {isCurrent && (
                            <span className="px-2.5 py-0.5 bg-coinbase-primary/10 text-coinbase-primary border border-coinbase-primary/20 rounded-full text-[11px] font-bold">
                              Versi Terkini
                            </span>
                          )}
                        </div>
                        <span className="text-[12px] text-coinbase-muted font-mono">
                          {new Date(v.createdAt).toLocaleDateString('id-ID', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })}, {new Date(v.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {v.changelog ? (
                        <p className="text-[13px] text-coinbase-body mt-2 leading-relaxed">{v.changelog}</p>
                      ) : (
                        <p className="text-[12px] text-coinbase-muted mt-2 italic">Tidak ada catatan perubahan.</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VersionHistoryPanel;

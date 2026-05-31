import React, { useState, useEffect } from 'react';
import { Asset, AssetActivity, AssetVersion } from '../types';
import * as service from '../services/assetService';

interface AssetTimelinePanelProps {
  asset: Asset;
  onClose?: () => void;
  compact?: boolean;
}

const AssetTimelinePanel: React.FC<AssetTimelinePanelProps> = ({ asset, onClose, compact = false }) => {
  const [activities, setActivities] = useState<AssetActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (asset?.id) {
      loadTimeline();
    }
  }, [asset?.id]);

  const loadTimeline = async () => {
    setLoading(true);
    try {
      // Fetch both explicit history and version history
      const [historyData, versionsData] = await Promise.all([
        service.fetchAssetHistory(asset.id),
        service.fetchAssetVersions(asset.id),
      ]);

      const mergedActivities: AssetActivity[] = [...historyData];

      // 1. Synthesize CREATE event if not explicitly logged
      const hasCreateEvent = historyData.some(act => act.actionType === 'CREATE');
      if (!hasCreateEvent) {
        mergedActivities.push({
          id: 'synth-create',
          assetId: asset.id,
          actionType: 'CREATE',
          description: 'Aset pertama kali diunggah.',
          details: {
            title: asset.title,
            version: 1,
            status: asset.status,
          },
          createdAt: asset.createdAt,
        });
      }

      // 2. Synthesize VERSION_UPDATE events from asset_versions if not logged in history
      versionsData.forEach((ver) => {
        // Skip v1 since that corresponds to creation
        if (ver.versionNumber <= 1) return;

        const isLogged = historyData.some(
          act =>
            act.actionType === 'VERSION_UPDATE' &&
            act.details?.version?.new === ver.versionNumber
        );

        if (!isLogged) {
          mergedActivities.push({
            id: `synth-ver-${ver.id}`,
            assetId: asset.id,
            actionType: 'VERSION_UPDATE',
            description: `Memperbarui versi menjadi v${ver.versionNumber}.`,
            details: {
              version: {
                old: ver.versionNumber - 1,
                new: ver.versionNumber,
                changelog: ver.changelog || 'Tidak ada catatan perubahan.',
              },
            },
            createdAt: ver.createdAt,
          });
        }
      });

      // Sort chronological descending (newest first)
      mergedActivities.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setActivities(mergedActivities);
    } catch (e) {
      console.error('Failed to load asset timeline history:', e);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  const getActionStyles = (type: AssetActivity['actionType']) => {
    switch (type) {
      case 'CREATE':
        return {
          icon: '📥',
          bgColor: 'bg-emerald-50 text-emerald-600 border-emerald-200',
          badgeText: 'Unggah Awal',
          badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        };
      case 'REUPLOAD':
        return {
          icon: '🔄',
          bgColor: 'bg-blue-50 text-blue-600 border-blue-200',
          badgeText: 'Upload Ulang',
          badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
        };
      case 'VERSION_UPDATE':
        return {
          icon: '📝',
          bgColor: 'bg-purple-50 text-purple-600 border-purple-200',
          badgeText: 'Update Versi',
          badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
        };
      case 'UPDATE_INFO':
        return {
          icon: '⚙️',
          bgColor: 'bg-amber-50 text-amber-600 border-amber-200',
          badgeText: 'Update Info',
          badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
        };
      default:
        return {
          icon: '📄',
          bgColor: 'bg-gray-50 text-gray-600 border-gray-200',
          badgeText: 'Aktivitas',
          badgeColor: 'bg-gray-100 text-gray-800 border-gray-200',
        };
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const renderDetails = (details: Record<string, any>) => {
    if (!details || Object.keys(details).length === 0) return null;

    return (
      <div className="mt-3 text-xs space-y-2.5 bg-coinbase-surface-soft p-3 rounded-lg border border-coinbase-hairline">
        {Object.entries(details).map(([key, value]) => {
          if (!value || typeof value !== 'object') return null;

          let label = key;
          let oldValue = value.old;
          let newValue = value.new;

          if (key === 'title') label = 'Judul Aset';
          if (key === 'description') label = 'Deskripsi';
          if (key === 'status') label = 'Status Publikasi';
          if (key === 'brand') label = 'Entitas / Brand';
          if (key === 'type') label = 'Format File';
          if (key === 'link') {
            label = 'Link Berkas';
            oldValue = oldValue ? (oldValue.startsWith('data:') ? 'Lokal berkas (Base64)' : oldValue) : '—';
            newValue = newValue ? (newValue.startsWith('data:') ? 'Lokal berkas (Base64)' : newValue) : '—';
          }
          if (key === 'tags') {
            label = 'Tag Aset';
            oldValue = Array.isArray(oldValue) ? oldValue.join(', ') : oldValue || '—';
            newValue = Array.isArray(newValue) ? newValue.join(', ') : newValue || '—';
          }
          if (key === 'version') {
            label = 'Versi Berkas';
            oldValue = `v${oldValue}`;
            newValue = `v${newValue}`;
          }

          // Special layout for changelog
          if (key === 'version' && value.changelog) {
            return (
              <div key={key} className="space-y-1">
                <span className="font-semibold text-coinbase-muted uppercase tracking-wider text-[10px] block">
                  {label} ({oldValue} ➔ {newValue})
                </span>
                <div className="bg-white border border-coinbase-hairline rounded p-2.5 mt-1 font-sans text-coinbase-ink text-[13px] leading-relaxed italic">
                  &ldquo;{value.changelog}&rdquo;
                </div>
              </div>
            );
          }

          return (
            <div key={key} className="grid grid-cols-1 gap-1 border-b border-coinbase-hairline last:border-0 pb-1.5 last:pb-0">
              <span className="font-semibold text-coinbase-muted uppercase tracking-wider text-[10px]">
                {label}
              </span>
              <div className="flex items-center gap-1.5 flex-wrap text-coinbase-ink mt-0.5">
                <span className="px-1.5 py-0.5 bg-red-50 text-red-700 rounded border border-red-100 max-w-full truncate block" title={String(oldValue)}>
                  {String(oldValue || '—')}
                </span>
                <span className="text-coinbase-muted shrink-0 text-[10px]">➔</span>
                <span className="px-1.5 py-0.5 bg-green-50 text-green-700 rounded border border-green-100 max-w-full truncate block font-medium" title={String(newValue)}>
                  {String(newValue || '—')}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-coinbase-surface-strong border-t-coinbase-primary rounded-full animate-spin" />
        <p className="text-[12px] text-coinbase-muted mt-2 font-medium">Memuat Riwayat Timeline...</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${compact ? '' : 'bg-coinbase-canvas'}`}>
      {!compact && (
        <div className="px-6 py-5 border-b border-coinbase-hairline flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-[16px] font-bold text-coinbase-ink flex items-center gap-1.5">
              <span>🕒</span> Timeline Riwayat Aset
            </h2>
            <p className="text-[12px] text-coinbase-muted mt-0.5 truncate max-w-[280px]">
              {asset.title}
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-coinbase-surface-strong rounded-full transition-colors text-coinbase-muted hover:text-coinbase-ink"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )}

      <div className={`flex-1 overflow-y-auto ${compact ? 'py-1' : 'px-6 py-6'} no-scrollbar`}>
        {activities.length === 0 ? (
          <div className="text-center py-12 text-coinbase-muted">
            <span className="text-4xl block mb-2">🕒</span>
            <p className="text-[13px] font-medium">Belum ada riwayat aktivitas yang tercatat.</p>
          </div>
        ) : (
          <div className="relative">
            {/* Chronological Timeline Track Line */}
            <div className="absolute left-[19px] top-4 bottom-4 w-[2px] bg-coinbase-hairline" />

            <div className="space-y-6">
              {activities.map((activity) => {
                const isExpanded = expandedId === activity.id;
                const { icon, bgColor, badgeText, badgeColor } = getActionStyles(activity.actionType);
                const dateObj = new Date(activity.createdAt);
                
                const hasDetailedDiff = activity.details && Object.keys(activity.details).length > 0;

                return (
                  <div key={activity.id} className="flex gap-4 relative group">
                    {/* Pulsing visual node wrapper */}
                    <div
                      className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center shrink-0 z-10 shadow-soft transition-all duration-300 ${bgColor}`}
                    >
                      <span className="text-base select-none">{icon}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Header block */}
                      <div className="flex items-start justify-between flex-wrap gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[13.5px] font-bold text-coinbase-ink leading-snug">
                              {activity.description}
                            </span>
                            <span className={`px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider rounded border ${badgeColor}`}>
                              {badgeText}
                            </span>
                          </div>
                          
                          <p className="text-[11.5px] text-coinbase-muted font-medium flex items-center gap-1">
                            <span>📅</span>
                            <span>
                              {dateObj.toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                            <span className="opacity-50">•</span>
                            <span>
                              {dateObj.toLocaleTimeString('id-ID', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                              {' WIB'}
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* Expandable details indicator */}
                      {hasDetailedDiff && (
                        <button
                          type="button"
                          onClick={() => toggleExpand(activity.id)}
                          className="mt-2 text-[11px] font-bold text-coinbase-primary hover:text-coinbase-primary-active transition-colors flex items-center gap-1 select-none"
                        >
                          <span>{isExpanded ? '▼' : '▶'}</span>
                          <span>{isExpanded ? 'Sembunyikan Detail Perubahan' : 'Lihat Detail Perubahan'}</span>
                        </button>
                      )}

                      {/* Detailed JSON compare rendering */}
                      {isExpanded && renderDetails(activity.details)}
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

export default AssetTimelinePanel;

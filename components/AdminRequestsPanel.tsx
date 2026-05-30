import React, { useState } from 'react';
import { AssetRequest, Brand, AssetType } from '../types';

interface AdminRequestsPanelProps {
  requests: AssetRequest[];
  brands: Brand[];
  assetTypes: AssetType[];
  onUpdateRequest: (id: string, updates: { status?: AssetRequest['status']; adminNotes?: string }) => Promise<void>;
  onDeleteRequest: (id: string) => Promise<void>;
}

type FilterStatus = 'ALL' | AssetRequest['status'];

const STATUS_CONFIG: Record<AssetRequest['status'], { label: string; color: string; bg: string; border: string; icon: string }> = {
  PENDING:     { label: 'Menunggu',  color: 'text-amber-700',   bg: 'bg-amber-50',    border: 'border-amber-200',    icon: '🕐' },
  IN_PROGRESS: { label: 'Diproses', color: 'text-blue-700',    bg: 'bg-blue-50',     border: 'border-blue-200',     icon: '🔄' },
  COMPLETED:   { label: 'Selesai',  color: 'text-emerald-700', bg: 'bg-emerald-50',  border: 'border-emerald-200',  icon: '✅' },
  REJECTED:    { label: 'Ditolak',  color: 'text-red-700',     bg: 'bg-red-50',      border: 'border-red-200',      icon: '❌' },
};

const AdminRequestsPanel: React.FC<AdminRequestsPanelProps> = ({
  requests,
  brands,
  assetTypes,
  onUpdateRequest,
  onDeleteRequest,
}) => {
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('ALL');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredRequests = filterStatus === 'ALL'
    ? requests
    : requests.filter(r => r.status === filterStatus);

  const pendingCount = requests.filter(r => r.status === 'PENDING').length;
  const inProgressCount = requests.filter(r => r.status === 'IN_PROGRESS').length;

  const handleStatusChange = async (id: string, status: AssetRequest['status'], adminNotes?: string) => {
    setProcessingId(id);
    try {
      await onUpdateRequest(id, { status, adminNotes });
      if (rejectingId === id) {
        setRejectingId(null);
        setRejectReason('');
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectSubmit = async (id: string) => {
    if (!rejectReason.trim()) {
      alert('Silakan isi alasan penolakan.');
      return;
    }
    await handleStatusChange(id, 'REJECTED', rejectReason.trim());
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED'] as const).filter(s => s !== 'ALL').map(s => {
          const cfg = STATUS_CONFIG[s];
          const count = requests.filter(r => r.status === s).length;
          return (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`p-4 rounded-xl border text-left transition-all hover:shadow-soft ${
                filterStatus === s
                  ? `${cfg.bg} ${cfg.border} shadow-soft`
                  : 'bg-white border-coinbase-hairline'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{cfg.icon}</span>
                <span className={`text-[11px] font-bold uppercase tracking-wider ${filterStatus === s ? cfg.color : 'text-coinbase-muted'}`}>{cfg.label}</span>
              </div>
              <p className={`text-3xl font-black ${filterStatus === s ? cfg.color : 'text-coinbase-ink'}`}>{count}</p>
            </button>
          );
        })}
      </div>

      {/* Filter & Header */}
      <div className="bg-white rounded-xl border border-coinbase-hairline shadow-soft">
        <div className="p-5 border-b border-coinbase-hairline flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-[16px] font-bold text-coinbase-ink">
              Daftar Request
              {pendingCount > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 border border-amber-200 text-[11px] font-bold rounded-full">
                  {pendingCount} Menunggu
                </span>
              )}
            </h3>
          </div>
          <div className="flex gap-2 flex-wrap">
            {(['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED'] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all border ${
                  filterStatus === s
                    ? 'bg-coinbase-ink border-coinbase-ink text-white'
                    : 'bg-white border-coinbase-hairline text-coinbase-body hover:bg-coinbase-surface-strong'
                }`}
              >
                {s === 'ALL' ? `Semua (${requests.length})` : `${STATUS_CONFIG[s].icon} ${STATUS_CONFIG[s].label}`}
              </button>
            ))}
          </div>
        </div>

        {/* Request List */}
        {filteredRequests.length === 0 ? (
          <div className="text-center py-16 text-coinbase-muted">
            <div className="text-5xl mb-3">📭</div>
            <p className="text-[14px] font-medium">
              {filterStatus === 'ALL' ? 'Belum ada request yang masuk.' : `Tidak ada request dengan status ${STATUS_CONFIG[filterStatus]?.label}.`}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-coinbase-hairline">
            {filteredRequests.map(req => {
              const cfg = STATUS_CONFIG[req.status];
              const brand = brands.find(b => b.id === req.brandId);
              const assetType = assetTypes.find(t => t.id === req.assetTypeId);
              const isExpanded = expandedId === req.id;
              const isProcessing = processingId === req.id;
              const isRejecting = rejectingId === req.id;

              return (
                <div key={req.id} className="p-5">
                  <div className="flex items-start gap-4">
                    {/* Status indicator */}
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center text-lg shrink-0 ${cfg.bg} ${cfg.border}`}>
                      {cfg.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <h4 className="text-[15px] font-bold text-coinbase-ink">{req.assetName}</h4>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-[12px] text-coinbase-muted">
                              Oleh <span className="font-semibold text-coinbase-body">{req.requesterName}</span>
                              {req.requesterEmail && <span className="text-coinbase-muted"> ({req.requesterEmail})</span>}
                            </span>
                            <span className="text-coinbase-hairline">•</span>
                            <span className="text-[12px] text-coinbase-muted font-mono">
                              {new Date(req.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                            {brand && (
                              <>
                                <span className="text-coinbase-hairline">•</span>
                                <span className="px-2 py-0.5 bg-coinbase-surface-strong text-coinbase-ink text-[11px] font-semibold rounded-full">{brand.name}</span>
                              </>
                            )}
                            {assetType && (
                              <span className="px-2 py-0.5 bg-coinbase-surface-strong text-coinbase-ink text-[11px] font-semibold rounded-full">
                                {assetType.icon} {assetType.name}
                              </span>
                            )}
                          </div>
                        </div>

                        <span className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${cfg.bg} ${cfg.border} ${cfg.color}`}>
                          {cfg.icon} {cfg.label}
                        </span>
                      </div>

                      {/* Description preview */}
                      {req.description && (
                        <div className="mt-2">
                          <p className={`text-[13px] text-coinbase-body ${!isExpanded && req.description.length > 100 ? 'line-clamp-2' : ''}`}>
                            {req.description}
                          </p>
                          {req.description.length > 100 && (
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : req.id)}
                              className="text-[12px] text-coinbase-primary font-semibold mt-1 hover:underline"
                            >
                              {isExpanded ? 'Tampilkan Sedikit' : 'Selengkapnya'}
                            </button>
                          )}
                        </div>
                      )}

                      {/* Admin Notes */}
                      {req.adminNotes && (
                        <div className={`mt-3 px-3 py-2 rounded-lg border text-[13px] ${
                          req.status === 'REJECTED'
                            ? 'bg-red-50 border-red-200 text-red-800'
                            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        }`}>
                          <span className="font-bold text-[11px] uppercase tracking-wide block mb-1">
                            {req.status === 'REJECTED' ? '💬 Alasan Penolakan' : '💬 Catatan Admin'}
                          </span>
                          {req.adminNotes}
                        </div>
                      )}

                      {/* Reject form */}
                      {isRejecting && (
                        <div className="mt-3 space-y-2">
                          <textarea
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)}
                            rows={3}
                            placeholder="Tuliskan alasan penolakan yang jelas untuk peminta..."
                            className="w-full px-4 py-2.5 bg-white border border-red-300 rounded-lg text-[13px] outline-none focus:ring-1 focus:ring-red-400 resize-none"
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleRejectSubmit(req.id)}
                              disabled={isProcessing}
                              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-[13px] font-bold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                              {isProcessing ? <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" /> : null}
                              Konfirmasi Tolak
                            </button>
                            <button
                              onClick={() => { setRejectingId(null); setRejectReason(''); }}
                              className="px-4 py-2 bg-coinbase-surface-strong text-coinbase-ink text-[13px] font-semibold rounded-lg hover:bg-coinbase-hairline transition-colors"
                            >
                              Batal
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      {!isRejecting && (
                        <div className="flex items-center gap-2 mt-3 flex-wrap">
                          {req.status !== 'PENDING' && (
                            <button
                              onClick={() => handleStatusChange(req.id, 'PENDING')}
                              disabled={isProcessing}
                              className="px-3 py-1.5 text-[12px] font-semibold rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50 transition-colors disabled:opacity-50 flex items-center gap-1"
                            >
                              🕐 Set Pending
                            </button>
                          )}
                          {req.status !== 'IN_PROGRESS' && (
                            <button
                              onClick={() => handleStatusChange(req.id, 'IN_PROGRESS')}
                              disabled={isProcessing}
                              className="px-3 py-1.5 text-[12px] font-semibold rounded-lg border border-blue-300 text-blue-700 hover:bg-blue-50 transition-colors disabled:opacity-50 flex items-center gap-1"
                            >
                              🔄 Proses
                            </button>
                          )}
                          {req.status !== 'COMPLETED' && (
                            <button
                              onClick={() => handleStatusChange(req.id, 'COMPLETED')}
                              disabled={isProcessing}
                              className="px-3 py-1.5 text-[12px] font-semibold rounded-lg border border-emerald-300 text-emerald-700 hover:bg-emerald-50 transition-colors disabled:opacity-50 flex items-center gap-1"
                            >
                              ✅ Selesai
                            </button>
                          )}
                          {req.status !== 'REJECTED' && (
                            <button
                              onClick={() => setRejectingId(req.id)}
                              disabled={isProcessing}
                              className="px-3 py-1.5 text-[12px] font-semibold rounded-lg border border-red-300 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center gap-1"
                            >
                              ❌ Tolak
                            </button>
                          )}
                          <div className="flex-1" />
                          <button
                            onClick={() => { if (confirm(`Hapus request "${req.assetName}"?`)) onDeleteRequest(req.id); }}
                            className="p-1.5 rounded-lg text-coinbase-muted hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Hapus Request"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminRequestsPanel;

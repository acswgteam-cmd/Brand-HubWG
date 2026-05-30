import React, { useState, useEffect } from 'react';
import { AssetRequest, Brand, AssetType } from '../types';
import * as service from '../services/assetService';

interface RequestAssetPanelProps {
  brands: Brand[];
  assetTypes: AssetType[];
}

const STATUS_CONFIG: Record<AssetRequest['status'], { label: string; color: string; bg: string; icon: string }> = {
  PENDING:     { label: 'Menunggu',    color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200',    icon: '🕐' },
  IN_PROGRESS: { label: 'Diproses',   color: 'text-blue-700',    bg: 'bg-blue-50 border-blue-200',      icon: '🔄' },
  COMPLETED:   { label: 'Selesai',    color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: '✅' },
  REJECTED:    { label: 'Ditolak',    color: 'text-red-700',     bg: 'bg-red-50 border-red-200',        icon: '❌' },
};

type FilterStatus = 'ALL' | AssetRequest['status'];

const RequestAssetPanel: React.FC<RequestAssetPanelProps> = ({ brands, assetTypes }) => {
  const [requests, setRequests] = useState<AssetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('ALL');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [form, setForm] = useState({
    requesterName: '',
    requesterEmail: '',
    assetName: '',
    description: '',
    brandId: '',
    assetTypeId: '',
  });

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await service.fetchAssetRequests();
      setRequests(data);
    } catch (e) {
      console.error('Failed to load requests', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.requesterName.trim() || !form.assetName.trim()) {
      setErrorMsg('Nama peminta dan nama aset wajib diisi.');
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const created = await service.createAssetRequest({
        requesterName: form.requesterName.trim(),
        requesterEmail: form.requesterEmail.trim() || undefined,
        assetName: form.assetName.trim(),
        description: form.description.trim() || undefined,
        brandId: form.brandId || undefined,
        assetTypeId: form.assetTypeId || undefined,
      });
      setRequests(prev => [created, ...prev]);
      setSuccessMsg(`Request "${created.assetName}" berhasil dikirim!`);
      setForm({ requesterName: '', requesterEmail: '', assetName: '', description: '', brandId: '', assetTypeId: '' });
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal mengirim request. Coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRequests = filterStatus === 'ALL'
    ? requests
    : requests.filter(r => r.status === filterStatus);

  return (
    <div className="h-full flex flex-col bg-coinbase-canvas overflow-hidden">
      {/* Header */}
      <div className="px-8 pt-10 pb-6 shrink-0">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-coinbase-primary/10 text-coinbase-primary flex items-center justify-center text-lg">
            📋
          </div>
          <div>
            <h1 className="text-[22px] font-bold text-coinbase-ink tracking-tight">Request Aset</h1>
            <p className="text-[13px] text-coinbase-muted">Ajukan permintaan aset baru kepada tim dan pantau statusnya</p>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="flex-1 overflow-y-auto px-8 pb-8 no-scrollbar">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Form */}
          <div className="lg:col-span-5 space-y-5">
            {successMsg && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 animate-fade-in shrink-0">
                <span className="text-emerald-600 text-lg shrink-0">✅</span>
                <p className="text-[13px] text-emerald-800 font-medium">{successMsg}</p>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-700 flex items-center gap-2">
                <span>⚠️</span> {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="bg-white rounded-xl border border-coinbase-hairline shadow-soft p-6 space-y-5">
                <h2 className="text-[15px] font-bold text-coinbase-ink border-b border-coinbase-hairline pb-2">✏️ Buat Request</h2>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-coinbase-muted uppercase tracking-wider">
                    Nama Lengkap <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    value={form.requesterName}
                    onChange={e => setForm({ ...form, requesterName: e.target.value })}
                    placeholder="Nama Anda"
                    className="w-full px-4 py-2.5 bg-coinbase-canvas border border-coinbase-hairline rounded-lg text-[14px] outline-none focus:ring-1 focus:ring-coinbase-primary focus:border-coinbase-primary transition-all placeholder:text-coinbase-muted"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-coinbase-muted uppercase tracking-wider">
                    Email <span className="text-coinbase-muted font-normal">(Opsional)</span>
                  </label>
                  <input
                    type="email"
                    value={form.requesterEmail}
                    onChange={e => setForm({ ...form, requesterEmail: e.target.value })}
                    placeholder="email@werkudara.com"
                    className="w-full px-4 py-2.5 bg-coinbase-canvas border border-coinbase-hairline rounded-lg text-[14px] outline-none focus:ring-1 focus:ring-coinbase-primary focus:border-coinbase-primary transition-all placeholder:text-coinbase-muted"
                  />
                </div>
              </div>

              <div className="bg-white rounded-xl border border-coinbase-hairline shadow-soft p-6 space-y-5">
                <h2 className="text-[15px] font-bold text-coinbase-ink border-b border-coinbase-hairline pb-2">Detail Aset yang Diminta</h2>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-coinbase-muted uppercase tracking-wider">
                    Nama Aset <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    value={form.assetName}
                    onChange={e => setForm({ ...form, assetName: e.target.value })}
                    placeholder="Contoh: Logo Horizontal Hitam Putih"
                    className="w-full px-4 py-2.5 bg-coinbase-canvas border border-coinbase-hairline rounded-lg text-[14px] outline-none focus:ring-1 focus:ring-coinbase-primary focus:border-coinbase-primary transition-all placeholder:text-coinbase-muted"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-coinbase-muted uppercase tracking-wider">Brand</label>
                    <select
                      value={form.brandId}
                      onChange={e => setForm({ ...form, brandId: e.target.value })}
                      className="w-full px-3 py-2.5 bg-coinbase-canvas border border-coinbase-hairline rounded-lg text-[13px] outline-none focus:border-coinbase-primary transition-colors"
                    >
                      <option value="">Semua Brand</option>
                      {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-coinbase-muted uppercase tracking-wider">Format</label>
                    <select
                      value={form.assetTypeId}
                      onChange={e => setForm({ ...form, assetTypeId: e.target.value })}
                      className="w-full px-3 py-2.5 bg-coinbase-canvas border border-coinbase-hairline rounded-lg text-[13px] outline-none focus:border-coinbase-primary transition-colors"
                    >
                      <option value="">Semua Format</option>
                      {assetTypes.map(t => <option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-coinbase-muted uppercase tracking-wider">Deskripsi & Kebutuhan</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    rows={4}
                    placeholder="Jelaskan kebutuhan Anda... (ukuran, warna, penggunaan, dll.)"
                    className="w-full px-4 py-2.5 bg-coinbase-canvas border border-coinbase-hairline rounded-lg text-[14px] outline-none focus:ring-1 focus:ring-coinbase-primary focus:border-coinbase-primary transition-all resize-none placeholder:text-coinbase-muted"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-coinbase-primary hover:bg-coinbase-primary-active text-white font-semibold rounded-xl text-[14px] transition-all shadow-soft disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Mengirim...
                  </>
                ) : (
                  <>
                    <span>📤</span> Kirim Request
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right Column: Riwayat Request */}
          <div className="lg:col-span-7 space-y-5 bg-coinbase-surface-soft rounded-xl p-6 border border-coinbase-hairline">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-coinbase-hairline pb-4">
              <h2 className="text-[15px] font-bold text-coinbase-ink flex items-center gap-2">
                📋 Riwayat Request <span className="text-[12px] bg-coinbase-surface-strong px-2 py-0.5 rounded-full text-coinbase-body font-semibold">{requests.length}</span>
              </h2>
              
              {/* Status Filter */}
              <div className="flex gap-1 flex-wrap">
                {(['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all border ${
                      filterStatus === s
                        ? 'bg-coinbase-ink text-white border-coinbase-ink shadow-sm'
                        : 'bg-white text-coinbase-body border-coinbase-hairline hover:bg-coinbase-surface-strong'
                    }`}
                  >
                    {s === 'ALL' ? 'Semua' :
                     s === 'PENDING' ? '🕐 Menunggu' :
                     s === 'IN_PROGRESS' ? '🔄 Proses' :
                     s === 'COMPLETED' ? '✅ Selesai' :
                     '❌ Ditolak'}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-7 h-7 border-2 border-coinbase-surface-strong border-t-coinbase-primary rounded-full animate-spin" />
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="text-center py-16 text-coinbase-muted bg-white rounded-xl border border-coinbase-hairline">
                <div className="text-4xl mb-3">📭</div>
                <p className="text-[13px] font-medium">Belum ada request{filterStatus !== 'ALL' ? ` dengan status ini` : ''}.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1 no-scrollbar">
                {filteredRequests.map(req => {
                  const cfg = STATUS_CONFIG[req.status];
                  return (
                    <div
                      key={req.id}
                      className={`bg-white rounded-xl border ${req.status === 'REJECTED' ? 'border-red-200' : 'border-coinbase-hairline'} p-4 space-y-3 shadow-soft hover:shadow-md transition-shadow`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-[14px] font-bold text-coinbase-ink truncate">{req.assetName}</h3>
                          <p className="text-[11px] text-coinbase-muted mt-0.5">
                            Oleh <span className="font-semibold text-coinbase-body">{req.requesterName}</span>
                            {req.requesterEmail && <span className="hidden sm:inline"> • {req.requesterEmail}</span>}
                            <span> • {new Date(req.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          </p>
                        </div>
                        <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.bg} ${cfg.color}`}>
                          <span>{cfg.icon}</span> {cfg.label}
                        </span>
                      </div>

                      {req.description && (
                        <p className="text-[12px] text-coinbase-body bg-coinbase-surface-soft rounded-lg px-3 py-2 whitespace-pre-line leading-relaxed">
                          {req.description}
                        </p>
                      )}

                      {req.status === 'REJECTED' && req.adminNotes && (
                        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-start gap-2">
                          <span className="text-red-500 text-sm shrink-0">💬</span>
                          <div>
                            <p className="text-[10px] font-bold text-red-600 uppercase tracking-wide">Alasan Penolakan</p>
                            <p className="text-[12px] text-red-800 font-medium">{req.adminNotes}</p>
                          </div>
                        </div>
                      )}

                      {req.status === 'COMPLETED' && req.adminNotes && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex items-start gap-2">
                          <span className="text-emerald-500 text-sm shrink-0">💬</span>
                          <div>
                            <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">Catatan Admin</p>
                            <p className="text-[12px] text-emerald-900 font-medium">{req.adminNotes}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default RequestAssetPanel;

import { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { toPng } from 'html-to-image';
import { FiDownload, FiPrinter, FiRefreshCw, FiTag } from 'react-icons/fi';
import voucherCardBg from '../../components/images/voucher_card.png';
import '../styles/voucher.css';

/* ---- helpers -------------------------------------------- */
function generateVoucherNumber(seed) {
  // 6-digit zero-padded: start from 000001 incrementing on seed
  const num = (seed % 999999) + 1;
  return String(num).padStart(6, '0');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
}

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

/* ---- Cover options -------------------------------------- */
const COVER_OPTIONS = [
  { label: 'Solo Experience', value: 'Solo Experience' },
  { label: 'Dinner for 2', value: 'Dinner for 2' },
  { label: 'Wine Tasting for 2', value: 'Wine Tasting for 2' },
  { label: 'Dinner for 4', value: 'Dinner for 4' },
  { label: 'Wine Tasting for 4', value: 'Wine Tasting for 4' },
  { label: 'Exclusive for 6', value: 'Exclusive for 6' },
  { label: 'Private Event — Up to 10', value: 'Private Event — Up to 10' },
  { label: 'Full Buyout Experience', value: 'Full Buyout Experience' },
];

const VALIDITY_OPTIONS = [
  { label: '3 Months', value: 3 },
  { label: '6 Months', value: 6 },
  { label: '1 Year', value: 12 },
  { label: 'Custom', value: 0 },
];

/* ---- The actual card ------------------------------------ */
export function VoucherCard({ voucher, cardRef }) {
  const { voucherNo, validUntil, signatoryName, cover } = voucher;
  const qrValue = `https://chateau254.com/voucher/verify/${voucherNo}`;

  return (
    <div className="voucher-card" ref={cardRef}>
      {/* background image — the full design */}
      <img
        className="voucher-card-bg"
        src={voucherCardBg}
        alt="Chateau254 Gift Voucher"
        draggable={false}
      />

      {/* === RIGHT STUB === */}
      <div className="voucher-stub">
        {/* Voucher Number — overlaid in the gold tag area */}
        <span className="voucher-stub-number">No. {voucherNo}</span>

        {/* QR Code — below the number */}
        <div className="voucher-stub-qr">
          <QRCodeSVG
            value={qrValue}
            size={64}
            bgColor="#ffffff"
            fgColor="#18120e"
            level="M"
          />
        </div>
      </div>

      {/* === BOTTOM 3-BOX ROW === */}
      <div className="voucher-bottom-row">
        {/* Box 1 — Valid Until */}
        <div className="voucher-box">
          <span className="voucher-box-label">Valid Until:</span>
          <span className="voucher-box-value">{validUntil ? formatDate(validUntil) : '—'}</span>
        </div>

        {/* Box 2 — Authorised Signature (cursive digital signature) */}
        <div className="voucher-box">
          <span className="voucher-box-label">Authorised Signature:</span>
          <span className="voucher-box-value signature">{signatoryName || 'Chateau254'}</span>
        </div>

        {/* Box 3 — Cover / Capacity */}
        <div className="voucher-box">
          <span className="voucher-box-label">Covers:</span>
          <span className="voucher-box-value cover">{cover || '—'}</span>
        </div>
      </div>
    </div>
  );
}

/* ---- Admin page ----------------------------------------- */
export default function VouchersContent() {
  const today = new Date().toISOString().slice(0, 10);
  const [generated, setGenerated] = useState([]); // { id, ...voucherData }
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [downloading, setDownloading] = useState(false);

  // Form state
  const [signatoryName, setSignatoryName] = useState('Chateau254');
  const [cover, setCover] = useState('Dinner for 2');
  const [validityMonths, setValidityMonths] = useState(6);
  const [customDate, setCustomDate] = useState('');

  const cardRef = useRef(null);

  function getValidUntil() {
    if (validityMonths === 0) return customDate;
    return addMonths(today, validityMonths);
  }

  function handleGenerate() {
    const seed = Date.now();
    const voucherNo = generateVoucherNumber(generated.length + 1 + Math.floor(Math.random() * 200));
    const validUntil = getValidUntil();
    const newVoucher = {
      id: seed,
      voucherNo,
      validUntil,
      signatoryName,
      cover,
      createdAt: today,
    };
    setGenerated((prev) => [newVoucher, ...prev]);
    setSelectedVoucher(newVoucher);
  }

  async function handleDownload() {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, { cacheBust: true, pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `Chateau254-Voucher-${selectedVoucher.voucherNo}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloading(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="admin-vouchers-wrap">
      {/* ---- Header ---- */}
      <div className="admin-vouchers-header">
        <div>
          <h2>Gift Vouchers</h2>
          <p>Generate and manage Chateau254 gift vouchers</p>
        </div>
      </div>

      {/* ---- Form panel ---- */}
      <div className="voucher-form-panel">
        <h3><FiTag /> Configure Voucher</h3>

        <div className="voucher-form-grid">
          {/* Signatory */}
          <div className="voucher-field">
            <label>Authorised By</label>
            <input
              type="text"
              value={signatoryName}
              onChange={(e) => setSignatoryName(e.target.value)}
              placeholder="e.g. Chateau254"
            />
          </div>

          {/* Cover */}
          <div className="voucher-field">
            <label>Voucher Covers</label>
            <select value={cover} onChange={(e) => setCover(e.target.value)}>
              {COVER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Validity */}
          <div className="voucher-field">
            <label>Valid For</label>
            <select value={validityMonths} onChange={(e) => setValidityMonths(Number(e.target.value))}>
              {VALIDITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Custom date — only when Custom is chosen */}
          {validityMonths === 0 && (
            <div className="voucher-field">
              <label>Expiry Date</label>
              <input
                type="date"
                value={customDate}
                min={today}
                onChange={(e) => setCustomDate(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="voucher-form-actions">
          <button className="voucher-btn-generate" onClick={handleGenerate}>
            <FiRefreshCw /> Generate Voucher
          </button>
        </div>
      </div>

      {/* ---- Preview ---- */}
      {selectedVoucher && (
        <div className="voucher-preview-wrap">
          <h3>Preview</h3>
          <div className="voucher-card-outer">
            <VoucherCard voucher={selectedVoucher} cardRef={cardRef} />
          </div>
          <div className="voucher-preview-actions">
            <button className="voucher-btn-download" onClick={handleDownload} disabled={downloading}>
              <FiDownload /> {downloading ? 'Downloading…' : 'Download PNG'}
            </button>
            <button className="voucher-btn-print" onClick={handlePrint}>
              <FiPrinter /> Print
            </button>
          </div>
        </div>
      )}

      {/* ---- Generated list ---- */}
      <div className="voucher-list-panel">
        <h3>Generated This Session ({generated.length})</h3>
        {generated.length === 0 ? (
          <p className="voucher-list-empty">No vouchers generated yet. Configure and hit "Generate Voucher".</p>
        ) : (
          <table className="voucher-list-table">
            <thead>
              <tr>
                <th>Voucher No.</th>
                <th>Covers</th>
                <th>Valid Until</th>
                <th>Authorised By</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {generated.map((v) => (
                <tr key={v.id}>
                  <td><span className="voucher-num-badge">No. {v.voucherNo}</span></td>
                  <td>{v.cover}</td>
                  <td>{formatDate(v.validUntil)}</td>
                  <td>{v.signatoryName}</td>
                  <td>
                    <div className="voucher-list-actions">
                      <button
                        className="voucher-list-action-btn"
                        onClick={() => setSelectedVoucher(v)}
                      >
                        Preview
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

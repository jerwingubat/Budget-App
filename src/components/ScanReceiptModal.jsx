import { useRef, useState } from 'react';
import { Modal, FormField, FormRow, ProgressBar, SeeMore, useToast } from './UI';
import useReceiptScan from '../hooks/useReceiptScan';
import { fmt, today, DEFAULT_CATEGORIES } from '../utils';

export default function ScanReceiptModal({ onClose, categories, addTransaction }) {
  const scan = useReceiptScan(categories);
  const { addToast } = useToast();
  const catList = categories && categories.length ? categories : DEFAULT_CATEGORIES;
  const { step, progress, label, imageUrl, rawText, parsed, draft, error, beginScan, retryOcr, setDraftField, setRawText, reset } = scan;
  const [saving, setSaving] = useState(false);
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (file) => {
    if (file) beginScan(file);
  };

  const handleSave = async () => {
    if (saving) return;
    const amount = Number(draft?.amount);
    if (!draft || !Number.isFinite(amount) || amount <= 0) {
      addToast('Enter a valid amount', 'error');
      return;
    }
    if (!(draft.description || '').trim()) {
      addToast('Enter a description', 'error');
      return;
    }
    setSaving(true);
    try {
      await addTransaction({
        type: draft.type || 'expense',
        amount,
        description: draft.description.trim(),
        category: draft.category || catList[0],
        date: draft.date || today(),
      });
      addToast('Transaction saved', 'success');
      handleClose();
    } catch {
      setSaving(false);
      addToast('Something went wrong', 'error');
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const weakFields = parsed ? Object.entries(parsed.confidence)
    .filter(([, v]) => v === 'none' || v === 'low')
    .map(([k]) => k) : [];
  const detectedDetail = [
    parsed?.paymentMethod && `Payment: ${parsed.paymentMethod}`,
    parsed?.tax != null && `VAT/Tax: ${fmt(parsed.tax)}`,
    parsed?.tip != null && `Tip: ${fmt(parsed.tip)}`,
  ].filter(Boolean);

  return (
    <Modal title="Scan Receipt" onClose={handleClose} wide>
      {step === 'pick' && (
        <div>
          <p className="scan-intro">
            Snap a photo or upload a receipt — we&apos;ll extract the merchant, total, date and category automatically.
          </p>

          <div className="scan-pick-grid">
            <button type="button" className="scan-pick-card" onClick={() => cameraInputRef.current?.click()}>
              <span className="scan-pick-icon">📷</span>
              <span className="scan-pick-label">Take Photo</span>
            </button>
            <button type="button" className="scan-pick-card" onClick={() => galleryInputRef.current?.click()}>
              <span className="scan-pick-icon">🖼</span>
              <span className="scan-pick-label">Choose from Gallery</span>
            </button>
          </div>

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={e => { handleFile(e.target.files?.[0]); e.target.value = ''; }}
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={e => { handleFile(e.target.files?.[0]); e.target.value = ''; }}
          />

          <div
            className={`scan-dropzone ${dragOver ? 'scan-dropover' : ''}`}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files?.[0];
              if (file) handleFile(file);
            }}
          >
            <span className="scan-drop-icon">⇪</span>
            <span>or drag &amp; drop a receipt here</span>
          </div>

          <p className="scan-note">🔒 Scanning happens on your device — your images are never uploaded.</p>
        </div>
      )}

      {step === 'ocr' && (
        <div>
          {imageUrl && <img src={imageUrl} alt="Receipt preview" className="scan-preview" />}
          <div className="scan-progress">
            <ProgressBar percent={Math.round((progress || 0) * 100)} />
            <p className="scan-status">{error ? '⚠ Scan failed' : label || 'Reading receipt…'}</p>
            <p className="scan-substatus">
              {error ? 'Check the image and try again.' : 'First scan downloads the OCR engine (~10 MB), then it\'s cached for offline use.'}
            </p>
          </div>
          {error && <button className="btn btn-primary" onClick={retryOcr}>Retry Scan</button>}
          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={handleClose}>Cancel</button>
          </div>
        </div>
      )}

      {step === 'review' && (
        <div>
          <div className="scan-review-head">
            {imageUrl && <img src={imageUrl} alt="Receipt" className="scan-preview scan-preview-sm" />}
            <div className="scan-review-meta">
              <p className="scan-detected">✓ Detected from receipt{draft?.amount ? ` • ${fmt(draft.amount)}` : ''}</p>
              {weakFields.length > 0 && (
                <p className="scan-warning">Please double-check: {weakFields.join(', ')}</p>
              )}
              {error && <p className="scan-warning">{error}</p>}
            </div>
          </div>

          <FormRow>
            <FormField label="Amount">
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={draft?.amount ?? ''}
                onChange={e => setDraftField('amount', e.target.value)}
                className={Number(draft?.amount) > 0 ? '' : 'input-invalid'}
              />
            </FormField>
            <FormField label="Date">
              <input
                type="date"
                value={draft?.date || ''}
                onChange={e => setDraftField('date', e.target.value)}
                required
              />
            </FormField>
          </FormRow>

          <FormField label="Description">
            <input
              type="text"
              value={draft?.description || ''}
              onChange={e => setDraftField('description', e.target.value)}
              placeholder="e.g. Jollibee"
            />
          </FormField>

          <FormField label="Category">
            <select value={draft?.category || ''} onChange={e => setDraftField('category', e.target.value)}>
              {catList.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </FormField>

          {parsed && parsed.lineItems.length > 0 && (
            <div className="scan-extracted">
              <p className="scan-extracted-title">Extracted line items</p>
              <SeeMore initial={5}>
                {parsed.lineItems.map((it, i) => (
                  <div key={i} className="scan-detail-row">
                    <span className="scan-detail-name">
                      {it.name}
                      {it.qty > 1 && <span className="scan-qty"> ×{it.qty}</span>}
                    </span>
                    <span className="scan-detail-price">{fmt(it.total)}</span>
                  </div>
                ))}
              </SeeMore>
            </div>
          )}

          {detectedDetail.length > 0 && (
            <div className="scan-metadata">
              {detectedDetail.map((d, i) => (
                <span key={i} className="cat-badge">{d}</span>
              ))}
            </div>
          )}

          <details className="scan-raw">
            <summary>Review raw text</summary>
            <p className="scan-hint-sm">Fix any garbled OCR text here — the form above re-parses automatically.</p>
            <textarea
              className="raw-text-editor"
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              placeholder="OCR text appears here…"
            />
          </details>

          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={handleClose}>Cancel</button>
            <button type="button" className="btn btn-secondary" onClick={retryOcr}>Retry Scan</button>
            <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save Transaction'}
            </button>
          </div>
        </div>
      )}

      </Modal>
  );
}
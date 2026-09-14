import { useCallback, useRef, useState } from 'react';
import { prepareImage, extractTextFromImage } from '../services/ocrService';
import { parseReceipt, composeTransaction } from '../utils/receiptParser';

const initialState = {
  step: 'pick',
  progress: 0,
  label: '',
  imageUrl: null,
  rawText: '',
  parsed: null,
  draft: null,
  error: null,
};

export default function useReceiptScan(categories = []) {
  const [state, setState] = useState(initialState);
  const fileRef = useRef(null);

  const runOcr = useCallback(async (file, categories) => {
    fileRef.current = file;
    setState(s => ({ ...s, step: 'ocr', progress: 0, label: 'Preparing image…', error: null }));
    try {
      const prepared = await prepareImage(file);
      setState(s => ({ ...s, progress: 0.05, label: 'Reading receipt…' }));
      const { text } = await extractTextFromImage(prepared, {
        onProgress: ({ progress, label }) => setState(s => ({ ...s, progress, label })),
      });
      if (!text || !text.trim()) {
        setState(s => ({
          ...s,
          step: 'review',
          rawText: '',
          parsed: null,
          draft: { type: 'expense', amount: 0, description: '', category: '' },
          error: 'No text detected. You can type the receipt details below.',
        }));
        return;
      }
      const parsed = parseReceipt(text);
      const draft = composeTransaction(parsed, categories);
      setState(s => ({ ...s, step: 'review', rawText: parsed.rawText, parsed, draft }));
    } catch (err) {
      setState(s => ({ ...s, step: 'ocr', progress: 0, error: err.message || 'Scan failed' }));
    }
  }, []);

  const beginScan = useCallback((file) => {
    if (!file) return;
    const imageUrl = URL.createObjectURL(file);
    if (state.imageUrl && state.imageUrl.startsWith('blob:')) URL.revokeObjectURL(state.imageUrl);
    runOcr(file, categories);
    setState(s => ({ ...s, imageUrl }));
  }, [runOcr, categories, state.imageUrl]);

  const retryOcr = useCallback(() => {
    if (!fileRef.current) return;
    if (state.imageUrl && state.imageUrl.startsWith('blob:')) URL.revokeObjectURL(state.imageUrl);
    const imageUrl = URL.createObjectURL(fileRef.current);
    runOcr(fileRef.current, categories);
    setState(s => ({ ...s, imageUrl }));
  }, [runOcr, categories, state.imageUrl]);

  const setDraftField = useCallback((key, value) => {
    setState(s => ({ ...s, draft: { ...(s.draft || {}), [key]: value } }));
  }, []);

  const setRawText = useCallback((text) => {
    setState(s => {
      const parsed = parseReceipt(text);
      const draft = composeTransaction(parsed, categories);
      return { ...s, rawText: text, parsed, draft };
    });
  }, [categories]);

  const reset = useCallback(() => {
    if (state.imageUrl && state.imageUrl.startsWith('blob:')) URL.revokeObjectURL(state.imageUrl);
    fileRef.current = null;
    setState(initialState);
  }, [state.imageUrl]);

  return {
    ...state,
    beginScan,
    retryOcr,
    setDraftField,
    setRawText,
    reset,
  };
}
import { useCallback, useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import Icon from '../../../components/Icon';
import { useLanguage } from '../../../i18n/LanguageProvider';

// pdf.js runs the heavy parsing/rendering off the main thread in a web worker.
// Vite bundles this URL as an asset so no file needs copying into /public.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface PdfViewerProps {
  /** URL of the PDF served by the backend (/api/hsk/material/**). */
  url: string;
  /** 1-based page to open on mount / when a new roadmap request arrives. */
  initialPage?: number;
  title?: string;
}

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.25;

// Fetch only the byte ranges for the page being viewed instead of eagerly
// downloading the whole (up to 150 MB) scanned book in the background. Module
// scope keeps the object identity stable so react-pdf doesn't reload the file.
const PDF_OPTIONS = { disableAutoFetch: true, disableStream: true };

/**
 * Renders a single PDF page at a time with pdf.js (via react-pdf).
 *
 * Unlike a native <iframe>, this only fetches and rasterises the page being
 * viewed: pdf.js streams the file over HTTP range requests (the backend's
 * ResourceHttpRequestHandler supports them), so opening a 150 MB scanned book
 * no longer means downloading it whole before anything appears.
 */
export default function PdfViewer({ url, initialPage, title }: PdfViewerProps) {
  const { text } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(initialPage ?? 1);
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState(false);

  // Measure the container so each page renders at the available width (and stays
  // crisp after a resize) instead of pdf.js's tiny intrinsic size.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Switching material (new url) or opening a lesson page from the roadmap.
  useEffect(() => {
    setPageNumber(initialPage && initialPage > 0 ? initialPage : 1);
    setError(false);
  }, [url, initialPage]);

  const onLoadSuccess = useCallback(
    ({ numPages: n }: { numPages: number }) => {
      setNumPages(n);
      setPageNumber((p) => Math.min(Math.max(p, 1), n));
    },
    [],
  );

  const goTo = (p: number) => setPageNumber(Math.min(Math.max(p, 1), numPages || 1));

  const btn =
    'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <button type="button" className={btn} onClick={() => goTo(pageNumber - 1)} disabled={pageNumber <= 1} aria-label={text('Trang trước', 'Previous page')}>
            <Icon name="chevR" size={18} className="rotate-180" />
          </button>
          <div className="flex items-center gap-1.5 text-[13.5px] font-semibold text-slate-600">
            <input
              type="number"
              min={1}
              max={numPages || 1}
              value={pageNumber}
              onChange={(e) => goTo(Number(e.target.value))}
              className="w-14 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-center tabular-nums outline-none focus:border-violet-500"
            />
            <span className="text-slate-400">/ {numPages || '…'}</span>
          </div>
          <button type="button" className={btn} onClick={() => goTo(pageNumber + 1)} disabled={!!numPages && pageNumber >= numPages} aria-label={text('Trang sau', 'Next page')}>
            <Icon name="chevR" size={18} />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button type="button" className={btn} onClick={() => setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)))} disabled={zoom <= ZOOM_MIN} aria-label={text('Thu nhỏ', 'Zoom out')}>
            <Icon name="minus" size={18} />
          </button>
          <span className="w-12 text-center text-[13px] font-semibold tabular-nums text-slate-500">{Math.round(zoom * 100)}%</span>
          <button type="button" className={btn} onClick={() => setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)))} disabled={zoom >= ZOOM_MAX} aria-label={text('Phóng to', 'Zoom in')}>
            <Icon name="plus" size={18} />
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex h-[68vh] justify-center overflow-auto rounded-xl border border-slate-200 bg-slate-100 p-3"
      >
        {error ? (
          <div className="flex h-full items-center px-6 text-center text-sm text-slate-500">
            {text('Không tải được tài liệu. Hãy thử mở ở tab mới.', 'Could not load the document. Try opening it in a new tab.')}
          </div>
        ) : (
          <Document
            file={url}
            options={PDF_OPTIONS}
            onLoadSuccess={onLoadSuccess}
            onLoadError={() => setError(true)}
            loading={
              <div className="flex h-full items-center text-sm text-slate-400">
                {text('Đang tải tài liệu…', 'Loading document…')}
              </div>
            }
          >
            {width > 0 && (
              <Page
                pageNumber={pageNumber}
                width={width * zoom}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                loading={
                  <div className="flex h-[60vh] items-center text-sm text-slate-400">
                    {text('Đang hiển thị trang…', 'Rendering page…')}
                  </div>
                }
                className="shadow-sm [&>canvas]:!h-auto [&>canvas]:!max-w-full"
              />
            )}
          </Document>
        )}
      </div>

      {title && <p className="sr-only">{title}</p>}
    </div>
  );
}

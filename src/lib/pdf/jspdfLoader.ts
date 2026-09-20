// Loads jsPDF + jspdf-autotable from cdnjs at call time, rather than bundling them via npm.
// Why: this project currently has no PDF library in package.json and the build environment
// used to develop this feature has no package-registry network access. Loading via CDN script
// tags lets "Download Medical Record" work today without an npm install. Once you're ready to
// remove the runtime dependency, run `npm install jspdf jspdf-autotable` and swap this file for
// a normal `import { jsPDF } from "jspdf"` + `import "jspdf-autotable"`.

const JSPDF_URL = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/4.2.1/jspdf.umd.min.js";
const AUTOTABLE_URL = "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/5.0.8/jspdf.plugin.autotable.min.js";

declare global {
  interface Window {
    jspdf?: { jsPDF: new (...args: unknown[]) => JsPdfInstance };
  }
}

export type JsPdfInstance = {
  setFont: (font: string, style?: string) => JsPdfInstance;
  setFontSize: (size: number) => JsPdfInstance;
  setTextColor: (r: number, g?: number, b?: number) => JsPdfInstance;
  text: (text: string | string[], x: number, y: number, options?: Record<string, unknown>) => JsPdfInstance;
  addPage: () => JsPdfInstance;
  save: (filename: string) => void;
  output: (type: string) => unknown;
  internal: { pageSize: { getWidth: () => number; getHeight: () => number }; getNumberOfPages: () => number };
  setPage: (page: number) => JsPdfInstance;
  setDrawColor: (r: number, g?: number, b?: number) => JsPdfInstance;
  setLineWidth: (width: number) => JsPdfInstance;
  line: (x1: number, y1: number, x2: number, y2: number) => JsPdfInstance;
  lastAutoTable?: { finalY: number };
  autoTable: (options: any) => JsPdfInstance;
};

let loadPromise: Promise<new (...args: unknown[]) => JsPdfInstance> | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}

/**
 * Loads jsPDF (with the autoTable plugin attached) from the CDN.
 * Resolves with the jsPDF constructor. Rejects if the scripts can't be
 * reached — callers should fall back to the print-based flow in that case.
 */
export function loadJsPdf(): Promise<new (...args: unknown[]) => JsPdfInstance> {
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    await loadScript(JSPDF_URL);
    await loadScript(AUTOTABLE_URL);
    if (!window.jspdf?.jsPDF) {
      throw new Error("jsPDF failed to initialize after loading.");
    }
    return window.jspdf.jsPDF;
  })();

  loadPromise.catch(() => {
    // Allow retrying on the next call instead of caching a permanent failure.
    loadPromise = null;
  });

  return loadPromise;
}

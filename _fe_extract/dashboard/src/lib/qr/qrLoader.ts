// Loads QR generation and camera-scanning libraries from cdnjs at call time, for the same
// reason as src/lib/pdf/jspdfLoader.ts: no PDF/QR library is in package.json yet, and this
// environment has no package-registry network access. Once you have network access, run
// `npm install qrcodejs html5-qrcode` (or equivalents) and replace these with real imports.

const QRCODE_URL = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
const SCANNER_URL = "https://cdnjs.cloudflare.com/ajax/libs/html5-qrcode/2.3.8/html5-qrcode.min.js";

declare global {
  interface Window {
    QRCode?: new (element: HTMLElement, options: Record<string, unknown>) => { clear: () => void; makeCode: (text: string) => void };
    Html5Qrcode?: new (elementId: string) => {
      start: (
        cameraConfig: unknown,
        config: Record<string, unknown>,
        onSuccess: (decodedText: string) => void,
        onError?: (error: unknown) => void
      ) => Promise<void>;
      stop: () => Promise<void>;
      clear: () => void;
    };
  }
}

let scriptPromises: Record<string, Promise<void> | undefined> = {};

function loadScript(src: string): Promise<void> {
  if (scriptPromises[src]) return scriptPromises[src];
  scriptPromises[src] = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      delete scriptPromises[src];
      reject(new Error(`Failed to load script: ${src}`));
    };
    document.head.appendChild(script);
  });
  return scriptPromises[src];
}

export async function loadQrCodeGenerator() {
  await loadScript(QRCODE_URL);
  if (!window.QRCode) throw new Error("QR code generator failed to load.");
  return window.QRCode;
}

export async function loadQrScanner() {
  await loadScript(SCANNER_URL);
  if (!window.Html5Qrcode) throw new Error("Camera scanner failed to load.");
  return window.Html5Qrcode;
}

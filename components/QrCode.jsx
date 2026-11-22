'use client';
import { useEffect, useRef, useState } from 'react';

/**
 * Renders the authenticator QR code with three layers of fallback, so it can never
 * end up as an empty box:
 *   1. inline SVG from the API (no network, no canvas — survives strict sandboxes)
 *   2. PNG data URL from the API
 *   3. generated in the browser from the otpauth:// URI (qrcode bundled locally)
 */
export default function QrCode({ uri, svg, png, size = 208 }) {
 const [local, setLocal] = useState(null);
 const [state, setState] = useState('idle');
 const alive = useRef(true);

 useEffect(() => {
  alive.current = true;
  if (svg || png || !uri) return () => { alive.current = false; };
  setState('working');
  import('qrcode')
   .then(mod => {
    const QR = mod?.default || mod;
    return QR.toString(uri, { type: 'svg', margin: 1, width: size * 2, errorCorrectionLevel: 'M',
      color: { dark: '#11213a', light: '#ffffff' } });
   })
   .then(markup => { if (alive.current && markup) { setLocal(markup); setState('done'); } })
   .catch(() => { if (alive.current) setState('failed'); });
  return () => { alive.current = false; };
 }, [uri, svg, png, size]);

 const markup = svg || local;
 if (markup) {
  return <div className="qr-box" style={{ width: size, height: size }}
   // Our own server-generated SVG (or the locally bundled encoder) — never user input.
   dangerouslySetInnerHTML={{ __html: markup }} />;
 }
 if (png) return <div className="qr-box" style={{ width: size, height: size }}><img src={png} alt="Authenticator QR code" width={size} height={size} /></div>;

 return <div className="qr-box qr-box-empty" style={{ width: size, height: size }}>
  <span className="muted" style={{ fontSize: 12, textAlign: 'center', padding: 12 }}>
   {state === 'failed'
    ? 'This browser blocked the QR image. Add the setup key below instead — it does the same thing.'
    : 'Preparing your QR code…'}
  </span>
 </div>;
}

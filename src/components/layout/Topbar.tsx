import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import QRCode from "qrcode";
import { CalendarDays, Copy, ExternalLink, PawPrint, QrCode, RotateCcw, X } from "lucide-react";
import type { View } from "../../app/types";

type TopbarProps = {
  view: View;
  today: string;
  onNavigate: (view: View) => void;
  onNextDay: () => void;
  onResetToday: () => void;
};

export function Topbar({
  view,
  today,
  onNavigate,
  onNextDay,
  onResetToday,
}: TopbarProps) {
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [qrUrl, setQrUrl] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const appUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.location.href;
  }, []);
  const urlStatus = useMemo(() => getUrlStatus(appUrl), [appUrl]);

  useEffect(() => {
    if (!isQrOpen || !appUrl) return;

    let cancelled = false;
    QRCode.toDataURL(appUrl, {
      errorCorrectionLevel: "M",
      margin: 2,
      scale: 8,
      color: {
        dark: "#24302f",
        light: "#fffaf2",
      },
    })
      .then((dataUrl) => {
        if (!cancelled) setQrUrl(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setQrUrl("");
      });

    return () => {
      cancelled = true;
    };
  }, [appUrl, isQrOpen]);

  async function copyUrl() {
    if (!appUrl) return;

    try {
      await navigator.clipboard.writeText(appUrl);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1400);
    } catch {
      setCopyState("failed");
      window.setTimeout(() => setCopyState("idle"), 1800);
    }
  }

  const qrDialog =
    isQrOpen && typeof document !== "undefined"
      ? createPortal(
          <div className="qr-backdrop" role="presentation" onClick={() => setIsQrOpen(false)}>
            <section
              className="qr-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="qr-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="qr-heading">
                <div>
                  <p className="eyebrow">Demo sharing</p>
                  <h2 id="qr-title">Current URL QR</h2>
                </div>
                <button className="icon-button" onClick={() => setIsQrOpen(false)} title="Close QR dialog">
                  <X aria-hidden="true" />
                </button>
              </div>
              <div className={`qr-status ${urlStatus.kind}`}>
                <strong>{urlStatus.title}</strong>
                <span>{urlStatus.message}</span>
              </div>
              <div className="qr-code-frame">
                {qrUrl ? (
                  <img src={qrUrl} alt={`QR code for ${appUrl}`} />
                ) : (
                  <span>Generating QR...</span>
                )}
              </div>
              <code className="qr-url">{appUrl}</code>
              <div className="qr-actions">
                <button onClick={copyUrl}>
                  <Copy aria-hidden="true" />
                  {copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : "Copy URL"}
                </button>
                <a className="button-link" href={appUrl} target="_blank" rel="noreferrer">
                  <ExternalLink aria-hidden="true" /> Open
                </a>
              </div>
            </section>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <header className="topbar">
      <div className="brand">
        <PawPrint aria-hidden="true" />
        <div>
          <strong>pet</strong>
          <span>Waste-less kitchen companion</span>
        </div>
      </div>
      <div className="date-controls" aria-label="Demo date controls">
        <span>
          <CalendarDays aria-hidden="true" /> {today}
        </span>
        <button onClick={onNextDay}>Next day</button>
        <button className="icon-button" onClick={onResetToday} title="Reset to real today">
          <RotateCcw aria-hidden="true" />
        </button>
        <button onClick={() => setIsQrOpen(true)}>
          <QrCode aria-hidden="true" /> Show QR
        </button>
      </div>
      <nav aria-label="Main navigation">
        <button className={view === "dashboard" ? "active" : ""} onClick={() => onNavigate("dashboard")}>
          Dashboard
        </button>
        <button className={view === "add" ? "active" : ""} onClick={() => onNavigate("add")}>
          Add
        </button>
        <button className={view === "inventory" ? "active" : ""} onClick={() => onNavigate("inventory")}>
          Inventory
        </button>
        <button className={view === "impact" ? "active" : ""} onClick={() => onNavigate("impact")}>
          Impact
        </button>
      </nav>
      </header>
      {qrDialog}
    </>
  );
}

function getUrlStatus(url: string) {
  if (!url) {
    return {
      kind: "local",
      title: "URL not detected",
      message: "Open the app in a browser before sharing.",
    };
  }

  const parsed = new URL(url);
  const host = parsed.hostname.toLowerCase();
  const isLoopback = host === "localhost" || host === "127.0.0.1" || host === "::1";
  const isPrivateNetwork =
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host);

  if (isLoopback) {
    return {
      kind: "local",
      title: "Local machine only",
      message: "This QR opens only on this computer. Deploy the app before using it with judges.",
    };
  }

  if (isPrivateNetwork) {
    return {
      kind: "network",
      title: "Same network only",
      message: "This QR can work on phones connected to the same Wi-Fi, but is not a public demo URL.",
    };
  }

  return {
    kind: "public",
    title: "Public demo URL",
    message: "This QR uses the deployed address and is suitable for the hackathon demo.",
  };
}

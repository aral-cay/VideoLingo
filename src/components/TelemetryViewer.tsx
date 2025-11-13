import { useState, useEffect } from 'react';

const TELEMETRY_STORAGE_PREFIX = 'telemetry:';

export function TelemetryViewer() {
  const [isOpen, setIsOpen] = useState(false);
  const [telemetryData, setTelemetryData] = useState<Record<string, any>>({});

  useEffect(() => {
    if (isOpen) {
      loadTelemetry();
    }
  }, [isOpen]);

  const loadTelemetry = () => {
    const data: Record<string, any> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(TELEMETRY_STORAGE_PREFIX)) {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            data[key] = JSON.parse(value);
          }
        } catch (e) {
          console.error(`Failed to parse ${key}:`, e);
        }
      }
    }
    setTelemetryData(data);
  };

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(telemetryData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `telemetry-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    if (confirm('Clear all telemetry data?')) {
      Object.keys(telemetryData).forEach((key) => {
        localStorage.removeItem(key);
      });
      loadTelemetry();
    }
  };

  if (!isOpen) {
    return (
      <button
        className="telemetry-toggle"
        onClick={() => setIsOpen(true)}
        aria-label="Open telemetry viewer"
      >
        📊 Telemetry
      </button>
    );
  }

  return (
    <div className="telemetry-viewer" role="dialog" aria-labelledby="telemetry-title">
      <div className="telemetry-viewer-content">
        <div className="telemetry-viewer-header">
          <h2 id="telemetry-title">Telemetry Viewer</h2>
          <button
            className="telemetry-close"
            onClick={() => setIsOpen(false)}
            aria-label="Close telemetry viewer"
          >
            ×
          </button>
        </div>
        <div className="telemetry-viewer-actions">
          <button onClick={handleDownload}>Download JSON</button>
          <button onClick={handleClear}>Clear All</button>
          <button onClick={loadTelemetry}>Refresh</button>
        </div>
        <div className="telemetry-viewer-data">
          <pre>{JSON.stringify(telemetryData, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}



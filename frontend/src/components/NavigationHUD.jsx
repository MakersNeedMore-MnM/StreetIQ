import { X, AlertTriangle, Volume2, VolumeX } from 'lucide-react';

function formatDist(m) {
  if (m === null || m === undefined) return '--';
  if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
  return `${Math.round(m)} m`;
}

function headingLabel(deg) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
}

const HAZARD_LABELS = {
  pothole: 'Pothole',
  crack: 'Road Crack',
  waterlogging: 'Waterlogging',
  debris: 'Debris',
};

export default function NavigationHUD({
  step,
  maneuverIcon,
  distanceToNext,
  eta,
  heading,
  speedKmh,
  onStop,
  activeAlert = null,
  speechEnabled = true,
  onToggleSpeech,
}) {
  if (!step) return null;

  const isArriving = step.maneuver?.type === 'arrive';
  const hudColor = isArriving ? 'rgba(48,209,88,0.95)' : 'rgba(10,132,255,0.95)';
  const hudShadow = isArriving ? '0 8px 32px rgba(48,209,88,0.35)' : '0 8px 32px rgba(10,132,255,0.35)';
  const speed = Math.round(speedKmh ?? 0);

  return (
    <>
      <div style={{
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top, 0px) + 80px)',
        left: 12, right: 12,
        zIndex: 2000,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}>
        <div style={{
          background: hudColor,
          backdropFilter: 'blur(20px)',
          borderRadius: 20,
          padding: '14px 18px',
          boxShadow: hudShadow,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: 'rgba(255,255,255,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, flexShrink: 0, fontFamily: 'system-ui',
          }}>
            {maneuverIcon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 30, fontWeight: 800, color: 'white', fontFamily: 'Inter, sans-serif', letterSpacing: -1, lineHeight: 1 }}>
              {formatDist(distanceToNext)}
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.85)', fontFamily: 'Inter, sans-serif', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {step.instruction}
            </div>
            {eta !== null && (
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2, fontFamily: 'Inter, sans-serif' }}>
                ETA: {eta} min remaining
              </div>
            )}
          </div>
          <button
            onClick={onStop}
            style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
            aria-label="Stop navigation"
          >
            <X size={16} color="white" />
          </button>
        </div>

        {activeAlert && (
          <div
            style={{
              background:
                activeAlert.severity >= 4
                  ? 'rgba(255, 69, 58, 0.94)'
                  : 'rgba(255, 159, 10, 0.94)',
              backdropFilter: 'blur(20px)',
              borderRadius: 16,
              padding: '10px 14px',
              boxShadow:
                activeAlert.severity >= 4
                  ? '0 6px 24px rgba(255, 69, 58, 0.35)'
                  : '0 6px 24px rgba(255, 159, 10, 0.35)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              border: '0.5px solid rgba(255, 255, 255, 0.25)',
              animation: 'fadeIn 0.2s ease-in-out',
            }}
            role="alert"
            aria-live="polite"
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: 'rgba(0, 0, 0, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <AlertTriangle size={20} color="#FFFFFF" strokeWidth={2.4} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#FFFFFF',
                  fontFamily: 'Inter, sans-serif',
                  letterSpacing: -0.2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span>
                  {HAZARD_LABELS[activeAlert.type] || activeAlert.type || 'Hazard'}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '1px 6px',
                    borderRadius: 6,
                    background: 'rgba(0, 0, 0, 0.28)',
                    color: 'rgba(255, 255, 255, 0.9)',
                  }}
                >
                  Severity {typeof activeAlert.severity === 'number' && Number.isFinite(activeAlert.severity) ? activeAlert.severity : '3'}/5
                </span>
              </div>

              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'rgba(255, 255, 255, 0.92)',
                  fontFamily: 'Inter, sans-serif',
                  marginTop: 2,
                }}
              >
                {formatDist(activeAlert.distanceM)} ahead
              </div>
            </div>

            {onToggleSpeech && (
              <button
                type="button"
                onClick={onToggleSpeech}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'rgba(0, 0, 0, 0.22)',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
                aria-label={speechEnabled ? 'Mute voice hazard alerts' : 'Enable voice hazard alerts'}
                title={speechEnabled ? 'Voice alerts on' : 'Voice alerts muted'}
              >
                {speechEnabled ? (
                  <Volume2 size={16} color="#FFFFFF" />
                ) : (
                  <VolumeX size={16} color="rgba(255, 255, 255, 0.65)" />
                )}
              </button>
            )}
          </div>
        )}

        {heading !== null && (
          <div style={{ alignSelf: 'flex-end', background: 'rgba(28,28,30,0.88)', backdropFilter: 'blur(16px)', borderRadius: 12, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6, border: '0.5px solid rgba(84,84,88,0.5)' }}>
            <div style={{ width: 14, height: 14, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderBottom: '10px solid #0A84FF', transform: `rotate(${heading}deg)`, transition: 'transform 0.3s ease' }} />
            </div>
            <span style={{ fontSize: 12, color: 'rgba(235,235,245,0.8)', fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>
              {Math.round(heading)}° {headingLabel(heading)}
            </span>
          </div>
        )}
      </div>

      <div style={{
        position: 'fixed',
        bottom: 'calc(82px + env(safe-area-inset-bottom, 0px) + 12px)',
        left: 12,
        zIndex: 2000,
      }}>
        <div style={{
          background: 'rgba(28,28,30,0.92)',
          backdropFilter: 'blur(20px)',
          borderRadius: 16,
          border: '0.5px solid rgba(84,84,88,0.5)',
          padding: '10px 16px',
          textAlign: 'center',
          minWidth: 72,
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: speed > 0 ? 'white' : 'rgba(235,235,245,0.35)', fontFamily: 'Inter, sans-serif', letterSpacing: -1, lineHeight: 1 }}>
            {speed}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(235,235,245,0.45)', fontFamily: 'Inter, sans-serif', marginTop: 2, fontWeight: 500, letterSpacing: 0.5, textTransform: 'uppercase' }}>
            km/h
          </div>
        </div>
      </div>
    </>
  );
}

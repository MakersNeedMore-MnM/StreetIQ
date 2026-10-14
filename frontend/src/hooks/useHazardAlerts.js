import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { calculateDistance, calculateBearing, isAhead } from '../utils/geoUtils';

/**
 * Custom React hook for evaluating real-time proximity alerts to upcoming road hazards.
 * Derives the nearest verified hazard within the forward navigation cone and announces it
 * via Web Speech API with cooldown deduplication.
 *
 * @param {Object} params
 * @param {[number, number] | null} params.userLocation - Current [lat, lon] of the vehicle
 * @param {number | null} params.heading - Current compass heading in degrees [0, 360)
 * @param {Array<Object>} params.hazards - Array of StreetIQ hazard records
 * @param {boolean} params.isNavigating - Whether turn-by-turn navigation is actively running
 * @param {Function} params.getHazardCoordinates - Function mapping a hazard to [lat, lon] | null
 * @param {number} [params.maxDistanceM=250] - Proximity threshold in meters
 * @param {number} [params.coneAngle=45] - Maximum angular divergence from heading in degrees
 * @param {number} [params.cooldownMs=120000] - Announcement cooldown per hazard in milliseconds
 * @returns {{
 *   activeAlert: {
 *     id: string | number,
 *     type: string,
 *     distanceM: number,
 *     bearing: number | null,
 *     severity: number,
 *     status: string
 *   } | null,
 *   speechEnabled: boolean,
 *   setSpeechEnabled: React.Dispatch<React.SetStateAction<boolean>>
 * }}
 */
export default function useHazardAlerts({
  userLocation,
  heading,
  hazards,
  isNavigating,
  getHazardCoordinates,
  maxDistanceM = 250,
  coneAngle = 45,
  cooldownMs = 120000,
}) {
  const [speechEnabled, setSpeechEnabled] = useState(true);

  // Map of hazardId -> timestamp of last spoken alert (avoids React re-renders)
  const announcedCooldownsRef = useRef(new Map());

  // Prune expired cooldown timestamps
  const pruneExpiredCooldowns = useCallback(
    (now) => {
      const map = announcedCooldownsRef.current;
      for (const [id, timestamp] of map.entries()) {
        if (now - timestamp > cooldownMs) {
          map.delete(id);
        }
      }
    },
    [cooldownMs]
  );

  // Derive activeAlert directly from current inputs without setState inside useEffect
  const activeAlert = useMemo(() => {
    if (
      !isNavigating ||
      !userLocation ||
      typeof heading !== 'number' ||
      !Number.isFinite(heading) ||
      !Array.isArray(hazards) ||
      hazards.length === 0 ||
      typeof getHazardCoordinates !== 'function' ||
      maxDistanceM <= 0 ||
      coneAngle < 0
    ) {
      return null;
    }

    let nearestHazard = null;
    let minDistance = Infinity;
    let nearestBearing = null;

    for (const h of hazards) {
      if (!h || h.id === undefined || h.id === null) continue;

      // Only alert for confirmed/verified hazards
      if (h.status !== 'verified') continue;

      let coords;
      try {
        coords = getHazardCoordinates(h);
      } catch {
        continue;
      }

      if (!coords) continue;

      const dist = calculateDistance(userLocation, coords);
      if (dist === null || dist > maxDistanceM) continue;

      const bearing = calculateBearing(userLocation, coords);

      // If the hazard is virtually at the vehicle's position, bearing is null.
      // Treat distance <= 5m as qualifying immediately to avoid throwing or dropping it.
      if (bearing === null) {
        if (dist <= 5 && dist < minDistance) {
          minDistance = dist;
          nearestHazard = h;
          nearestBearing = null;
        }
        continue;
      }

      // Check if hazard lies within the forward viewing cone
      if (!isAhead(heading, bearing, coneAngle)) continue;

      if (dist < minDistance) {
        minDistance = dist;
        nearestHazard = h;
        nearestBearing = bearing;
      }
    }

    if (!nearestHazard) {
      return null;
    }

    return {
      id: nearestHazard.id,
      type: nearestHazard.type || 'hazard',
      distanceM: Math.round(minDistance),
      bearing: nearestBearing !== null ? Math.round(nearestBearing) : null,
      severity: nearestHazard.severity_score ?? nearestHazard.severity ?? 3,
      status: nearestHazard.status,
    };
  }, [
    userLocation,
    heading,
    hazards,
    isNavigating,
    getHazardCoordinates,
    maxDistanceM,
    coneAngle,
  ]);

  // Handle side-effect of speech announcement when an alert is active and eligible
  useEffect(() => {
    if (!activeAlert || !speechEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    try {
      const synth = window.speechSynthesis;
      const now = Date.now();
      pruneExpiredCooldowns(now);

      const lastAnnounced = announcedCooldownsRef.current.get(activeAlert.id);
      const isCooldownActive = lastAnnounced && now - lastAnnounced < cooldownMs;

      // Only announce if not within cooldown and speech synthesis is not already busy
      if (!isCooldownActive && !synth.speaking && !synth.pending) {
        const typeLabel = activeAlert.type.replace(/_/g, ' ');
        const distLabel =
          activeAlert.distanceM < 10
            ? 'immediately ahead'
            : `in approximately ${activeAlert.distanceM} meters`;
        const text = `Caution. ${typeLabel} ahead ${distLabel}.`;

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 1.0;

        synth.speak(utterance);
        announcedCooldownsRef.current.set(activeAlert.id, now);
      }
    } catch (e) {
      // Speech failure should fail silently and not break visual alerts
      console.warn('[useHazardAlerts] Speech alert failed:', e);
    }
  }, [activeAlert, speechEnabled, cooldownMs, pruneExpiredCooldowns]);

  return {
    activeAlert,
    speechEnabled,
    setSpeechEnabled,
  };
}

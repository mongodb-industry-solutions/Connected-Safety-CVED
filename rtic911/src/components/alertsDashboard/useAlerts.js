"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "@via-ds/components/toast";
import { acknowledgeAlert, fetchCrashContext, fetchRecentAlerts } from "@/lib/db/alertsActions.js";
import { ALERT_POLL_INTERVAL_MS } from "@/lib/const/cved.js";

const NEW_ALERT_NOTICE_MS = 6000;

/**
 * Polls the RTIC 911 alerts, selects the newest alert when one arrives and loads
 * the crash context of the selected alert from MongoDB.
 */
export function useAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [crashContext, setCrashContext] = useState(null);
  const [newAlertCount, setNewAlertCount] = useState(0);
  const knownIds = useRef(null);

  const loadAlerts = useCallback(async () => {
    const result = await fetchRecentAlerts();
    setIsLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setError(null);
    setAlerts(result);

    const newAlerts = knownIds.current ? result.filter((alert) => !knownIds.current.has(alert._id)) : [];
    knownIds.current = new Set(result.map((alert) => alert._id));
    if (newAlerts.length > 0) {
      setNewAlertCount(newAlerts.length);
      setSelectedId(newAlerts[0]._id);
    } else {
      setSelectedId((current) => current ?? result[0]?._id ?? null);
    }
  }, []);

  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, ALERT_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadAlerts]);

  useEffect(() => {
    if (newAlertCount === 0) return;
    const timeout = setTimeout(() => setNewAlertCount(0), NEW_ALERT_NOTICE_MS);
    return () => clearTimeout(timeout);
  }, [newAlertCount]);

  const selectedAlert = alerts.find((alert) => alert._id === selectedId) ?? null;
  const selectedCrashTsKey = selectedAlert?.crashTs.join(",");

  useEffect(() => {
    if (!selectedAlert) {
      setCrashContext(null);
      return;
    }
    let isCurrent = true;
    fetchCrashContext(selectedAlert.crashTs).then((result) => {
      if (isCurrent) setCrashContext(result);
    });
    return () => {
      isCurrent = false;
    };
    // reload only when the selected alert or its crash references change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, selectedCrashTsKey]);

  const handleAcknowledge = useCallback(
    async (alertId) => {
      const result = await acknowledgeAlert(alertId);
      if (result.error) {
        toast.error(`Could not acknowledge alert: ${result.error}`);
        return;
      }
      await loadAlerts();
    },
    [loadAlerts]
  );

  return { alerts, error, isLoading, selectedAlert, setSelectedId, crashContext, handleAcknowledge, newAlertCount, dismissNewAlert: () => setNewAlertCount(0) };
}

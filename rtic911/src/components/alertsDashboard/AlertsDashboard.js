"use client";

import { Banner } from "@via-ds/components/banner";
import { ProgressCircle } from "@via-ds/components/progress-circle";
import { Toaster } from "@via-ds/components/toast";
import { Body, Description, H3, InlineCode } from "@via-ds/components/typography";
import AlertDetail from "@/components/alertDetail/AlertDetail";
import AlertList from "@/components/alertList/AlertList";
import MongoPanel from "@/components/mongoPanel/MongoPanel";
import NewAlertNotice from "@/components/newAlertNotice/NewAlertNotice";
import { useAlerts } from "./useAlerts";

export default function AlertsDashboard() {
  const { alerts, error, isLoading, selectedAlert, setSelectedId, crashContext, handleAcknowledge, newAlertCount, dismissNewAlert } = useAlerts();

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <ProgressCircle aria-label="Loading alerts" size="xlarge" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Toaster />
      {newAlertCount > 0 && <NewAlertNotice count={newAlertCount} onDismiss={dismissNewAlert} />}
      {error && (
        <Banner variant="danger">
          <Body>
            Could not load alerts from MongoDB. Check <InlineCode>MONGODB_URI</InlineCode> and{" "}
            <InlineCode>DATABASE_NAME</InlineCode>. Error: {error}
          </Body>
        </Banner>
      )}
      {!error && alerts.length === 0 && (
        <Banner variant="info">
          <Body>Waiting for crash alerts from the VISSR cloud feeder…</Body>
        </Banner>
      )}
      {alerts.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-[16rem_minmax(0,1fr)] xl:grid-cols-[16rem_minmax(0,1fr)_26rem] 2xl:grid-cols-[18rem_minmax(0,1fr)_30rem] gap-6 items-start">
          <aside>
            <H3>Alerts</H3>
            <Description className="mb-2">{alerts.length} received</Description>
            <AlertList alerts={alerts} selectedId={selectedAlert?._id} onSelect={setSelectedId} />
          </aside>
          <section>
            {selectedAlert && (
              <AlertDetail alert={selectedAlert} onAcknowledge={handleAcknowledge} />
            )}
          </section>
          {selectedAlert && (
            <aside className="lg:col-span-2 xl:col-span-1 xl:sticky xl:top-6">
              <MongoPanel alert={selectedAlert} crashContext={crashContext} />
            </aside>
          )}
        </div>
      )}
    </div>
  );
}

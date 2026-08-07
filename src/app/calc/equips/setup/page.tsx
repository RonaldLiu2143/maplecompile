"use client";

import { useEffect, useState } from "react";
import { EquipmentSetupPanel } from "@/components/EquipmentSetupPanel";
import { ActiveCharacterBar } from "@/components/ActiveCharacterBar";
import { PairingBar } from "@/components/PairingBar";
import {
  activeCharacterKey,
  ensureActiveWorkspaceLoaded,
  migrateGlobalsToPrimaryWorkspace,
  persistLiveToWorkspace,
} from "@/lib/character-workspace";

export default function SetupClient() {
  const [reloadToken, setReloadToken] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const fromShare =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("from") === "share";
    if (fromShare) {
      migrateGlobalsToPrimaryWorkspace();
      persistLiveToWorkspace(activeCharacterKey());
    } else {
      ensureActiveWorkspaceLoaded();
    }
    setReady(true);
    if (fromShare) {
      window.history.replaceState(null, "", "/calc/equips/setup");
    }
  }, []);

  if (!ready) {
    return (
      <div className="space-y-8">
        <p className="text-sm opacity-70">Loading equipment setup…</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <ActiveCharacterBar
        onSwitched={() => setReloadToken((n) => n + 1)}
      />

      <PairingBar compact />

      <EquipmentSetupPanel
        variant="page"
        showClassSelect
        clearSetupOnClassChange
        reloadToken={reloadToken}
      />
    </div>
  );
}

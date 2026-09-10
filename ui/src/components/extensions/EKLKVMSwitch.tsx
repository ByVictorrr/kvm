import { useState } from "react";
import { LuMonitorCheck, LuMonitor } from "react-icons/lu";

import { JsonRpcResponse, useJsonRpc } from "@/hooks/useJsonRpc";
import Card from "@components/Card";
import { SettingsPageHeader } from "@components/SettingsPageheader";
import notifications from "@/notifications";
import { cx } from "@/cva.config";

// Edit these labels to match your actual servers.
const EKL_SERVER_NAMES = [
  "Server 1",
  "Server 2",
  "Server 3",
  "Server 4",
  "Server 5",
  "Server 6",
  "Server 7",
  "Server 8",
];

/**
 * Builds the 5-byte eKL 81HK RS-232 command string for the given input (1-8).
 *
 * Protocol (eKL 81HK documentation, 115200 8N1):
 *   Input N → bytes: 0x30 0x30 (0x30+N-1) 0x0A 0x0D
 *
 * In JavaScript strings:
 *   '0'  = 0x30, '\n' = 0x0A (LF), '\r' = 0x0D (CR)
 *
 * JSON serialises these as escape sequences (\n, \r) which JetKVM's
 * Go backend unescapes before writing raw bytes to /dev/ttyS3.
 */
function eklCommand(input: number): string {
  return `00${input - 1}\n\r`;
}

interface EKLKVMSwitchProps {
  /** When true the component renders in compact (toolbar-popover) mode. */
  compact?: boolean;
}

export function EKLKVMSwitch({ compact = false }: EKLKVMSwitchProps) {
  const [activeInput, setActiveInput] = useState<number | null>(null);
  const [pendingInput, setPendingInput] = useState<number | null>(null);
  const { send } = useJsonRpc();

  const handleSwitch = (input: number) => {
    if (pendingInput !== null) return;
    setPendingInput(input);

    send("sendCustomCommand", { command: eklCommand(input) }, (resp: JsonRpcResponse) => {
      setPendingInput(null);
      if ("error" in resp) {
        notifications.error(`KVM switch failed: ${resp.error.data ?? "Unknown error"}`);
        return;
      }
      setActiveInput(input);
    });
  };

  const grid = (
    <div className="grid grid-cols-4 gap-2">
      {EKL_SERVER_NAMES.map((name, i) => {
        const input = i + 1;
        const isActive = activeInput === input;
        const isPending = pendingInput === input;

        return (
          <button
            key={input}
            onClick={() => handleSwitch(input)}
            disabled={pendingInput !== null}
            title={`Switch to ${name} (eKL input ${input})`}
            className={cx(
              "flex flex-col items-center justify-center gap-1 rounded-md px-2 py-2.5 text-xs font-medium transition-all select-none",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
              isActive
                ? "bg-blue-600 text-white shadow-sm ring-1 ring-blue-700"
                : "bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600",
              pendingInput !== null && !isPending ? "cursor-not-allowed opacity-40" : "cursor-pointer",
              isPending ? "animate-pulse opacity-70" : "",
            )}
          >
            <LuMonitor
              className={cx("h-4 w-4", isActive ? "text-white" : "text-slate-500 dark:text-slate-400")}
            />
            <span className="truncate w-full text-center leading-tight">{name}</span>
          </button>
        );
      })}
    </div>
  );

  if (compact) {
    return (
      <div className="space-y-2 p-3">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
          KVM Input
        </p>
        {grid}
        {activeInput !== null && (
          <p className="text-xs text-slate-500 dark:text-slate-400 pt-1">
            Active:{" "}
            <span className="font-semibold text-blue-600 dark:text-blue-400">
              {EKL_SERVER_NAMES[activeInput - 1]}
            </span>
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SettingsPageHeader
        title="eKL KVM Switch"
        description="Select which server receives HDMI video and USB keyboard/mouse."
      />
      <Card>
        <div className="space-y-3 p-3">
          {grid}
          <div className="flex items-center gap-2 pt-1">
            <LuMonitorCheck
              className={cx(
                "h-4 w-4 shrink-0",
                activeInput !== null ? "text-blue-500" : "text-slate-400",
              )}
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {activeInput !== null ? (
                <>
                  Active:{" "}
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    {EKL_SERVER_NAMES[activeInput - 1]}
                  </span>
                  <span className="ml-1 text-slate-400">(port {activeInput})</span>
                </>
              ) : (
                "No input selected this session — last hardware state is preserved."
              )}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

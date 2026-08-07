/**
 * Preload script for the main Leapp window.
 * Phase 1 keeps nodeIntegration enabled; this surface replaces @electron/remote.
 */
import { IpcChannels } from "./ipc-channels";

const { ipcRenderer } = require("electron");

const leappApi = {
  channels: IpcChannels,
  invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args),
  send: (channel: string, ...args: any[]) => ipcRenderer.send(channel, ...args),
  sendSync: (channel: string, ...args: any[]) => ipcRenderer.sendSync(channel, ...args),
  on: (channel: string, listener: (...args: any[]) => void) => {
    const wrapped = (_event: any, ...args: any[]) => listener(...args);
    ipcRenderer.on(channel, wrapped);
    return () => ipcRenderer.removeListener(channel, wrapped);
  },
};

(window as any).leapp = leappApi;

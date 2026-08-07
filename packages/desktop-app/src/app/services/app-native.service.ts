import { Injectable } from "@angular/core";
import * as Keytar from "keytar";
import { INativeService } from "@noovolari/leapp-core/interfaces/i-native-service";
import { IMsalEncryptionService } from "@noovolari/leapp-core/interfaces/i-msal-encryption-service";
import { MsalEncryptionService } from "./msal-encryption.service";
import {
  createAppFacade,
  createBrowserWindowFacade,
  createCurrentWindowFacade,
  createDialogFacade,
  createMenuFacade,
  createNativeThemeFacade,
  createNotificationFacade,
  createSessionFacade,
  createSystemPreferencesFacade,
  createTrayFacade,
} from "./electron-main-bridge";

@Injectable({ providedIn: "root" })
export class AppNativeService implements INativeService {
  url: any;
  log: any;
  fs: any;
  rimraf: any;
  os: any;
  ini: any;
  app: any;
  dialog: any;
  exec: any;
  session: any;
  unzip: any;
  copydir: any;
  browserWindow: any;
  sudo: any;
  path: any;
  currentWindow: any;
  semver: any;
  shell: any;
  menu: any;
  tray: any;
  machineId: any;
  ipcRenderer: any;
  keytar: typeof Keytar;
  followRedirects: any;
  httpProxyAgent: any;
  httpsProxyAgent: any;
  nativeTheme: any;
  notification: any;
  nodeIpc: any;
  process: any;
  msalEncryptionService: IMsalEncryptionService;
  hashElement: any;
  requireModule: any;
  crypto: any;
  tar: any;
  fetch: any;
  ws: any;
  systemPreferences: any;

  constructor() {
    if (this.isElectron) {
      this.log = window.require("electron-log/renderer");
      this.fs = window.require("fs-extra");
      this.rimraf = window.require("rimraf");
      this.os = window.require("os");
      this.ini = window.require("js-ini");
      this.path = window.require("path");
      this.exec = window.require("child_process").exec;
      this.url = window.require("url");
      this.unzip = window.require("extract-zip");
      this.copydir = window.require("copy-dir");
      this.sudo = window.require("sudo-prompt");
      this.semver = window.require("semver");
      this.shell = window.require("electron").shell;
      this.machineId = window.require("node-machine-id").machineIdSync();
      this.keytar = window.require("keytar");
      this.followRedirects = window.require("follow-redirects");
      this.httpProxyAgent = window.require("http-proxy-agent");
      this.httpsProxyAgent = window.require("https-proxy-agent");
      this.ipcRenderer = window.require("electron").ipcRenderer;
      this.nodeIpc = window.require("node-ipc");
      this.process = (window as any).process;
      this.msalEncryptionService = new MsalEncryptionService(window.require("@noovolari/dpapi-addon"));
      this.requireModule = window.require("require-module");
      this.hashElement = window.require("folder-hash");
      this.crypto = window.require("crypto");
      this.tar = window.require("tar");
      this.fetch = window.fetch.bind(window);
      this.ws = window.require("ws");

      // Main-process APIs via preload IPC (replaces @electron/remote)
      this.app = createAppFacade();
      this.session = createSessionFacade();
      this.dialog = createDialogFacade();
      this.browserWindow = createBrowserWindowFacade();
      this.currentWindow = createCurrentWindowFacade();
      this.menu = createMenuFacade();
      this.tray = createTrayFacade();
      this.nativeTheme = createNativeThemeFacade();
      this.notification = createNotificationFacade();
      this.systemPreferences = createSystemPreferencesFacade();
    }
  }

  get isElectron(): boolean {
    return !!(window && window.process && (window.process as any).type);
  }
}

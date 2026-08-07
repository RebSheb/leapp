import { IpcChannels } from "./ipc-channels";

const { BrowserWindow, Menu, Notification, Tray, dialog, ipcMain, nativeTheme, session, systemPreferences, app } = require("electron");

type GetMainWindow = () => any;

const secondaryWindows = new Map<number, any>();
const trays = new Map<number, any>();
const webRequestCallbacks = new Map<string, (response: any) => void>();
let nextTrayId = 1;
let ec2HeadersRegistered = false;
let mainWindowListenersAttached = false;

function serializeMenuItem(item: any, clickHandler: (actionId: string) => void): any {
  if (!item) {
    return item;
  }
  if (item.type === "separator") {
    return { type: "separator" };
  }
  const out: any = {
    label: item.label,
    type: item.type,
    role: item.role,
    enabled: item.enabled,
    accelerator: item.accelerator,
    icon: item.icon,
  };
  if (item.actionId) {
    out.click = () => clickHandler(item.actionId);
  }
  if (item.submenu) {
    out.submenu = item.submenu.map((sub: any) => serializeMenuItem(sub, clickHandler));
  }
  return out;
}

function buildMenuFromSerialized(template: any[], clickHandler: (actionId: string) => void): any {
  return Menu.buildFromTemplate(template.map((item) => serializeMenuItem(item, clickHandler)));
}

export function attachMainWindowWebContentsListeners(win: any): void {
  if (!win || mainWindowListenersAttached) {
    return;
  }
  mainWindowListenersAttached = true;
  win.webContents.on("devtools-opened", () => {
    win.webContents.send(IpcChannels.CURRENT_WINDOW_WEBCONTENTS_EVENT, "devtools-opened");
  });
}

export function registerIpcHandlers(getMainWindow: GetMainWindow): void {
  ipcMain.on(IpcChannels.APP_GET_VERSION, (event) => {
    event.returnValue = app.getVersion();
  });

  ipcMain.on(IpcChannels.APP_GET_PATH, (event, name: string) => {
    event.returnValue = app.getPath(name);
  });

  ipcMain.on(IpcChannels.APP_EXIT, (_event, code?: number) => {
    app.exit(code ?? 0);
  });

  ipcMain.on(IpcChannels.APP_RELAUNCH, () => {
    app.relaunch();
  });

  ipcMain.on(IpcChannels.APP_DOCK_SET_BADGE, (_event, text: string) => {
    if (process.platform === "darwin" && app.dock) {
      app.dock.setBadge(text ?? "");
    }
  });

  ipcMain.handle(IpcChannels.DIALOG_SHOW_MESSAGE_BOX, async (_event, options: any) => {
    const win = getMainWindow();
    if (win) {
      return dialog.showMessageBox(win, options);
    }
    return dialog.showMessageBox(options);
  });

  ipcMain.on(IpcChannels.NATIVE_THEME_SHOULD_USE_DARK, (event) => {
    event.returnValue = nativeTheme.shouldUseDarkColors;
  });

  ipcMain.on(IpcChannels.SYSTEM_PREFERENCES_CAN_PROMPT_TOUCH_ID, (event) => {
    try {
      event.returnValue = systemPreferences.canPromptTouchID();
    } catch {
      event.returnValue = false;
    }
  });

  ipcMain.handle(IpcChannels.SYSTEM_PREFERENCES_PROMPT_TOUCH_ID, async (_event, reason: string) => {
    return systemPreferences.promptTouchID(reason);
  });

  ipcMain.on(IpcChannels.NOTIFICATION_SHOW, (_event, options: any) => {
    new Notification(options).show();
  });

  ipcMain.on(IpcChannels.CURRENT_WINDOW_MINIMIZE, (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize();
  });

  ipcMain.on(IpcChannels.CURRENT_WINDOW_HIDE, (event) => {
    BrowserWindow.fromWebContents(event.sender)?.hide();
  });

  ipcMain.on(IpcChannels.CURRENT_WINDOW_SHOW, (event) => {
    BrowserWindow.fromWebContents(event.sender)?.show();
  });

  ipcMain.on(IpcChannels.CURRENT_WINDOW_GET_POSITION, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    event.returnValue = win ? win.getPosition() : [0, 0];
  });

  ipcMain.on(IpcChannels.CURRENT_WINDOW_CLOSE_DEVTOOLS, (event) => {
    event.sender.closeDevTools();
  });

  ipcMain.handle(IpcChannels.SESSION_CLEAR_STORAGE, async (_event, options?: any) => {
    await session.defaultSession.clearStorageData(options || {});
  });

  ipcMain.on(IpcChannels.SESSION_SET_EC2_HEADERS, () => {
    if (ec2HeadersRegistered) {
      return;
    }
    ec2HeadersRegistered = true;
    const filter = { urls: ["https://*.amazonaws.com/"] };
    session.defaultSession.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
      details.requestHeaders["Origin"] = "http://localhost:4200";
      callback({ cancel: false, requestHeaders: details.requestHeaders });
    });
  });

  ipcMain.handle(IpcChannels.BW_CREATE, (event, options: any) => {
    const webPreferences = {
      ...(options.webPreferences || {}),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      devTools: options.webPreferences?.devTools ?? false,
    };
    const win = new BrowserWindow({
      ...options,
      webPreferences,
    });
    secondaryWindows.set(win.id, win);

    win.on("closed", () => {
      secondaryWindows.delete(win.id);
    });

    win.on("close", () => {
      event.sender.send(IpcChannels.BW_EVENT, { windowId: win.id, event: "close" });
    });

    return win.id;
  });

  ipcMain.on(IpcChannels.BW_LOAD_URL, (_event, windowId: number, targetUrl: string) => {
    secondaryWindows.get(windowId)?.loadURL(targetUrl);
  });

  ipcMain.on(IpcChannels.BW_CLOSE, (_event, windowId: number) => {
    const win = secondaryWindows.get(windowId);
    if (win && !win.isDestroyed()) {
      win.close();
    }
  });

  ipcMain.on(IpcChannels.BW_SET_MENU_BAR_VISIBILITY, (_event, windowId: number, visible: boolean) => {
    secondaryWindows.get(windowId)?.setMenuBarVisibility(visible);
  });

  ipcMain.on(IpcChannels.BW_REMOVE_MENU, (_event, windowId: number) => {
    secondaryWindows.get(windowId)?.removeMenu();
  });

  ipcMain.on(IpcChannels.BW_SET_MENU, (_event, windowId: number, menu: any) => {
    secondaryWindows.get(windowId)?.setMenu(menu);
  });

  ipcMain.on(
    IpcChannels.BW_WEBREQUEST_REGISTER,
    (event, payload: { windowId: number; kind: string; filter?: any; listenerId: string }) => {
      const win = secondaryWindows.get(payload.windowId);
      if (!win || win.isDestroyed()) {
        return;
      }
      const webRequest = win.webContents.session.webRequest;
      const forward = (kind: string, details: any, callback?: (response: any) => void) => {
        const requestId = `${payload.listenerId}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
        if (callback) {
          webRequestCallbacks.set(requestId, callback);
        }
        event.sender.send(IpcChannels.BW_WEBREQUEST_EVENT, {
          windowId: payload.windowId,
          listenerId: payload.listenerId,
          kind,
          requestId,
          details,
          expectsCallback: !!callback,
        });
      };

      if (payload.kind === "onBeforeRequest") {
        if (payload.filter) {
          webRequest.onBeforeRequest(payload.filter, (details, callback) => forward("onBeforeRequest", details, callback));
        } else {
          webRequest.onBeforeRequest((details, callback) => forward("onBeforeRequest", details, callback));
        }
      } else if (payload.kind === "onCompleted") {
        if (payload.filter) {
          webRequest.onCompleted(payload.filter, (details) => forward("onCompleted", details));
        } else {
          webRequest.onCompleted((details) => forward("onCompleted", details));
        }
      } else if (payload.kind === "onErrorOccurred") {
        if (payload.filter) {
          webRequest.onErrorOccurred(payload.filter, (details) => forward("onErrorOccurred", details));
        } else {
          webRequest.onErrorOccurred((details) => forward("onErrorOccurred", details));
        }
      }
    }
  );

  ipcMain.on(IpcChannels.BW_WEBREQUEST_RESPONSE, (_event, requestId: string, response: any) => {
    const callback = webRequestCallbacks.get(requestId);
    if (callback) {
      webRequestCallbacks.delete(requestId);
      callback(response || {});
    }
  });

  ipcMain.on(IpcChannels.MENU_SET_APPLICATION_MENU, (event, template: any[] | null) => {
    if (template === null) {
      Menu.setApplicationMenu(null);
      return;
    }
    const menu = buildMenuFromSerialized(template, (actionId) => {
      event.sender.send(IpcChannels.TRAY_MENU_CLICK, { scope: "application", actionId });
    });
    Menu.setApplicationMenu(menu);
  });

  ipcMain.handle(IpcChannels.TRAY_CREATE, (_event, iconPath: string) => {
    const id = nextTrayId++;
    const tray = new Tray(iconPath);
    trays.set(id, tray);
    return id;
  });

  ipcMain.on(IpcChannels.TRAY_SET_TOOLTIP, (_event, trayId: number, tooltip: string) => {
    trays.get(trayId)?.setToolTip(tooltip);
  });

  ipcMain.on(IpcChannels.TRAY_SET_CONTEXT_MENU, (event, trayId: number, template: any[]) => {
    const tray = trays.get(trayId);
    if (!tray) {
      return;
    }
    const menu = buildMenuFromSerialized(template, (actionId) => {
      event.sender.send(IpcChannels.TRAY_MENU_CLICK, { scope: "tray", trayId, actionId });
    });
    tray.setContextMenu(menu);
  });
}

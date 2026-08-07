/* eslint-disable @typescript-eslint/naming-convention, prefer-arrow/prefer-arrow-functions, @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/member-ordering, @typescript-eslint/no-use-before-define */

interface LeappApi {
  channels: Record<string, string>;
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  send: (channel: string, ...args: any[]) => void;
  sendSync: (channel: string, ...args: any[]) => any;
  on: (channel: string, listener: (...args: any[]) => void) => () => void;
}

const getLeapp = (): LeappApi => {
  const api = (window as any).leapp as LeappApi | undefined;
  if (!api) {
    throw new Error("window.leapp is not available; preload failed to initialize");
  }
  return api;
};

const channels = (): Record<string, string> => getLeapp().channels;

let actionSeq = 0;
const menuActionHandlers = new Map<string, () => void | Promise<void>>();
let trayClickListening = false;

const serializeMenuItem = (item: any): any => {
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
  if (typeof item.click === "function") {
    const actionId = `action-${++actionSeq}`;
    menuActionHandlers.set(actionId, item.click);
    out.actionId = actionId;
  }
  if (item.submenu) {
    out.submenu = item.submenu.map((sub: any) => serializeMenuItem(sub));
  }
  return out;
};

const ensureTrayClickListener = (): void => {
  if (trayClickListening) {
    return;
  }
  trayClickListening = true;
  getLeapp().on(channels().TRAY_MENU_CLICK, (payload: { actionId: string }) => {
    const handler = menuActionHandlers.get(payload.actionId);
    if (handler) {
      void handler();
    }
  });
};

const serializeTemplate = (template: any[]): any[] => {
  ensureTrayClickListener();
  return (template || []).map((item) => serializeMenuItem(item));
};

export const createAppFacade = () => {
  const leapp = getLeapp();
  const c = channels();
  return {
    getVersion: () => leapp.sendSync(c.APP_GET_VERSION) as string,
    getPath: (name: string) => leapp.sendSync(c.APP_GET_PATH, name) as string,
    exit: (code?: number) => leapp.send(c.APP_EXIT, code),
    relaunch: () => leapp.send(c.APP_RELAUNCH),
    dock: {
      setBadge: (text: string) => leapp.send(c.APP_DOCK_SET_BADGE, text),
    },
  };
};

export const createDialogFacade = () => {
  const leapp = getLeapp();
  return {
    showMessageBox: (options: any) => leapp.invoke(channels().DIALOG_SHOW_MESSAGE_BOX, options),
  };
};

export const createNativeThemeFacade = () => {
  const leapp = getLeapp();
  return {
    get shouldUseDarkColors() {
      return leapp.sendSync(channels().NATIVE_THEME_SHOULD_USE_DARK) as boolean;
    },
  };
};

export const createSystemPreferencesFacade = () => {
  const leapp = getLeapp();
  return {
    canPromptTouchID: () => leapp.sendSync(channels().SYSTEM_PREFERENCES_CAN_PROMPT_TOUCH_ID) as boolean,
    promptTouchID: (reason: string) => leapp.invoke(channels().SYSTEM_PREFERENCES_PROMPT_TOUCH_ID, reason),
  };
};

export const createNotificationFacade = () => {
  const leapp = getLeapp();
  const c = channels();
  // Must be constructable: callers do `new notification(options).show()`.
  return class LeappNotification {
    private options: any;

    constructor(options: any) {
      this.options = options;
    }

    show(): void {
      leapp.send(c.NOTIFICATION_SHOW, this.options);
    }
  };
};

export const createCurrentWindowFacade = () => {
  const leapp = getLeapp();
  const c = channels();
  const webContentsListeners = new Map<string, Array<() => void>>();

  leapp.on(c.CURRENT_WINDOW_WEBCONTENTS_EVENT, (eventName: string) => {
    const listeners = webContentsListeners.get(eventName) || [];
    listeners.forEach((listener) => listener());
  });

  return {
    minimize: () => leapp.send(c.CURRENT_WINDOW_MINIMIZE),
    hide: () => leapp.send(c.CURRENT_WINDOW_HIDE),
    show: () => leapp.send(c.CURRENT_WINDOW_SHOW),
    getPosition: () => leapp.sendSync(c.CURRENT_WINDOW_GET_POSITION) as [number, number],
    webContents: {
      on: (eventName: string, listener: () => void) => {
        const list = webContentsListeners.get(eventName) || [];
        list.push(listener);
        webContentsListeners.set(eventName, list);
      },
      closeDevTools: () => leapp.send(c.CURRENT_WINDOW_CLOSE_DEVTOOLS),
    },
  };
};

export const createSessionFacade = () => {
  const leapp = getLeapp();
  const c = channels();
  return {
    defaultSession: {
      clearStorageData: (options?: any, callback?: (data?: any) => void) => {
        const opts = Array.isArray(options) ? {} : options || {};
        const promise = leapp.invoke(c.SESSION_CLEAR_STORAGE, opts);
        if (typeof callback === "function") {
          promise.then((data: any) => callback(data)).catch(() => callback());
        }
        return promise;
      },
      webRequest: {
        onBeforeSendHeaders: (_filter: any, _listener: any) => {
          leapp.send(c.SESSION_SET_EC2_HEADERS);
        },
      },
    },
  };
};

export const createMenuFacade = () => {
  const leapp = getLeapp();
  return {
    buildFromTemplate: (template: any[]) => serializeTemplate(template),
    setApplicationMenu: (menu: any[] | null) => {
      if (menu === null) {
        leapp.send(channels().MENU_SET_APPLICATION_MENU, null);
        return;
      }
      const template = Array.isArray(menu) ? menu : [];
      leapp.send(channels().MENU_SET_APPLICATION_MENU, template);
    },
  };
};

export const createTrayFacade = () => {
  const leapp = getLeapp();
  const c = channels();

  return class LeappTray {
    private trayIdPromise: Promise<number>;

    constructor(iconPath: string) {
      this.trayIdPromise = leapp.invoke(c.TRAY_CREATE, iconPath);
    }

    setToolTip(tooltip: string): void {
      void this.trayIdPromise.then((id) => leapp.send(c.TRAY_SET_TOOLTIP, id, tooltip));
    }

    setContextMenu(menu: any[]): void {
      void this.trayIdPromise.then((id) => {
        const template = Array.isArray(menu) ? menu : serializeTemplate(menu as any);
        leapp.send(c.TRAY_SET_CONTEXT_MENU, id, template);
      });
    }
  };
};

type WebRequestListener = (details: any, callback?: (response: any) => void) => void;

export const createBrowserWindowFacade = () => {
  const leapp = getLeapp();
  const c = channels();
  const windowListeners = new Map<number, Map<string, Array<(...args: any[]) => void>>>();
  const webRequestListeners = new Map<string, WebRequestListener>();

  leapp.on(c.BW_EVENT, (payload: { windowId: number; event: string }) => {
    const listeners = windowListeners.get(payload.windowId)?.get(payload.event) || [];
    listeners.forEach((listener) => listener({ preventDefault() {} }));
  });

  leapp.on(
    c.BW_WEBREQUEST_EVENT,
    (payload: { windowId: number; listenerId: string; kind: string; requestId: string; details: any; expectsCallback: boolean }) => {
      const listener = webRequestListeners.get(payload.listenerId);
      if (!listener) {
        if (payload.expectsCallback) {
          leapp.send(c.BW_WEBREQUEST_RESPONSE, payload.requestId, {});
        }
        return;
      }
      const callback = payload.expectsCallback
        ? (response: any) => leapp.send(c.BW_WEBREQUEST_RESPONSE, payload.requestId, response)
        : () => undefined;
      listener(payload.details, callback);
    }
  );

  return class LeappBrowserWindow {
    public webContents: any;
    private ready: Promise<number>;

    constructor(options: any) {
      this.ready = leapp.invoke(c.BW_CREATE, options).then((id: number) => {
        windowListeners.set(id, new Map());
        return id;
      });
      this.webContents = {
        session: {
          webRequest: {
            onBeforeRequest: (filterOrListener: any, maybeListener?: WebRequestListener) => {
              void this.registerWebRequest("onBeforeRequest", filterOrListener, maybeListener);
            },
            onCompleted: (filterOrListener: any, maybeListener?: WebRequestListener) => {
              void this.registerWebRequest("onCompleted", filterOrListener, maybeListener);
            },
            onErrorOccurred: (filterOrListener: any, maybeListener?: WebRequestListener) => {
              void this.registerWebRequest("onErrorOccurred", filterOrListener, maybeListener);
            },
          },
        },
      };
    }

    loadURL(url: string): void {
      void this.ready.then((id) => leapp.send(c.BW_LOAD_URL, id, url));
    }

    close(): void {
      void this.ready.then((id) => leapp.send(c.BW_CLOSE, id));
    }

    setMenuBarVisibility(visible: boolean): void {
      void this.ready.then((id) => leapp.send(c.BW_SET_MENU_BAR_VISIBILITY, id, visible));
    }

    removeMenu(): void {
      void this.ready.then((id) => leapp.send(c.BW_REMOVE_MENU, id));
    }

    setMenu(menu: any): void {
      void this.ready.then((id) => leapp.send(c.BW_SET_MENU, id, menu));
    }

    on(eventName: string, listener: (...args: any[]) => void): void {
      void this.ready.then((id) => {
        const byEvent = windowListeners.get(id) || new Map();
        const list = byEvent.get(eventName) || [];
        list.push(listener);
        byEvent.set(eventName, list);
        windowListeners.set(id, byEvent);
      });
    }

    private async registerWebRequest(kind: string, filterOrListener: any, maybeListener?: WebRequestListener): Promise<void> {
      const id = await this.ready;
      const hasFilter = typeof filterOrListener === "object" && typeof maybeListener === "function";
      const filter = hasFilter ? filterOrListener : undefined;
      const listener = hasFilter ? maybeListener : filterOrListener;
      const listenerId = `${id}:${kind}:${++actionSeq}`;
      webRequestListeners.set(listenerId, listener);
      leapp.send(c.BW_WEBREQUEST_REGISTER, { windowId: id, kind, filter, listenerId });
    }
  };
};

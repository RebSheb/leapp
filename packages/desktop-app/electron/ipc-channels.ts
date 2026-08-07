/** IPC channel names shared by main and renderer (via preload). */
export const IpcChannels = {
  APP_GET_VERSION: "leapp:app:getVersion",
  APP_GET_PATH: "leapp:app:getPath",
  APP_EXIT: "leapp:app:exit",
  APP_RELAUNCH: "leapp:app:relaunch",
  APP_DOCK_SET_BADGE: "leapp:app:dock:setBadge",

  DIALOG_SHOW_MESSAGE_BOX: "leapp:dialog:showMessageBox",

  NATIVE_THEME_SHOULD_USE_DARK: "leapp:nativeTheme:shouldUseDarkColors",

  SYSTEM_PREFERENCES_CAN_PROMPT_TOUCH_ID: "leapp:systemPreferences:canPromptTouchID",
  SYSTEM_PREFERENCES_PROMPT_TOUCH_ID: "leapp:systemPreferences:promptTouchID",

  NOTIFICATION_SHOW: "leapp:notification:show",

  CURRENT_WINDOW_MINIMIZE: "leapp:currentWindow:minimize",
  CURRENT_WINDOW_HIDE: "leapp:currentWindow:hide",
  CURRENT_WINDOW_SHOW: "leapp:currentWindow:show",
  CURRENT_WINDOW_GET_POSITION: "leapp:currentWindow:getPosition",
  CURRENT_WINDOW_CLOSE_DEVTOOLS: "leapp:currentWindow:closeDevTools",
  CURRENT_WINDOW_WEBCONTENTS_EVENT: "leapp:currentWindow:webContents:event",

  SESSION_CLEAR_STORAGE: "leapp:session:clearStorageData",
  SESSION_SET_EC2_HEADERS: "leapp:session:setEc2Headers",

  BW_CREATE: "leapp:bw:create",
  BW_LOAD_URL: "leapp:bw:loadURL",
  BW_CLOSE: "leapp:bw:close",
  BW_SET_MENU_BAR_VISIBILITY: "leapp:bw:setMenuBarVisibility",
  BW_REMOVE_MENU: "leapp:bw:removeMenu",
  BW_SET_MENU: "leapp:bw:setMenu",
  BW_EVENT: "leapp:bw:event",
  BW_WEBREQUEST_REGISTER: "leapp:bw:webRequest:register",
  BW_WEBREQUEST_EVENT: "leapp:bw:webRequest:event",
  BW_WEBREQUEST_RESPONSE: "leapp:bw:webRequest:response",

  MENU_SET_APPLICATION_MENU: "leapp:menu:setApplicationMenu",

  TRAY_CREATE: "leapp:tray:create",
  TRAY_SET_CONTEXT_MENU: "leapp:tray:setContextMenu",
  TRAY_SET_TOOLTIP: "leapp:tray:setTooltip",
  TRAY_MENU_CLICK: "leapp:tray:menuClick",
} as const;

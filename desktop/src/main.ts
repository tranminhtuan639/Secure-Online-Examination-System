import { app, BrowserWindow, session } from 'electron';
import path from 'node:path';

// Dev: APP_URL=http://localhost:5173 (hoặc URL Vercel). Bản đóng gói: load web build trong resources.
const DEV_URL = process.env.APP_URL;

function isAllowed(url: string): boolean {
  if (DEV_URL && url.startsWith(DEV_URL)) return true;
  return url.startsWith('file://');
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      // Cấu hình bảo mật Electron (SEC-13)
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Chặn mở cửa sổ mới và điều hướng ra ngoài danh sách cho phép
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event, url) => {
    if (!isAllowed(url)) event.preventDefault();
  });

  if (DEV_URL) {
    void win.loadURL(DEV_URL);
  } else {
    void win.loadFile(path.join(process.resourcesPath, 'web', 'index.html'));
  }

  // TODO (giai đoạn 2): secure mode - kiosk, setContentProtection, chặn copy/paste,
  // phát hiện mất focus, gửi sự kiện về server.
  return win;
}

app.whenReady().then(() => {
  // Từ chối mọi yêu cầu quyền (camera, micro, ...) vì app thi không cần
  session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) =>
    callback(false),
  );
  createWindow();
});

app.on('window-all-closed', () => {
  app.quit();
});

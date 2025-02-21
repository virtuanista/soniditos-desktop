/**
 * The above code is an Electron application that creates a window to display a website, interacts with
 * Discord Rich Presence to show media details, and includes a system tray icon with options to show
 * the application or close it.
 */
const { app, BrowserWindow, Tray, Menu } = require('electron');
const path = require('path');
const rpc = require('discord-rpc');
const trayIconPath = path.join(__dirname, 'assets', 'tray-icon.png');

let win;
let tray;
let client;

function createWindow() {
  win = new BrowserWindow({
    width: 1366,
    height: 920,
    minWidth: 1366,
    minHeight: 920,
    center: true,
    show: true,
    frame: true,
    vibrancy: 'window',
    background: '#fff',
    icon: path.join(__dirname, 'src', 'assets', 'tray-icon.png'),
    titleBarStyle: 'default',
    titleBarOverlay: {
      color: '#fff'
    },
    webPreferences: {
      preload: path.join(app.getAppPath(), 'src', 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false
    },
    backgroundColor: '#fff'
  });

  win.loadURL('https://soniditos.com');

  client = new rpc.Client({ transport: 'ipc' });
  const configPath = path.resolve(__dirname, '..', 'src', 'config.json');

  win.webContents.on('did-finish-load', () => {
    try {
      const config = require(configPath);

      client.login({ clientId: config.ClientID }).catch(console.error);

      client.on('ready', () => {
        async function updatePresence() {

          let startTime = "Descubriendo...";

          const mediaTitlePromise = win.webContents.executeJavaScript('navigator.mediaSession.metadata ? navigator.mediaSession.metadata.title : null');
          const mediaTitle = await mediaTitlePromise;

          const mediaArtistPromise = win.webContents.executeJavaScript('navigator.mediaSession.metadata ? navigator.mediaSession.metadata.artist : null');
          const mediaArtist = await mediaArtistPromise;

          const mediaAlbumPromise = win.webContents.executeJavaScript('navigator.mediaSession.metadata ? navigator.mediaSession.metadata.album : null');
          const mediaAlbum = await mediaAlbumPromise;

          const mediaArtworkPromise = win.webContents.executeJavaScript('navigator.mediaSession.metadata ? navigator.mediaSession.metadata.artwork[0].src : null');
          const mediaArtwork = await mediaArtworkPromise;

          try {
            const startTimeElement = await getStartTimeElement();
            startTime = startTimeElement ? startTimeElement.trim() : "Descubriendo...";
          } catch (error) {
            console.error('Error al obtener startTimeElement:', error.message);
            startTime = "Descubriendo...";
          }

          const cuedMediaId = await win.webContents.executeJavaScript('localStorage.getItem("player.web-player.cuedMediaId")');

          client.request('SET_ACTIVITY', {
            pid: process.pid,
            activity: {
              details: `${mediaArtist} - ${mediaTitle}`,
              timestamps: {
                start: startTime ? Date.now() - parseTimestamp(startTime) : null,
              },
              assets: {
                large_image: mediaArtwork,
                large_text: mediaAlbum,
              },
              buttons: [
                {
                  label: config.Button1,
                  url: `https://soniditos.com/track/${encodeURIComponent(cuedMediaId)}/${encodeURIComponent(mediaArtist)}`
                },
              ],
              type: 2
            }
          });
        }
        
        setInterval(updatePresence, 1000);
      });
    } catch (error) {
      console.error('Error loading config:', error.message);
      console.error('Error en la función updatePresence:', error.message);
    }
  });

  win.setMenuBarVisibility(false);

  win.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      win.hide();
    }
  });
}

async function getStartTimeElement() {
  return new Promise((resolve, reject) => {
    const intervalId = setInterval(async () => {
      try {
        const startTimeElement = await win.webContents.executeJavaScript('document.querySelector("div.text-xs.text-muted.flex-shrink-0.min-w-40.text-right span").textContent');
        clearInterval(intervalId);
        resolve(startTimeElement);
      } catch (error) {
        console.error('Error al obtener startTimeElement:', error.message);
      }
    }, 2000);
  });
}

function parseTimestamp(timestamp) {
  const [minutes, seconds] = timestamp.split(':');
  return (parseInt(minutes, 10) * 60 + parseInt(seconds, 10)) * 1000;
}

function createTray() {
  tray = new Tray(trayIconPath);
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Mostrar aplicación',
      click: () => {
        win.show();
      }
    },
    {
      label: 'Cerrar',
      click: () => {
        app.isQuiting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('soniditos.com');
  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    win.show();
  });
}

app.whenReady().then(() => {
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    tray.destroy();
    app.quit();
  }
});

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (e) => {
    e.preventDefault();

    const singleInstance = BrowserWindow.getAllWindows()[0];
    if (!singleInstance.isVisible()) singleInstance.show();
    if (singleInstance.isMinimized()) singleInstance.maximize();
  });
}

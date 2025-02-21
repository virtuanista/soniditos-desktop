/* This code snippet is setting up a communication bridge between the main Electron process and the
renderer process in a Electron application. Here's a breakdown of what it's doing: */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ipcRenderer', {
  send: (channel, payload) => ipcRenderer.send(channel, payload),
  getMediaMetadata: () => navigator.mediaSession.metadata
});

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('hermes', {
  workerHealth: () => ipcRenderer.invoke('worker:health'),
  cards: {
    load: () => ipcRenderer.invoke('cards:load'),
    save: (cards) => ipcRenderer.invoke('cards:save', cards)
  },
  publish: {
    load: () => ipcRenderer.invoke('publish:load'),
    save: (log) => ipcRenderer.invoke('publish:save', log)
  },
  stats: {
    load: () => ipcRenderer.invoke('stats:load'),
    save: (stats) => ipcRenderer.invoke('stats:save', stats)
  },
  dialog: {
    openFile: () => ipcRenderer.invoke('dialog:openFile')
  },
  omniroute: {
    chat: (opts) => ipcRenderer.invoke('omniroute:chat', opts)
  },
  missionControl: {
    live: () => ipcRenderer.invoke('missioncontrol:live')
  },
  shell: {
    openPath: (p) => ipcRenderer.invoke('shell:openPath', p),
    openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url)
  }
});

const { contextBridge, ipcRenderer } = require('electron');

const label = process.argv.find((arg) => arg.startsWith('--desksprite-label='))?.split('=')[1] ?? 'pet';

contextBridge.exposeInMainWorld('deskSprite', {
  label,
  invoke(command, args) {
    return ipcRenderer.invoke('desksprite:invoke', command, args ?? {});
  },
  emit(channel, payload) {
    return ipcRenderer.invoke('desksprite:emit', channel, payload);
  },
  async listen(channel, callback) {
    const listener = (_event, payload) => callback({ event: channel, payload });
    ipcRenderer.on(`desksprite:event:${channel}`, listener);
    return () => ipcRenderer.removeListener(`desksprite:event:${channel}`, listener);
  },
  window: {
    outerPosition() {
      return ipcRenderer.invoke('desksprite:window', 'outerPosition');
    },
    outerSize() {
      return ipcRenderer.invoke('desksprite:window', 'outerSize');
    },
    setPosition(position) {
      return ipcRenderer.invoke('desksprite:window', 'setPosition', position);
    },
    setSize(size) {
      return ipcRenderer.invoke('desksprite:window', 'setSize', size);
    },
    async onMoved(callback) {
      const listener = () => callback();
      ipcRenderer.on('desksprite:window:moved', listener);
      return () => ipcRenderer.removeListener('desksprite:window:moved', listener);
    },
  },
  currentMonitor() {
    return ipcRenderer.invoke('desksprite:current-monitor');
  },
  openDialog(options) {
    return ipcRenderer.invoke('desksprite:open-dialog', options ?? {});
  },
  convertFileSrc(path) {
    return `desksprite-file:///${encodeURIComponent(path)}`;
  },
});

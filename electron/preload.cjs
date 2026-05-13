const { contextBridge, ipcRenderer } = require('electron');

const label = process.argv.find((arg) => arg.startsWith('--deskcat-label='))?.split('=')[1] ?? 'pet';

contextBridge.exposeInMainWorld('deskCat', {
  label,
  invoke(command, args) {
    return ipcRenderer.invoke('deskcat:invoke', command, args ?? {});
  },
  emit(channel, payload) {
    return ipcRenderer.invoke('deskcat:emit', channel, payload);
  },
  async listen(channel, callback) {
    const listener = (_event, payload) => callback({ event: channel, payload });
    ipcRenderer.on(`deskcat:event:${channel}`, listener);
    return () => ipcRenderer.removeListener(`deskcat:event:${channel}`, listener);
  },
  window: {
    outerPosition() {
      return ipcRenderer.invoke('deskcat:window', 'outerPosition');
    },
    outerSize() {
      return ipcRenderer.invoke('deskcat:window', 'outerSize');
    },
    setPosition(position) {
      return ipcRenderer.invoke('deskcat:window', 'setPosition', position);
    },
    setSize(size) {
      return ipcRenderer.invoke('deskcat:window', 'setSize', size);
    },
    async onMoved(callback) {
      const listener = () => callback();
      ipcRenderer.on('deskcat:window:moved', listener);
      return () => ipcRenderer.removeListener('deskcat:window:moved', listener);
    },
  },
  currentMonitor() {
    return ipcRenderer.invoke('deskcat:current-monitor');
  },
  openDialog(options) {
    return ipcRenderer.invoke('deskcat:open-dialog', options ?? {});
  },
  convertFileSrc(path) {
    return `deskcat-file:///${encodeURIComponent(path)}`;
  },
});

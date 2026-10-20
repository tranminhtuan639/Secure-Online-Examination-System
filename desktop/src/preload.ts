import { contextBridge } from 'electron';

// Chỉ expose đúng những gì renderer cần. Thêm IPC tối thiểu ở đây khi làm secure mode.
contextBridge.exposeInMainWorld('desktop', {
  isDesktop: true,
});

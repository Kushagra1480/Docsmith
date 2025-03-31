const {app, BrowserWindow, Menu} = require('electron')
const path = require('path')
const isDev = require('electron-is-dev')

let mainWindow

function createWindow(){
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false,
        },
      });
    
      mainWindow.loadURL(
        isDev 
          ? 'http://localhost:3000' 
          : `file://${path.join(__dirname, './build/index.html')}`
      );
    
      if (isDev) {
        mainWindow.webContents.openDevTools();
      }
    
      mainWindow.on('closed', () => (mainWindow = null));
    
      createMenu();
}

function createMenu(){
    const template = [
        {
          label: 'File',
          submenu: [
            {
              label: 'New Document',
              accelerator: 'CmdOrCtrl+N',
              click() {
                mainWindow.webContents.send('new-document');
              }
            },
            { type: 'separator' },
            {
              label: 'Exit',
              accelerator: 'CmdOrCtrl+Q',
              click() {
                app.quit();
              }
            }
          ]
        },
        {
          label: 'Edit',
          submenu: [
            { role: 'undo' },
            { role: 'redo' },
            { type: 'separator' },
            { role: 'cut' },
            { role: 'copy' },
            { role: 'paste' },
            { role: 'delete' },
            { role: 'selectAll' }
          ]
        },
        {
          label: 'View',
          submenu: [
            { role: 'reload' },
            { role: 'forceReload' },
            { role: 'toggleDevTools' },
            { type: 'separator' },
            { role: 'resetZoom' },
            { role: 'zoomIn' },
            { role: 'zoomOut' },
            { type: 'separator' },
            { role: 'togglefullscreen' }
          ]
        }
      ];
    
      const menu = Menu.buildFromTemplate(template);
      Menu.setApplicationMenu(menu);
}

app.on('ready', createWindow)

app.on('window-all-closed', ()=>{
    if (process.platform !== 'darwin') {
        app.quit();
      }
})

app.on('activate', ()=> {
    if (mainWindow === null) {
        createWindow();
      }
})
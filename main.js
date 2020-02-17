const { app, BrowserWindow, Menu, MenuItem } = require('electron')

const top_menu = [
    {
       label: 'Configure',
       submenu: [
          {
            label: 'Reset Ethernet Defaults'
          },
          {
            label: 'Set Deluxe Unit Output Defaults'
          },
          {
             type: 'separator'
          },
          {
            label: 'Set Unit to Current Time'
          },
          {
            label: 'Set Deluxe Unit to Basic Unit'
          },
          {
            label: 'Set Line Count'
          },
          {
             type: 'separator'
          },
          {
            label: 'Set Duplicate Call Records'
          },
          {
            type: 'separator'
          },
          {
            label: 'Listening Port'
          },
       ],
    },
    {
      label: 'Tools',
       submenu: [
         {
           label: 'Computer MAC / IP Address'
         },
         {
           label: 'Ping'
         },
         {
            type: 'separator'
         },
         {
           label: 'Setup Uni-cast'
         },
         {
           type: 'separator'
         },
         {
           label: 'Start Logging Call Records'
         }
       ]
    },
    {
      label: 'Help',
       submenu: [
         {
           label: 'Change Log'
         },
         {
           label: 'Bound Status'
         }
       ]
    }
 ];

function createWindow () {
  
    // Create the browser window.
    let win = new BrowserWindow({
    width: 1000,
    minWidth: 1000,
    maxWidth: 1000,
    height: 770,
    minHeight: 790,
    maxHeight: 790,
    fullscreenable: false,
    maximizable: false,
    webPreferences: {
      nodeIntegration: true
    }
  });

  // and load the index.html of the app.
  win.loadFile('frmMain.html');
  
  // Uncomment below for JS debugging
  win.webContents.openDevTools()

}

const app_top_menu = Menu.buildFromTemplate(top_menu);
Menu.setApplicationMenu(app_top_menu);
app.whenReady().then(createWindow);
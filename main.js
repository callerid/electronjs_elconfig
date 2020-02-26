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
            label: 'Set Line Count',
            click(item, focused_window){
              focused_window.webContents.executeJavaScript("open_line_count()");
            }
          },
          {
             type: 'separator'
          },
          {
            label: 'Set Duplicate Call Records',
            click(item, focused_window){
              focused_window.webContents.executeJavaScript("open_duplicates()");
            }
          },
          {
            type: 'separator'
          },
          {
            label: 'Listening Port',
            click(item, focused_window){
              focused_window.webContents.executeJavaScript("open_listening_port()");
            }
          },
       ],
    },
    {
      label: 'Tools',
       submenu: [
         {
           label: 'Computer MAC / IP Address',
           click(item, focused_window){
             focused_window.webContents.executeJavaScript("open_computer_info()");
           }
         },
         {
           label: 'Ping',
           click(item, focused_window){
            focused_window.webContents.executeJavaScript("open_ping()");
          }
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
];

function createWindow () {
  
    // Create the browser window.
    let win = new BrowserWindow({
    title: 'ELConfig 5 v.0.0.1',
    width: 1000,
    minWidth: 1000,
    maxWidth: 1000,
    height: 690,
    minHeight: 690,
    maxHeight: 690,
    fullscreenable: false,
    maximizable: false,
    webPreferences: {
      nodeIntegration: true
    }
  });

  // and load the index.html of the app.
  win.loadFile('frmMain.html');
  
  // Uncomment below for JS debugging
  //win.webContents.openDevTools()

}

const app_top_menu = Menu.buildFromTemplate(top_menu);
Menu.setApplicationMenu(app_top_menu);
app.whenReady().then(createWindow);
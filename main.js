const { app, BrowserWindow, Menu, MenuItem } = require('electron')
const this_os = require('process').platform;

function createWindow () {

    // Create the browser window.
    var win;
    if(this_os == "darwin")
    {
      win = new BrowserWindow({
        title: 'ELConfig 5m',
        width: 1000,
        minWidth: 1000,
        maxWidth: 1000,
        x: 0,
        y: 0,
        height: 690,
        minHeight: 690,
        maxHeight: 690,
        fullscreenable: false,
        maximizable: false,
        webPreferences: {
          nodeIntegration: true
        }
      });
    }
    else{
      win = new BrowserWindow({
        title: 'ELConfig 5m',
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
    }

  var top_menu_mac = [
    {
      label: 'ELConfig 5m',
      submenu: [
        {
          label: 'Quit',
          role: 'quit'
        }
      ],
    },
    {
      label: 'Configure',
      submenu: [
          {
            label: 'Reset Ethernet Defaults',
            click(item, focused_window){
              focused_window.webContents.executeJavaScript("reset_ethernet_defaults()");
            }
          },
          {
            label: 'Set Deluxe Unit Output Defaults',
            click(item, focused_window){
              focused_window.webContents.executeJavaScript("set_deluxe_unit_output_defaults()");
            }
          },
          {
            type: 'separator'
          },
          {
            label: 'Set Unit to Current Time',
            click(item, focused_window){
              focused_window.webContents.executeJavaScript("set_pc_time()");
            }
          },
          {
            label: 'Set Deluxe Unit to Basic Unit',
            click(item, focused_window){
              focused_window.webContents.executeJavaScript("set_deluxe_to_basic()");
            }
          },
          {
            label: 'Set Line Numbers Reported from Unit',
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
            label: 'Uni-cast IP',
            click(item, focused_window){
              focused_window.webContents.executeJavaScript("open_unicast_dialog()");
            }
          },
          {
            type: 'separator'
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
          label: 'Debug Window',
          click(item, focused_window){
            win.webContents.openDevTools();
          }
        },
      ]
    },
  ];

  var top_menu = [
    {
      label: 'Configure',
      submenu: [
          {
            label: 'Reset Ethernet Defaults',
            click(item, focused_window){
              focused_window.webContents.executeJavaScript("reset_ethernet_defaults()");
            }
          },
          {
            label: 'Set Deluxe Unit Output Defaults',
            click(item, focused_window){
              focused_window.webContents.executeJavaScript("set_deluxe_unit_output_defaults()");
            }
          },
          {
            type: 'separator'
          },
          {
            label: 'Set Unit to Current Time',
            click(item, focused_window){
              focused_window.webContents.executeJavaScript("set_pc_time()");
            }
          },
          {
            label: 'Set Deluxe Unit to Basic Unit',
            click(item, focused_window){
              focused_window.webContents.executeJavaScript("set_deluxe_to_basic()");
            }
          },
          {
            label: 'Set Line Numbers Reported from Unit',
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
            label: 'Uni-cast IP',
            click(item, focused_window){
              focused_window.webContents.executeJavaScript("open_unicast_dialog()");
            }
          },
          {
            type: 'separator'
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
          label: 'Debug Window',
          click(item, focused_window){
            win.webContents.openDevTools();
          }
        },
      ]
    },
  ];

  var template_menu;
  if(process.platform == "win32")
  {
    template_menu = Menu.buildFromTemplate(top_menu);
  }
  else
  {
    template_menu = Menu.buildFromTemplate(top_menu_mac);
  }

  Menu.setApplicationMenu(template_menu);
  
  // and load the index.html of the app.
  win.loadFile('frmMain.html');
  
  // Uncomment below for JS debugging
  //win.webContents.openDevTools();

}

app.whenReady().then(createWindow);
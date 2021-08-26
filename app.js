const { app, BrowserWindow, dialog } = require('electron')
const { ipcMain, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const { fileSizeInBytes, appTemporaryDataFolderPath, appDirectoryPathPerOS } = require('./render/js/fileStorageHelper')
const applescript = require('applescript');
const { spawn } = require('child_process');
const { electron } = require('process')


let window = null
var filesToProcess = Array()

let isWin = process.platform === "win32"
var isMac = process.platform === "darwin"
var isLinux = process.platform === "linux"

function createWindow() {
  // Create a new window
  window = new BrowserWindow({
    // Set the initial width to 500px
    width: 650,
    // Set the initial height to 400px
    height: 440,
    minWidth: 650,
    minHeight: 440,
    // set the title bar style
    titleBarStyle: 'default',
    // set the background color to black
    backgroundColor: "#111",
    // Don't show the window until it's ready, this prevents any white flickering
    show: false,
    resizable: true,
    icon: path.join(__dirname, './render/assets/icons/app512.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  window.loadFile(path.resolve(__dirname, './render/html/index.html'))

  window.once('ready-to-show', () => {
    window.show()
  })
}

function showAlert(title, message) {
  const window = BrowserWindow.getFocusedWindow();
  dialog.showMessageBox(window, {
    title: title,
    buttons: ['OK'],
    type: 'warning',
    message: message,
  });
}

function removeFile(path) {
  fs.rmSync(path, {
    force: true,
  });
}

app.whenReady().then(createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the 
  // app when the dock icon is clicked and there are no 
  // other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

ipcMain.on('app:get-files', (event, args) => {
  event.sender.send('getFilesUpdateReply', filesToProcess);
})

ipcMain.on('app:on-file-delete', (event, arg) => {
  filesToProcess = filesToProcess.filter(function (element) {
    return element.name != arg.name;
  })
  event.sender.send('getFilesUpdateReply', filesToProcess);
})

ipcMain.on('choose-file-action', (event, arg) => {

  let types = [{ name: 'All Files', extensions: ['txt', 'gpg'] }]
  dialog.showOpenDialog({
    filters: types,
    properties: ['openFile', 'multiSelections']
  }).then(paths => {
    if (paths !== undefined) {
      paths.filePaths.forEach(element => {
        var filename = element.replace(/^.*[\\\/]/, '')
        filesToProcess.push({
          name: filename,
          path: element,
          size: fileSizeInBytes(element)
        })
      });
      event.sender.send('actionReply', filesToProcess);
    }
  })
})

ipcMain.on('app:on-file-add', (event, args) => {
  filesToProcess.push(...args)
  event.sender.send('drag-on-file-added', filesToProcess)
})

function setupFileWatcher(callback) {
  var chokidar = require("chokidar");

  var watcher = chokidar.watch(appDirectoryPathPerOS(), {
    ignored: /[\/\\]\./,
    persistent: true
  });

  watcher
    .on('add', function (path) {
      console.log('File', path, 'has been added');
      if (path.includes("exec_callback.tmp")
        || path.includes("exec_callback_ue.tmp")) {
          cleanUpTmpFiles()
          removeFile(appDirectoryPathPerOS() + "/gpg_temp_file_params.txt")
          filesToProcess = Array()
        if (isMac) {
          applescript.execString('tell application \"Terminal\" to close first window', (err, rtn) => { })
          shell.showItemInFolder(appDirectoryPathPerOS() + "/output/generated_merged_file.gpg");
        }
        callback()
      }
    })
}

function cleanUpTmpFiles() {
  removeFile(appDirectoryPathPerOS() + "/output/exec_callback.tmp")
  removeFile(appDirectoryPathPerOS() + "/output/exec_callback_ue.tmp")
}

ipcMain.on('merge-file-action', (event, arg) => {
  try {
    if (filesToProcess != undefined
      && filesToProcess.length > 0) {

      setupFileWatcher(function callback() {
        event.sender.send("fileMergeReply", filesToProcess)
      })
      cleanUpTmpFiles()

      let paramsTextFilePath = appTemporaryDataFolderPath('', "gpg_temp_file_params.txt")

      if (paramsTextFilePath !== null) {
        for (let index = 0; index < filesToProcess.length; index++) {
          const element = filesToProcess[index];
          fs.appendFileSync(paramsTextFilePath, element.path + "\n");
        }

        var p = path.join(__dirname, '/resources/gpg_merger.sh '
          + "\'" + paramsTextFilePath + "\'"
          + " "
          + "\'" + appDirectoryPathPerOS() + "\'"
          + '"'
        );

        if (isMac) {
          p = p.replaceAll("Application Support", "App_Supp_Folder");
          const script = 'tell application \"Terminal\" to do script "' + p
          applescript.execString(script, (err, rtn) => {
            if (err) {
              showAlert("Error", err.message)
              cleanUpTmpFiles()
            }
          });
        } else if (isLinux) {
          spawn(p)
        } else if (isWin) {
          //TODO: Windows 10+ handling
        }
      }
    }
  } catch (error) {
    console.log("error: => " + error);
  }
})

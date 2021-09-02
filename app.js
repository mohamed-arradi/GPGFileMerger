const { app, BrowserWindow, dialog } = require('electron')
const { ipcMain, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const { fileSizeInBytes, appTemporaryDataFolderPath, appDirectoryPathPerOS } = require('./render/js/fileStorageHelper')
const prompt = require('electron-prompt');
const gpg = require('gpg')
const ProgressBar = require('electron-progressbar');
const open = require("open");

let window = null
var filesToProcess = Array()

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
    autoHideMenuBar: true,
    // Don't show the window until it's ready, this prevents any white flickering
    show: false,
    resizable: true,
    icon: path.join(__dirname, './render/assets/icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      spellcheck: false
    }
  })

  window.loadFile(path.resolve(__dirname, './render/html/index.html'))
  window.once('ready-to-show', () => {
    window.show()
  })


  const staticLinkHandleRedirect = (e, url) => {
    if (url !== e.sender.getURL()) {
      e.preventDefault()
      open(url)
    }
  }
  window.webContents.on('will-navigate', staticLinkHandleRedirect)
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

function addFiles(filePaths) {
  for (let index = 0; index < filePaths.length; index++) {
    const element = filePaths[index];
    var filename = element.replace(/^.*[\\\/]/, '')
    const fileExistAlready = filesToProcess.filter(file =>
      file.name === filename
      && file.path === element)
    if (fileExistAlready.length == 0) {
      filesToProcess.push({
        name: filename,
        path: element,
        size: fileSizeInBytes(element)
      })
    }
  }
}

async function promptRequirement(title, label) {

  return new Promise(function (resolve, reject) {
    prompt({
      title: title,
      label: label,
      value: '',
      inputAttrs: {
        type: 'text'
      },
      type: 'input'
    })
      .then((r) => {
        if (r === null) {
          resolve({ response: null, cancelled: true })
        } else {
          if (r.length > 0) {
            resolve({ response: r, cancelled: false })
          } else {
            resolve({ response: null, cancelled: false })
          }
        }
      })
      .catch({ response: null, cancelled: false });
  })
}

////////////////////////////// APP LIFE CYCLE /////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////

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

  let types = [{ name: 'All Files', extensions: ['gpg'] }]
  dialog.showOpenDialog({
    filters: types,
    properties: ['openFile', 'multiSelections']
  }).then(paths => {
    if (paths !== undefined) {
      addFiles(paths.filePaths)
      event.sender.send('actionReply', filesToProcess);
    }
  })
})

ipcMain.on('app:on-file-add', (event, args) => {
  if (args !== null) {
    for (let i = 0; i < args.length; i++) {
      const fileExistAlready = filesToProcess.filter(file =>
        file.name === args[i].name
        && file.path === args[i].path)
      if (fileExistAlready.length == 0) {
        filesToProcess.push(args[i])
      }
    }
  }
  event.sender.send('drag-on-file-added', filesToProcess)
})

ipcMain.on('merge-file-action', (event, arg) => {
  try {
    if (filesToProcess != undefined
      && filesToProcess.length > 0) {

      let folderPath = appDirectoryPathPerOS() + "/output"
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath)
      }

      promptRequirement("Encryption UID Request",
        'Please enter your gpg uid (to encrypt files)')
        .then(function (data) {
          if (data.cancelled == false
            && data.response !== null) {
            let resultTextFilePath = appTemporaryDataFolderPath('', "/output/encypted_files_result.txt.gpg")
            let tempTextFilePath = appTemporaryDataFolderPath('', "/output/temp_merged_file.txt")
            let uid = data.response
            var errors = Array()

            var progressBar = new ProgressBar({
              text: 'Processing data...',
              detail: 'Wait...'
            });

            progressBar
              .on('completed', function () {
                console.info(`completed...`);
                progressBar.detail = 'Task completed. Exiting...';
              })
              .on('aborted', function () {
                console.info(`aborted...`);
              });

            const decryptFilesProcess = new Promise((resolve, reject) => {
              for (let fileIndex = 0; fileIndex < filesToProcess.length; fileIndex++) {
                let file = filesToProcess[fileIndex]
                var inStream = fs.createReadStream(file.path);
                gpg.decryptStream(inStream,
                  ['--recipient', uid, '--trust-model', 'always'], function (err, res) {
                    if (err) {
                      errors.push(err.message)
                    } else {
                      fs.appendFileSync(tempTextFilePath, "### BEGIN " + file.name + "### \n");
                      fs.appendFileSync(tempTextFilePath, res.toString() + "\n");
                      fs.appendFileSync(tempTextFilePath, "### END " + file.name + "### \n");
                    }
                    if (fileIndex === filesToProcess.length - 1) {
                      resolve({ filePath: tempTextFilePath, errors: errors })
                    }
                  });
              }
            }).catch((error) => {
              progressBar.setCompleted()
              showAlert("Error", "An error during decryption occured.")
            })

            decryptFilesProcess.then((response) => {
              if (response.errors.length === 0
                && response.filePath !== undefined) {
                gpg.callStreaming(tempTextFilePath, resultTextFilePath, ['--encrypt', '-r' + uid], function (err, res) {
                  if (err === null) {
                    if (fs.existsSync(tempTextFilePath)) {
                      fs.unlinkSync(tempTextFilePath)
                    }
                    progressBar.setCompleted()
                    filesToProcess = Array()
                    event.sender.send("fileMergeReply", filesToProcess)
                    shell.showItemInFolder(resultTextFilePath)

                  } else {
                    progressBar.setCompleted()
                    showAlert("Error", err.message)
                  }
                })
              } else {
                progressBar.setCompleted()
                showAlert("Error", response.errors.join("\n"))
              }
            })
          } else {
            if (data.cancelled == false) {
              showAlert("Error", "uid cannot be empty.")
            }
          }
        })
    }
  } catch (error) {
    showAlert("Error", "An error occured: " + error.message)
  }
})

////////////////////////////// END APP LIFE CYCLE /////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////

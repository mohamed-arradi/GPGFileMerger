const { app, BrowserWindow, dialog } = require('electron')
const { ipcMain, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const { fileSizeInBytes, appTemporaryDataFolderPath, appDirectoryPathPerOS } = require('./render/js/fileStorageHelper')
const prompt = require('electron-prompt');
const gpg = require('gpg')
const makeSynchronous = require('make-synchronous');
const ProgressBar = require('electron-progressbar');

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
    icon: path.join(__dirname, './render/assets/icotMOi en tn.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  window.loadFile(path.resolve(__dirname, './render/html/index.html'))

  window.once('ready-to-show', () => {
    window.show()
  })

  const handleRedirect = (e, url) => {
    if (url !== e.sender.getURL()) {
      e.preventDefault()
      shell.openExternal(url)
    }
  }
  window.webContents.on('will-navigate', handleRedirect)
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

  let types = [{ name: 'All Files', extensions: ['gpg'] }]
  dialog.showOpenDialog({
    filters: types,
    properties: ['openFile', 'multiSelections']
  }).then(paths => {
    if (paths !== undefined) {
      paths.filePaths.forEach(element => {
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
      });
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
            if (data.cancelled == false && data.response !== "") {

              let resultTextFilePath = appTemporaryDataFolderPath('', "/output/encypted_files_result.txt.gpg")
              let tmp_file = appTemporaryDataFolderPath('', "/output/temp_merged_file.txt")
      
              const fn = makeSynchronous(async (files,tempTextFilePath,uid)  => {
                var fs = require('fs')
                var gpg = require('gpg')
                var errors = Array()

                for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
                  let file = files[fileIndex]
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
                    });
                }
                return errors.length > 0 ? errors : null
            });
              
            var progressBar = new ProgressBar({
              text: 'Processing data...',
              detail: 'Wait...'
            });
            
            progressBar
              .on('completed', function() {
                console.info(`completed...`);
                progressBar.detail = 'Task completed. Exiting...';
              })
              .on('aborted', function() {
                console.info(`aborted...`);
              });
            
              let errorsDecrypt = fn(filesToProcess, tmp_file, data.response)

              setTimeout(function() {
                progressBar.setCompleted();
              }, 12000);

              if (errorsDecrypt === null) {
              progressBar.setCompleted();
              const fn2 = makeSynchronous(async (tmp_file,resultFilePath,uid)  => { 
                var gpg = require('gpg')
                var fs = require('fs')
                var error = null
                gpg.callStreaming(tmp_file, resultFilePath, ['--encrypt', '-r' + uid], function (err, res) {
                  if (err !== null) {
                    error = err
                  }
                });

                return error
              })
            
              let error = fn2(tmp_file, resultTextFilePath, data.response);

              if (error === null) {
              if(fs.existsSync(tmp_file)) {
                fs.unlinkSync(tmp_file)
              }
              shell.showItemInFolder(resultTextFilePath)
            }
          } else {
            showAlert("Error", errorsDecrypt.join("\n"))
          }
          }
        })
  }
  } catch (error) {
    console.log("error: => " + error);
  }
})

async function decryptFiles(files, tempTextFilePath, uid) {
  for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
    let file = files[fileIndex]
    var inStream = fs.createReadStream(file.path);
    gpg.decryptStream(inStream,
      ['--recipient', uid, '--trust-model', 'always'], function (err, res) {
        console.log("titi");
        if (err) {
        //  errors.push(err.message)
        } else {
          fs.appendFileSync(tempTextFilePath, "### BEGIN " + file.name + "### \n");
          fs.appendFileSync(tempTextFilePath, res.toString() + "\n");
          fs.appendFileSync(tempTextFilePath, "### END " + file.name + "### \n");
        }
      });
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
            resolve({ response: false, cancelled: false })
          }
        }
      })
      .catch({ response: null, cancelled: false });
  })
}

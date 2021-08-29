          const { app, BrowserWindow, dialog} = require('electron')
          const { ipcMain, shell } = require('electron')
          const path = require('path')
          const fs = require('fs')
          const { fileSizeInBytes, appTemporaryDataFolderPath, appDirectoryPathPerOS } = require('./render/js/fileStorageHelper')
          const applescript = require('applescript');
          const { spawnSync } = require("child_process");
          const terms = [ "gnome-terminal", "konsole", "mate-terminal"];
          const prompt = require('electron-prompt');
          const { decrypt } = require('exec-pgp')
          const gpg = require('gpg')

          var terminal = null;
          let window = null
          var filesToProcess = Array()

          let isWin = process.platform === "win32"
          var isMac = process.platform === "darwin"
          var isLinux = process.platform === "linux"

          function chooseTerminalForUnix() {
          if (isLinux) {
            for (let i = 0; i < terms.length; i++) {
                which = spawnSync ("which", [terms[i]], {
                  shell:true
                });
                if (which.status !== null && which.status === 0) { // Command found
                    terminal = terms[i];
                    break;
                }
            }
            if (terminal === null) terminal = "xterm";
          } else if (isWin) {
            terminal = "cmd";
          }
          }

          chooseTerminalForUnix()

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
              for(let i = 0; i < args.length; i++) {
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

          function setupFileWatcher(callback) {
            var chokidar = require("chokidar");

            var watcher = chokidar.watch(appDirectoryPathPerOS(), {
              ignored: /[\/\\]\./,
              persistent: true
            });

            watcher
              .on('add', function (path) {
                if (path.includes("exec_callback.tmp")
                  || path.includes("exec_callback_ue.tmp")) {
                    cleanUpTmpFiles()
                    removeFile(appDirectoryPathPerOS() + "/gpg_temp_file_params.txt")
                    if (path.includes("exec_callback_ue")) {
                      showAlert("Error", "Encryption failed. Please verify that your uid (email usually) is correct")
                      callback(false)
                    } else {
                      filesToProcess = Array()
                      if (isMac) {
                        applescript.execString('tell application \"Terminal\" to close first window', (err, rtn) => { })
                        shell.showItemInFolder(appDirectoryPathPerOS() + "/output/generated_merged_file.gpg");
                      }
                      callback(true)
                    }
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
                  if (isMac) {
                    setupFileWatcher(function callback(success) {
                      event.sender.send("fileMergeReply", filesToProcess)
                    })
                    cleanUpTmpFiles()
                    let paramsTextFilePath = appTemporaryDataFolderPath('', "gpg_temp_file_params.txt")
  
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
                    p = p.replaceAll("Application Support", "App_Supp_Folder");
                    const script = 'tell application \"Terminal\" to do script "' + p
                    applescript.execString(script, (err, rtn) => {
                      if (err) {
                        showAlert("Error", err.message)
                        cleanUpTmpFiles()
                      }
                    });
                  } else if (isLinux) {
                  let folderPath = appDirectoryPathPerOS() + "/output"

                  if (!fs.existsSync(folderPath)) {
                    fs.mkdirSync(folderPath)
                }
                  let tempTextFilePath = appTemporaryDataFolderPath('', "/output/temp_merged_file.txt")
                  let errors = Array()

                    promptRequirement("Encryption UID Request", 
                    'Please enter your gpg uid (to encrypt files)')
                    .then(function(data) { 

                      for(let fileIndex = 0; fileIndex < filesToProcess.length; fileIndex++) {
                        let file = filesToProcess[fileIndex]
                      decrypt(file.path, (e, result) => {
                        if (e) {
                          errors.push(e.message)
                        } else {
                          fs.appendFileSync(tempTextFilePath, "### BEGIN " + file.name + "### \n");
                          fs.appendFileSync(tempTextFilePath, result.output + "\n");
                          fs.appendFileSync(tempTextFilePath, "### END " + file.name + "### \n");
                          if (fileIndex === filesToProcess.length - 1) {
                            const dateFormat = require('dateformat');
                            fs.appendFileSync(tempTextFilePath, "Latest modification: " + dateFormat(new Date(), "dd-mm-yyyy hh:MM:ss") + "### \n");
                          }
                        }
                      })
                      }


                  if (errors.length == 0) {
                    let destinationFile = appDirectoryPathPerOS() + '/output/generated_gpg_merged.txt.gpg'
                    
                      gpg.callStreaming(
                        tempTextFilePath, 
                        destinationFile, 
                        ['--recipient=' + data.response, '--encrypt'],
                        function(err) {
                          fs.unlinkSync(tempTextFilePath)
                          if (err !== null) {
                            console.error('There was an error reading the file!', err);
                            showAlert("Error", "There was an error while encrypting the generated file!")
                          } else {
                            shell.showItemInFolder(destinationFile);
                          }
                        }
                      );
                  } else {
                    showAlert("Error", errors.join("\n"))
                  }
                  })
                  } else if (isWin) {
                    //TODO: Windows 10+ handling
                  }
                }
            } catch (error) {
              console.log("error: => " + error);
            }
          })

          function promptRequirement(title, label) {

            return new Promise(function(resolve, reject) {
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
                if(r === null) {
                    resolve({response: null, cancelled: true})
                } else {
                    if (r.length > 0) {
                      resolve({response: r, cancelled: false})
                    } else {
                      resolve({response: false, cancelled: false})
                    }
                }
            })
            .catch({response: null, cancelled: false});
            })
          }

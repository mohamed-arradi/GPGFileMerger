
const fs = require('fs')
const path = require('path')

exports.fileSizeInBytes = function fileSizeInBytes(filepath) {
    var stats = fs.statSync(filepath);
    var fileSizeInBytes = stats.size;
    return bytesToSize(fileSizeInBytes);
}

function bytesToSize(bytes) {
    var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes == 0) return '0 Byte';
    var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
 }

exports.escapeSpaceIfNeeded = function escapeSpaceIfNeeded(pathFile) {
    return pathFile.replace(/(\s+)/g, '\\$1')
}

exports.appDirectoryPathPerOS = function appDirectoryPathPerOS() {
    return getAppDataPath()
}

function getAppDataPath() {
    switch (process.platform) {
      case "darwin": {
        var p = path.join(process.env.HOME, "Library", "Application Support", "GPGFileMerger")
        return p
      }
      case "win32": {
        var p = path.join(process.env.APPDATA, "GPGFileMerger")
        return p
      }
      case "linux": {
        var p = path.join(process.env.HOME, "GPGFileMerger")
        return p
      }
      default: {
        console.log("Unsupported platform!");
      }
    }
  }
  
  
  exports.appTemporaryDataFolderPath = function saveAppData(content, filename) {
    const appDataDirPath = getAppDataPath()
  
      if (!fs.existsSync(appDataDirPath)) {
          fs.mkdirSync(appDataDirPath)
      }

      const appDataFilePath = path.join(appDataDirPath, "/" + filename)
      try {
        fs.writeFileSync(appDataFilePath, content)
        console.log("file saved:" + appDataFilePath);
        return appDataFilePath
    } catch(e) {
        console.log("There was a problem saving app data! --> " + filename)
        console.error(e)
        return null
  }
}
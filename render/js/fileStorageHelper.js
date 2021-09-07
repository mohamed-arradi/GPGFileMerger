
const fs = require('fs')
const path = require('path')

exports.fileSizeInBytes = function fileSizeInBytes(filepath) {
    var stats = fs.statSync(filepath);
    var fileSizeInBytes = stats.size;
    return bytesToSize(fileSizeInBytes);
}

exports.bytesForFile = function bytesForFile(filepath) {
  var stats = fs.statSync(filepath);
  return stats.size;
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
      case "linux": {
        var p = path.join(process.env.HOME, "GPGFileMerger")
        return p
      }
      default: {
        return ""
      }
    }
  }
  

exports.appTemporaryDataFolderPath = function saveAppData(content, dirPath, filename) {

      if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath)
      }

      const appDataFilePath = path.join(dirPath, filename)
      try {
        fs.writeFileSync(appDataFilePath, content)
        return appDataFilePath
    } catch(e) {
        console.error(e)
        return null
  }
}
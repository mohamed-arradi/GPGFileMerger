
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
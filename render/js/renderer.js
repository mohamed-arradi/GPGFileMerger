var ipcRenderer = require('electron').ipcRenderer;
const dragDrop = require('drag-drop');
const { fileSizeInBytes } = require('./fileStorageHelper.js')

ipcRenderer.once('getFilesUpdateReply', (event, files) => {
    displayFiles(files);
})
ipcRenderer.send('app:get-files')

function openDialogFile() {
    ipcRenderer.once('actionReply', (event, files) => {
        displayFiles(files)
    })
    ipcRenderer.send('choose-file-action');
}

function mergeFiles() {
    ipcRenderer.once('fileMergeReply', (event, files) => {
        displayFiles(files);
    })
    ipcRenderer.send('merge-file-action');
}

// add files drop listener
dragDrop('#uploader', (files) => {
    const _files = files.map(file => {
        return {
            name: file.name,
            path: file.path,
            size: fileSizeInBytes(file.path)
        };
    });

    ipcRenderer.once('drag-on-file-added', (event, files) => {
        displayFiles(files);
    })
    ipcRenderer.send('app:on-file-add', _files);
});

function deleteFile(fileName) {
    const itemNode = document.getElementById(fileName);
    const filepath = itemNode.getAttribute('data-filepath');

    ipcRenderer.once('getFilesUpdateReply', (event, files) => {
        displayFiles(files);
    })
    // send event to the main thread
    ipcRenderer.send('app:on-file-delete', { name: fileName, filepath });
}

function displayFiles(files = []) {
    const fileListElem = document.getElementById('filelist');
    fileListElem.innerHTML = '';

    if (files.length > 0) {
        const mergeButtonDomElem = document.createElement('div');
        mergeButtonDomElem.innerHTML = ` 
        <div class='app__uploader__button-area'>
         <button class='app__merger__button-area__button' onclick='mergeFiles()'>Merge Files Content</button>
        </div>
        `
        fileListElem.appendChild(mergeButtonDomElem)
    }

    files.forEach(file => {
        const itemDomElem = document.createElement('div');
        itemDomElem.setAttribute('id', file.name); // set `id` attribute
        itemDomElem.setAttribute('class', 'app__files__item'); // set `class` attribute
        itemDomElem.setAttribute('data-filepath', file.path); // set `data-filepath` attribute

        itemDomElem.innerHTML = `
            <div class='app__files__item__info'>
                <p class='app__files__item__info__name'><img src="../assets/document-svgrepo.svg" width="24px"></img> ${file.name}</p>
                <p class='app__files__item__info__size'>${file.path}</p>
                <p class='app__files__item__info__size'>Size: ${file.size}</p>
            </div>
            <img onclick='deleteFile("${file.name}")' src='../assets/delete-svgrepo-com.svg' class='app__files__item__delete'/>
        `;
        fileListElem.appendChild(itemDomElem);
    });
}
var msi = require('electron-wix-msi-custom');
 
// Step 1: Instantiate the MSICreator
const msiCreator = new msi.MSICreator({
  appDirectory: '.',
  description: 'GPG File Merger',
  exe: 'gpgmerger',
  name: 'GPG File Merger',
  manufacturer: 'Arradi-Alaoui Mohamed',
  version: "0.0.1",
  outputDirectory: './output',
  ui: true,
  outputDirectory: '/path/to/output/folder',
  extensions: ['WixUtilExtension'] // option for launch application after install
});
 
async function onBuild() {
    // Step 2: Create a .wxs template file
    await msiCreator.create();
    // Step 3: Compile the template to a .msi file
    await msiCreator.compile();
}
 
onBuild();
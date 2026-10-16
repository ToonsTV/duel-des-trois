'use strict';
/* Protection du jeu installé : on verrouille Electron après la fabrication de chaque version.
   - RunAsNode / options Node / inspecteur désactivés : on ne peut pas piloter ou modifier le jeu depuis la console ;
   - le jeu ne se charge QUE depuis son fichier app.asar ;
   - Windows et macOS : le contenu d'app.asar est contrôlé au démarrage (un fichier modifié empêche le lancement).
   Pour désactiver temporairement le contrôle d'intégrité en cas de souci : mettre DUEL_NO_INTEGRITY=1 dans le workflow. */
const path = require('path');
const { flipFuses, FuseVersion, FuseV1Options } = require('@electron/fuses');

exports.default = async function afterPack(context) {
  const { electronPlatformName, appOutDir, packager } = context;
  let bin;
  if (electronPlatformName === 'darwin') bin = path.join(appOutDir, `${packager.appInfo.productFilename}.app`);
  else if (electronPlatformName === 'win32') bin = path.join(appOutDir, `${packager.appInfo.productFilename}.exe`);
  else bin = path.join(appOutDir, packager.executableName);
  const integrity = process.env.DUEL_NO_INTEGRITY !== '1';
  await flipFuses(bin, {
    version: FuseVersion.V1,
    resetAdHocDarwinSignature: electronPlatformName === 'darwin' && context.arch === 3, // Mac Apple Silicon (arm64)
    [FuseV1Options.RunAsNode]: false,
    [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
    [FuseV1Options.EnableNodeCliInspectArguments]: false,
    [FuseV1Options.OnlyLoadAppFromAsar]: true,
    [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: integrity,
    [FuseV1Options.GrantFileProtocolExtraPrivileges]: false
  });
  console.log(`  • protection appliquée (${electronPlatformName}, intégrité ${integrity ? 'activée' : 'désactivée'})`);
};

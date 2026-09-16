const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
// Sem disableHierarchicalLookup: com ele ligado o Metro ignora node_modules
// aninhados, e deps que o npm nao hoista (ex.: buffer dentro de
// whatwg-url-without-unicode) somem do bundle conforme o layout do install.
config.resolver.sourceExts.push('sql');

// So no bundle de release. O gradle chama `expo export:embed` com a entrada
// relativa a app/mobile ("./index.ts"), mas o Metro usa a raiz do monorepo
// como server root e procura "../../index.ts". Fixar o server root no app
// resolve o release, mas quebra o dev server: o Expo CLI monta a URL do
// bundle a partir da raiz (/app/mobile/index.ts.bundle) e o Metro passaria a
// resolver a partir de app/mobile -> 404. Por isso a condicao.
if (process.argv.includes('export:embed')) {
  config.server = { ...config.server, unstable_serverRoot: projectRoot };
}

module.exports = config;

const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// mobile/ lives inside the bizitalk web app's own npm project (a plain
// nested folder, not an npm/yarn workspace), which has its own
// node_modules with a different React version. Metro's default
// hierarchical lookup would otherwise walk up and find that node_modules
// too, risking two copies of React/React Native getting bundled together.
// Restricting resolution to this project's own node_modules keeps it to
// exactly one copy of everything.
config.resolver.disableHierarchicalLookup = true;
config.resolver.nodeModulesPaths = [`${__dirname}/node_modules`];

module.exports = config;

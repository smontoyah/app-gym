// Metro config que extiende la configuración de Expo.
// Crear este archivo elimina la advertencia de expo-doctor y garantiza que
// Metro use el resolver/transformer de Expo (worklets de Reanimated, etc.).
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

module.exports = config;

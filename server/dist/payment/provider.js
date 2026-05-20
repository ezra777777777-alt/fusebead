"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerProvider = registerProvider;
exports.getProvider = getProvider;
const providers = {};
function registerProvider(provider) {
    providers[provider.name] = provider;
}
function getProvider(name) {
    return providers[name] || null;
}

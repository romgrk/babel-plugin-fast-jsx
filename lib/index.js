"use strict";
/* eslint-disable @babel/development/plugin-name */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const create_plugin_1 = __importDefault(require("./create-plugin"));
exports.default = (0, create_plugin_1.default)({
    name: 'fast-jsx',
    development: false,
});

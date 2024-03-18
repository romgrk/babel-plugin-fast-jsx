import { types as t } from "@babel/core";
import type { PluginPass } from "@babel/core";
export interface Options {
    filter?: (node: t.Node, pass: PluginPass) => boolean;
    importSource?: string;
    pragma?: string;
    pragmaFrag?: string;
    pure?: string;
    runtime?: "automatic" | "classic";
    throwIfNamespace?: boolean;
    useBuiltIns: boolean;
    useSpread?: boolean;
}
export default function createPlugin({ name, development, }: {
    name: string;
    development: boolean;
}): any;

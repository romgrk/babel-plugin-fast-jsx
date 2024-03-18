"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-ignore todo
const helper_plugin_utils_1 = require("@babel/helper-plugin-utils");
const core_1 = require("@babel/core");
const helper_module_imports_1 = require("@babel/helper-module-imports");
// Result
// ======
//
// import { react as __react } from 'react'
// const __react_ElementType = Symbol.for('react.element');
// const __react_CurrentOwner = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner;
// function _fastJsx(type, key, ref, props) {
//   return {
//     $$typeof: __react_ElementType,
//     type,
//     key,
//     ref,
//     props,
//     _owner: __react_CurrentOwner.current
//   };
// }
const PLUGIN_NAME = 'babel-plugin-fast-jsx';
const get = (pass, name) => pass.get(`@babel/plugin-react-jsx/${name}`);
const set = (pass, name, v) => pass.set(`@babel/plugin-react-jsx/${name}`, v);
const EMPTY_STATE = {
    jsxIdentifier: null,
    jsxsIdentifier: null,
    reactIdentifier: null,
    reactElementTypeIdentifier: '__react_ElementType',
    reactOwnerIdentifier: '__react_CurrentOwner',
    needsPrelude: false,
    lastImport: null,
};
function createPlugin({ name, development, }) {
    return (0, helper_plugin_utils_1.declare)((_, options) => {
        // const {
        //   pure: PURE_ANNOTATION,
        //   throwIfNamespace = true,
        //   filter,
        //   runtime: RUNTIME_DEFAULT = "automatic",
        //   importSource: IMPORT_SOURCE_DEFAULT = DEFAULT.importSource,
        //   pragma: PRAGMA_DEFAULT = DEFAULT.pragma,
        //   pragmaFrag: PRAGMA_FRAG_DEFAULT = DEFAULT.pragmaFrag,
        // } = options;
        const { useSpread = false, useBuiltIns = true } = options;
        const extendName = useBuiltIns ? 'Object.assign' : '_extend';
        const extendExpression = toMemberExpression(extendName);
        let source = '';
        return {
            name,
            // inherits: jsx,
            visitor: {
                Program: {
                    enter(path, pass) {
                        // let runtime: string = RUNTIME_DEFAULT;
                        // let source: string = IMPORT_SOURCE_DEFAULT;
                        // let pragma: string = PRAGMA_DEFAULT;
                        // let pragmaFrag: string = PRAGMA_FRAG_DEFAULT;
                        // let sourceSet = !!options.importSource;
                        // let pragmaSet = !!options.pragma;
                        // let pragmaFragSet = !!options.pragmaFrag;
                        source = path.getSource();
                        const state = { ...EMPTY_STATE };
                        pass.set(PLUGIN_NAME, state);
                    },
                    exit(_path, pass) {
                        var _a;
                        const state = pass.get(PLUGIN_NAME);
                        if (state.needsPrelude) {
                            const needReactImport = state.reactIdentifier === null;
                            const reactIdentifier = (_a = state.reactIdentifier) !== null && _a !== void 0 ? _a : '__react';
                            // Insert `const __react_ElementType = Symbol.for('react.element')`
                            state.lastImport.insertAfter(core_1.types.variableDeclaration('var', [
                                core_1.types.variableDeclarator(core_1.types.identifier(state.reactElementTypeIdentifier), core_1.types.callExpression(toMemberExpression('Symbol.for'), [core_1.types.stringLiteral('react.element')]))
                            ]));
                            // Insert `const __react_CurrentOwner = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner`
                            state.lastImport.insertAfter(core_1.types.variableDeclaration('var', [
                                core_1.types.variableDeclarator(core_1.types.identifier(state.reactOwnerIdentifier), toMemberExpression(`${reactIdentifier}.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner`))
                            ]));
                            // Import react if it wasn't already imported
                            if (needReactImport) {
                                const reactImport = core_1.types.importDeclaration([core_1.types.importSpecifier(core_1.types.identifier(reactIdentifier), core_1.types.identifier('react'))], core_1.types.stringLiteral('react'));
                                state.lastImport.insertAfter(reactImport);
                            }
                        }
                    },
                },
                ImportDeclaration(path, pass) {
                    const state = pass.get(PLUGIN_NAME);
                    const { node } = path;
                    if (node.source.value === 'react/jsx-runtime') {
                        node.specifiers.forEach(spec => {
                            var _a, _b;
                            if (core_1.types.isImportSpecifier(spec) && core_1.types.isIdentifier(spec.imported) &&
                                spec.imported.name === 'jsx') {
                                state.jsxIdentifier = (_a = spec.local.name) !== null && _a !== void 0 ? _a : spec.imported.name;
                            }
                            if (core_1.types.isImportSpecifier(spec) && core_1.types.isIdentifier(spec.imported) &&
                                spec.imported.name === 'jsxs') {
                                state.jsxsIdentifier = (_b = spec.local.name) !== null && _b !== void 0 ? _b : spec.imported.name;
                            }
                        });
                    }
                    if (node.source.value === 'react') {
                        node.specifiers.forEach(spec => {
                            if (core_1.types.isImportNamespaceSpecifier(spec) && core_1.types.isIdentifier(spec.local)) {
                                state.reactIdentifier = spec.local.name;
                            }
                            if (core_1.types.isImportSpecifier(spec) && core_1.types.isIdentifier(spec.imported) &&
                                (spec.imported.name === 'react' || spec.imported.name === 'React')) {
                                state.reactIdentifier = spec.local.name;
                            }
                        });
                    }
                    state.lastImport = path;
                },
                CallExpression(path, pass) {
                    const state = pass.get(PLUGIN_NAME);
                    const { node } = path;
                    if (core_1.types.isIdentifier(node.callee) && node.callee.name === state.jsxIdentifier) {
                        state.needsPrelude = true;
                        if (!node.arguments.every(a => core_1.types.isExpression(a))) {
                            throw new Error('unimplemented');
                        }
                        const [type, props, maybeKey] = node.arguments;
                        const { shouldInline, ref, key, updatedProps, } = processProps(node, type, props, maybeKey);
                        if (!shouldInline) {
                            console.log('CANNOT INLINE:');
                            console.log(path.toString());
                            console.log('-----');
                            return;
                        }
                        const replacement = core_1.types.objectExpression([
                            core_1.types.objectProperty(core_1.types.identifier('$$typeof'), core_1.types.identifier(state.reactElementTypeIdentifier)),
                            core_1.types.objectProperty(core_1.types.identifier('type'), type),
                            core_1.types.objectProperty(core_1.types.identifier('ref'), ref),
                            core_1.types.objectProperty(core_1.types.identifier('key'), key),
                            core_1.types.objectProperty(core_1.types.identifier('props'), updatedProps),
                            core_1.types.objectProperty(core_1.types.identifier('_owner'), core_1.types.memberExpression(core_1.types.identifier(state.reactOwnerIdentifier), core_1.types.identifier('current'))),
                        ]);
                        path.replaceWith(core_1.types.inherits(replacement, node));
                    }
                }
            },
        };
        function processProps(node, type, props, maybeKey) {
            const isStaticType = core_1.types.isStringLiteral(type);
            let shouldInline = false;
            let key = maybeKey !== null && maybeKey !== void 0 ? maybeKey : core_1.types.nullLiteral();
            let ref = core_1.types.nullLiteral();
            let updatedProps = props;
            const extractProps = (props) => {
                props.properties = props.properties.filter(prop => {
                    if (core_1.types.isObjectProperty(prop) && !prop.computed) {
                        if (core_1.types.isIdentifier(prop.key) && isRefKey(prop.key.name)) {
                            if (prop.key.name === 'ref') {
                                ref = core_1.types.cloneNode(prop.value);
                            }
                            if (prop.key.name === 'key') {
                                key = core_1.types.cloneNode(prop.value);
                            }
                            return false;
                        }
                    }
                    return true;
                });
            };
            if (isStaticObject(props)) {
                shouldInline = true;
                extractProps(props);
            }
            else if (isExtendCall(props)) {
                shouldInline = true;
                props.arguments.forEach(arg => {
                    if (core_1.types.isObjectExpression(arg)) {
                        extractProps(arg);
                    }
                });
            }
            else {
                console.log(type);
                console.log(props);
                throw new Error('unimplemented');
            }
            if (!isStaticType) {
                updatedProps = addDefaultProps(type, props);
            }
            return {
                shouldInline,
                ref,
                key,
                updatedProps,
            };
        }
        function isStaticObject(node) {
            return core_1.types.isObjectExpression(node) && node.properties.every(prop => (core_1.types.isObjectProperty(prop) && !prop.computed) ||
                (core_1.types.isObjectMethod(prop) && !prop.computed));
        }
        function isExtendCall(node) {
            if (core_1.types.isCallExpression(node))
                console.log(source.slice(node.callee.loc.start.index, node.callee.loc.end.index), core_1.types.isCallExpression(node) &&
                    (source.slice(node.callee.loc.start.index, node.callee.loc.end.index) === '_extends' ||
                        source.slice(node.callee.loc.start.index, node.callee.loc.end.index) === 'Object.assign'));
            return core_1.types.isCallExpression(node) &&
                (source.slice(node.callee.loc.start.index, node.callee.loc.end.index) === '_extends' ||
                    source.slice(node.callee.loc.start.index, node.callee.loc.end.index) === 'Object.assign');
        }
        function isRefKey(value) {
            return value === 'ref' || value === 'key';
        }
        function addDefaultProps(type, props) {
            const defaultProps = () => core_1.types.memberExpression(core_1.types.cloneNode(type), core_1.types.identifier('defaultProps'));
            let extendedProps;
            if (core_1.types.isObjectExpression(props)) {
                if (useSpread) {
                    // { ...defaultProps, props }
                    props.properties.unshift(core_1.types.spreadElement(defaultProps()));
                    return props;
                }
                else {
                    extendedProps = core_1.types.callExpression(extendExpression, [
                        core_1.types.objectExpression([]),
                        defaultProps(),
                        core_1.types.cloneNode(props, true),
                    ]);
                }
            }
            else {
                extendedProps = core_1.types.callExpression(extendExpression, [
                    core_1.types.objectExpression([]),
                    defaultProps(),
                    core_1.types.cloneNode(props, true),
                ]);
            }
            return core_1.types.conditionalExpression(defaultProps(), extendedProps, props);
        }
    });
    function getSource(source, importName) {
        switch (importName) {
            case "Fragment":
                return `${source}/${development ? "jsx-dev-runtime" : "jsx-runtime"}`;
            case "jsxDEV":
                return `${source}/jsx-dev-runtime`;
            case "jsx":
            case "jsxs":
                return `${source}/jsx-runtime`;
            case "createElement":
                return source;
        }
    }
    function createImportLazily(pass, path, importName, source) {
        return () => {
            const actualSource = getSource(source, importName);
            if ((0, helper_module_imports_1.isModule)(path)) {
                let reference = get(pass, `imports/${importName}`);
                if (reference)
                    return core_1.types.cloneNode(reference);
                reference = (0, helper_module_imports_1.addNamed)(path, importName, actualSource, {
                    importedInterop: "uncompiled",
                    importPosition: "after",
                });
                set(pass, `imports/${importName}`, reference);
                return reference;
            }
            else {
                let reference = get(pass, `requires/${actualSource}`);
                if (reference) {
                    reference = core_1.types.cloneNode(reference);
                }
                else {
                    reference = (0, helper_module_imports_1.addNamespace)(path, actualSource, {
                        importedInterop: "uncompiled",
                    });
                    set(pass, `requires/${actualSource}`, reference);
                }
                return core_1.types.memberExpression(reference, core_1.types.identifier(importName));
            }
        };
    }
}
exports.default = createPlugin;
function toMemberExpression(id) {
    return (id
        .split(".")
        .map(name => core_1.types.identifier(name))
        // @ts-expect-error - The Array#reduce does not have a signature
        // where the type of initial value differs from callback return type
        .reduce((object, property) => core_1.types.memberExpression(object, property)));
}
function makeSource(path, state) {
    const location = path.node.loc;
    if (!location) {
        // the element was generated and doesn't have location information
        return path.scope.buildUndefinedNode();
    }
    if (!state.fileNameIdentifier) {
        const { filename = "" } = state;
        const fileNameIdentifier = path.scope.generateUidIdentifier("_jsxFileName");
        path.scope.getProgramParent().push({
            id: fileNameIdentifier,
            init: core_1.types.stringLiteral(filename),
        });
        state.fileNameIdentifier = fileNameIdentifier;
    }
    return makeTrace(
    // @ts-expect-error todo
    core_1.types.cloneNode(
    // @ts-expect-error todo
    state.fileNameIdentifier), location.start.line, location.start.column);
}
function makeTrace(fileNameIdentifier, lineNumber, column0Based) {
    const fileLineLiteral = lineNumber != null ? core_1.types.numericLiteral(lineNumber) : core_1.types.nullLiteral();
    const fileColumnLiteral = column0Based != null ? core_1.types.numericLiteral(column0Based + 1) : core_1.types.nullLiteral();
    return core_1.template.expression.ast `{
    fileName: ${fileNameIdentifier},
    lineNumber: ${fileLineLiteral},
    columnNumber: ${fileColumnLiteral},
  }`;
}
function sourceSelfError(path, name) {
    const pluginName = `transform-fast-react-jsx-${name.slice(2)}`;
    return path.buildCodeFrameError(`Duplicate ${name} prop found. You are most likely using the deprecated ${pluginName} Babel plugin. Both __source and __self are automatically set when using the automatic runtime. Please remove transform-fast-react-jsx-source and transform-fast-react-jsx-self from your Babel config.`);
}
function hasProto(node) {
    return node.properties.some(value => core_1.types.isObjectProperty(value, { computed: false, shorthand: false }) &&
        (core_1.types.isIdentifier(value.key, { name: "__proto__" }) ||
            core_1.types.isStringLiteral(value.key, { value: "__proto__" })));
}
// Returns whether `this` is allowed at given scope.
// function isThisAllowed(scope: Scope) {
//   // This specifically skips arrow functions as they do not rewrite `this`.
//   do {
//     const { path } = scope;
//     if (path.isFunctionParent() && !path.isArrowFunctionExpression()) {
//       if (!path.isMethod()) {
//         // If the closest parent is a regular function, `this` will be rebound, therefore it is fine to use `this`.
//         return true;
//       }
//       // Current node is within a method, so we need to check if the method is a constructor.
//       if (path.node.kind !== "constructor") {
//         // We are not in a constructor, therefore it is always fine to use `this`.
//         return true;
//       }
//       // Now we are in a constructor. If it is a derived class, we do not reference `this`.
//       return !isDerivedClass(path.parentPath.parentPath as NodePath<Class>);
//     }
//     if (path.isTSModuleBlock()) {
//       // If the closest parent is a TS Module block, `this` will not be allowed.
//       return false;
//     }
//   } while ((scope = scope.parent));
//   // We are not in a method or function. It is fine to use `this`.
//   return true;
// }

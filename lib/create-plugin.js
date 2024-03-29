"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-ignore todo
const helper_plugin_utils_1 = require("@babel/helper-plugin-utils");
const core_1 = require("@babel/core");
const core_2 = require("@babel/core");
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
const JSX_FROM_OWNED_EXTENDS = (0, core_2.parse)(`
  function _jsxFromOwnedExtends() {
    // type, maybeKey, ownedProps, ...props
    var type = arguments[0]
    var props = arguments[2]
    var key = arguments[1] != null ? arguments[1] : props.key;
    var ref = null;

    var defaultProps = type.defaultProps
    if (defaultProps) {
      for (var field in defaultProps) {
        if (Object.prototype.hasOwnProperty.call(defaultProps, field)) {
          props[field] = defaultProps[field];
        }
      }
    }

    for (var i = 3; i < arguments.length; i++) {
      var other = arguments[i];
      for (var field in other) {
        if (Object.prototype.hasOwnProperty.call(other, field)) {
          props[field] = other[field];
        }
      }
    }

    key = 'key' in props ? props.key : key
    ref = 'ref' in props ? props.ref : ref

    delete props.ref
    delete props.key

    return {
      $$typeof: __react_ElementType,
      type: type,
      ref: ref,
      key: key,
      props: props,
      _owner: __react_CurrentOwner.current
    };
  }
  `, { configFile: false }).program.body[0];
const jsxFromOwnedExtendsExpression = () => core_1.types.cloneNode(JSX_FROM_OWNED_EXTENDS);
const JSX_FROM_OWNED = (0, core_2.parse)(`
  function _jsxFromOwned(type, maybeKey, props) {
    var defaultProps = type.defaultProps
    if (defaultProps) {
      for (var field in defaultProps) {
        if (Object.prototype.hasOwnProperty.call(defaultProps, field)) {
          props[field] = defaultProps[field];
        }
      }
    }

    var key = maybeKey
    if ('key' in props) {
      key = props.key
      delete props.key
    }
    var ref = null
    if ('ref' in props) {
      ref = props.ref
      delete props.ref
    }

    return {
      $$typeof: __react_ElementType,
      type: type,
      ref: ref,
      key: key,
      props: props,
      _owner: __react_CurrentOwner.current
    };
  }
  `, { configFile: false }).program.body[0];
const jsxFromOwnedExpression = () => core_1.types.cloneNode(JSX_FROM_OWNED);
const get = (pass, name) => pass.get(`@babel/plugin-react-jsx/${name}`);
const set = (pass, name, v) => pass.set(`@babel/plugin-react-jsx/${name}`, v);
const EMPTY_STATE = {
    jsxIdentifier: null,
    jsxsIdentifier: null,
    reactIdentifier: null,
    reactElementTypeIdentifier: '__react_ElementType',
    reactOwnerIdentifier: '__react_CurrentOwner',
    jsxFromOwnedIdentifier: '_jsxFromOwned',
    jsxFromOwnedExtendsIdentifier: '_jsxFromOwnedExtends',
    needsPrelude: false,
    needsJsxFromOwned: false,
    needsJsxFromOwnedExtends: false,
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
        const extendExpression = () => toMemberExpression(extendName);
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
                        if (state.needsJsxFromOwned) {
                            state.lastImport.insertAfter(jsxFromOwnedExpression());
                        }
                        if (state.needsJsxFromOwnedExtends) {
                            state.lastImport.insertAfter(jsxFromOwnedExtendsExpression());
                        }
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
                                const reactImport = core_1.types.importDeclaration([core_1.types.importNamespaceSpecifier(core_1.types.identifier(reactIdentifier))], core_1.types.stringLiteral('react'));
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
                    var _a;
                    const state = pass.get(PLUGIN_NAME);
                    const { node } = path;
                    const isJSX = core_1.types.isIdentifier(node.callee) && (node.callee.name === state.jsxIdentifier ||
                        node.callee.name === state.jsxsIdentifier);
                    if (isJSX) {
                        state.needsPrelude = true;
                        if (!node.arguments.every(a => core_1.types.isExpression(a))) {
                            throw new Error('unimplemented');
                        }
                        // Remove the PURE annotations, not needed anymore
                        (_a = node.leadingComments) === null || _a === void 0 ? void 0 : _a.forEach(c => {
                            c.value = '';
                        });
                        const [type, props, maybeKey] = node.arguments;
                        if (isStaticObject(props)) {
                            processStaticObject(state, path, type, props, maybeKey);
                        }
                        else if (isDynamicObject(props)) {
                            processDynamicObject(state, path, type, props, maybeKey);
                        }
                        else if (isExtendCall(props)) {
                            processExtendCall(state, path, type, props, maybeKey);
                        }
                        else {
                            console.log('CANNOT INLINE:');
                            console.log(path.toString());
                            console.log('-----');
                            console.log(type);
                            console.log(props);
                            throw new Error('unimplemented');
                        }
                    }
                }
            },
        };
        function isStaticObject(node) {
            return core_1.types.isObjectExpression(node) && node.properties.every(prop => (core_1.types.isObjectProperty(prop) || core_1.types.isObjectMethod(prop)) && !prop.computed);
        }
        function processStaticObject(state, path, type, props, maybeKey) {
            const isStaticType = core_1.types.isStringLiteral(type);
            let key = maybeKey !== null && maybeKey !== void 0 ? maybeKey : core_1.types.nullLiteral();
            let ref = core_1.types.nullLiteral();
            if (!core_1.types.isObjectExpression(props)) {
                throw new Error('unreachable');
            }
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
            let updatedProps = props;
            if (!isStaticType) {
                updatedProps = addDefaultProps(type, props);
            }
            const replacement = core_1.types.objectExpression([
                core_1.types.objectProperty(core_1.types.identifier('$$typeof'), core_1.types.identifier(state.reactElementTypeIdentifier)),
                core_1.types.objectProperty(core_1.types.identifier('type'), type),
                core_1.types.objectProperty(core_1.types.identifier('ref'), ref),
                core_1.types.objectProperty(core_1.types.identifier('key'), key),
                core_1.types.objectProperty(core_1.types.identifier('props'), updatedProps),
                core_1.types.objectProperty(core_1.types.identifier('_owner'), core_1.types.memberExpression(core_1.types.identifier(state.reactOwnerIdentifier), core_1.types.identifier('current'))),
            ]);
            path.replaceWith(core_1.types.inherits(replacement, path.node));
        }
        function isDynamicObject(node) {
            return core_1.types.isObjectExpression(node) && !isStaticObject(node);
        }
        function processDynamicObject(state, path, type, props, maybeKey) {
            state.needsJsxFromOwned = true;
            const replacement = core_1.types.callExpression(core_1.types.identifier(state.jsxFromOwnedIdentifier), [
                type,
                maybeKey !== null && maybeKey !== void 0 ? maybeKey : core_1.types.nullLiteral(),
                props,
            ]);
            path.replaceWith(core_1.types.inherits(replacement, path.node));
        }
        function isExtendCall(node) {
            return core_1.types.isCallExpression(node) &&
                (source.slice(node.callee.loc.start.index, node.callee.loc.end.index) === '_extends' ||
                    source.slice(node.callee.loc.start.index, node.callee.loc.end.index) === 'Object.assign');
        }
        function processExtendCall(state, path, type, call, maybeKey) {
            state.needsJsxFromOwnedExtends = true;
            const propArguments = call.arguments;
            const isStandardArguments = propArguments.every(a => !core_1.types.isArgumentPlaceholder(a) &&
                !core_1.types.isSpreadElement(a) &&
                !core_1.types.isJSXNamespacedName(a));
            const isFirstArgumentOwned = core_1.types.isObjectExpression(propArguments[0]);
            if (!isStandardArguments || !isFirstArgumentOwned) {
                console.log(call);
                throw new Error('invalid extend call');
            }
            const replacement = core_1.types.callExpression(core_1.types.identifier(state.jsxFromOwnedExtendsIdentifier), [
                type,
                maybeKey !== null && maybeKey !== void 0 ? maybeKey : core_1.types.nullLiteral(),
                ...call.arguments,
            ]);
            path.replaceWith(core_1.types.inherits(replacement, path.node));
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
                    extendedProps = core_1.types.callExpression(extendExpression(), [
                        core_1.types.objectExpression([]),
                        defaultProps(),
                        core_1.types.cloneNode(props, true),
                    ]);
                }
            }
            else {
                extendedProps = core_1.types.callExpression(extendExpression(), [
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

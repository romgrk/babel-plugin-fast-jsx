// @ts-ignore todo
import { declare } from '@babel/helper-plugin-utils';
import { template, types as t } from '@babel/core';
import type { PluginPass } from '@babel/core';
import type { NodePath, Scope, Visitor } from '@babel/traverse';
import { addNamed, addNamespace, isModule } from '@babel/helper-module-imports';
import type { Identifier, MemberExpression, Program } from '@babel/types';

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

const PLUGIN_NAME = 'babel-plugin-fast-jsx'

const get = (pass: PluginPass, name: string) => pass.get(`@babel/plugin-react-jsx/${name}`);
const set = (pass: PluginPass, name: string, v: any) => pass.set(`@babel/plugin-react-jsx/${name}`, v);

export interface Options {
  filter?: (node: t.Node, pass: PluginPass) => boolean;
  importSource?: string;
  pragma?: string;
  pragmaFrag?: string;
  pure?: string;
  throwIfNamespace?: boolean;
  useBuiltIns: boolean;
  useSpread?: boolean;
}

const EMPTY_STATE = {
  jsxIdentifier: null as string | null,
  jsxsIdentifier: null as string | null,
  reactIdentifier: null as string | null,
  reactElementTypeIdentifier: '__react_ElementType',
  reactOwnerIdentifier: '__react_CurrentOwner',
  needsPrelude: false,
  lastImport: null as NodePath<t.ImportDeclaration> | null,
}
type State = typeof EMPTY_STATE

export default function createPlugin({
  name,
  development,
}: {
  name: string;
  development: boolean;
}) {
  return declare((_: any, options: Options) => {
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
    const extendName = useBuiltIns ? 'Object.assign' : '_extend'
    const extendExpression = toMemberExpression(extendName)
    let source = ''

    return {
      name,
      // inherits: jsx,
      visitor: {
        Program: {
          enter(path: NodePath, pass: PluginPass) {
            // let runtime: string = RUNTIME_DEFAULT;
            // let source: string = IMPORT_SOURCE_DEFAULT;
            // let pragma: string = PRAGMA_DEFAULT;
            // let pragmaFrag: string = PRAGMA_FRAG_DEFAULT;
            // let sourceSet = !!options.importSource;
            // let pragmaSet = !!options.pragma;
            // let pragmaFragSet = !!options.pragmaFrag;

            source = path.getSource()

            const state = { ...EMPTY_STATE }
            pass.set(PLUGIN_NAME, state)
          },

          exit(_path: NodePath, pass: PluginPass) {
            const state = pass.get(PLUGIN_NAME) as State
            if (state.needsPrelude) {
              const needReactImport = state.reactIdentifier === null
              const reactIdentifier = state.reactIdentifier ?? '__react'

              // Insert `const __react_ElementType = Symbol.for('react.element')`
              state.lastImport.insertAfter(
                t.variableDeclaration('var', [
                  t.variableDeclarator(
                    t.identifier(state.reactElementTypeIdentifier),
                    t.callExpression(
                      toMemberExpression('Symbol.for'),
                      [t.stringLiteral('react.element')]
                    )
                  )
                ])
              )

              // Insert `const __react_CurrentOwner = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner`
              state.lastImport.insertAfter(
                t.variableDeclaration('var', [
                  t.variableDeclarator(
                    t.identifier(state.reactOwnerIdentifier),
                    toMemberExpression(
                      `${reactIdentifier}.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner`)
                  )
                ])
              )

              // Import react if it wasn't already imported
              if (needReactImport) {
                const reactImport =
                  t.importDeclaration(
                    [t.importSpecifier(t.identifier(reactIdentifier), t.identifier('react'))],
                    t.stringLiteral('react'),
                )
                state.lastImport.insertAfter(reactImport)
              }
            }
          },
        },

        ImportDeclaration(path: NodePath<t.ImportDeclaration>, pass: PluginPass) {
          const state = pass.get(PLUGIN_NAME) as State
          const { node } = path
          if (node.source.value === 'react/jsx-runtime') {
            node.specifiers.forEach(spec => {
              if (t.isImportSpecifier(spec) && t.isIdentifier(spec.imported) &&
                  spec.imported.name === 'jsx') {
                state.jsxIdentifier = spec.local.name ?? spec.imported.name
              }
              if (t.isImportSpecifier(spec) && t.isIdentifier(spec.imported) &&
                  spec.imported.name === 'jsxs') {
                state.jsxsIdentifier = spec.local.name ?? spec.imported.name
              }
            })
          }
          if (node.source.value === 'react') {
            node.specifiers.forEach(spec => {
              if (t.isImportNamespaceSpecifier(spec) && t.isIdentifier(spec.local)) {
                state.reactIdentifier = spec.local.name
              }
              if (t.isImportSpecifier(spec) && t.isIdentifier(spec.imported) &&
                  (spec.imported.name === 'react' || spec.imported.name === 'React')) {
                state.reactIdentifier = spec.local.name
              }
            })
          }
          state.lastImport = path
        },

        CallExpression(path: NodePath<t.CallExpression>, pass: PluginPass) {
          const state = pass.get(PLUGIN_NAME) as State
          const { node } = path
          if (t.isIdentifier(node.callee) && node.callee.name === state.jsxIdentifier) {
            state.needsPrelude = true

            if (!node.arguments.every(a => t.isExpression(a))){
              throw new Error('unimplemented')
            }

            const [type, props, maybeKey] = node.arguments as t.Expression[]

            const {
              ref,
              key,
              updatedProps,
            } = processProps(path, type, props, maybeKey)

            const replacement = t.objectExpression([
              t.objectProperty(t.identifier('$$typeof'), t.identifier(state.reactElementTypeIdentifier)),
              t.objectProperty(t.identifier('type'), type),
              t.objectProperty(t.identifier('ref'), ref),
              t.objectProperty(t.identifier('key'), key),
              t.objectProperty(t.identifier('props'), updatedProps),
              t.objectProperty(t.identifier('_owner'),
                t.memberExpression(t.identifier(state.reactOwnerIdentifier), t.identifier('current'))),
            ])

            path.replaceWith(t.inherits(replacement, node))
          }
        }
      },
    };

    function processProps(path: NodePath, type: t.Expression, props: t.Expression, maybeKey?: t.Expression) {
      const isStaticType = t.isStringLiteral(type)

      let key = maybeKey ?? t.nullLiteral()
      let ref = t.nullLiteral() as t.Expression
      let updatedProps = props

      const extractProps = (props: t.ObjectExpression) => {
        props.properties = props.properties.filter(prop => {
          if (t.isObjectProperty(prop) && !prop.computed) {
            if (t.isIdentifier(prop.key) && isRefKey(prop.key.name)) {
              if (prop.key.name === 'ref') { ref = t.cloneNode(prop.value) as t.Expression }
              if (prop.key.name === 'key') { key = t.cloneNode(prop.value) as t.Expression }
              return false
            }
          }
          return true
        })
      }

      if (isStaticObject(props)) {
        extractProps(props)
      } else if (isExtendCall(props)) {
        props.arguments.forEach(arg => {
          if (t.isObjectExpression(arg)) {
            extractProps(arg)
          }
        })
      } else {
        console.log('CANNOT INLINE:')
        console.log(path.toString())
        console.log('-----')
        console.log(type)
        console.log(props)
        throw new Error('unimplemented')
      }

      if (!isStaticType) {
        updatedProps = addDefaultProps(type, props)
      }

      return {
        ref,
        key,
        updatedProps,
      }
    }

    function isStaticObject(node: t.Expression): node is t.ObjectExpression {
      return t.isObjectExpression(node) && node.properties.every(prop =>
        (t.isObjectProperty(prop) && !prop.computed) ||
        (t.isObjectMethod(prop) && !prop.computed)
      )
    }

    function isExtendCall(node: t.Expression): node is t.CallExpression {
      return t.isCallExpression(node) &&
        (source.slice(node.callee.loc.start.index, node.callee.loc.end.index) === '_extends' ||
         source.slice(node.callee.loc.start.index, node.callee.loc.end.index) === 'Object.assign')
    }


    function isRefKey(value: string) {
      return value === 'ref' || value === 'key'
    }

    function addDefaultProps(type: t.Expression, props: t.Expression) {
      const defaultProps = () => t.memberExpression(t.cloneNode(type), t.identifier('defaultProps'))

      let extendedProps
      if (t.isObjectExpression(props)) {
        if (useSpread) {
          // { ...defaultProps, props }
          props.properties.unshift(
            t.spreadElement(defaultProps()))
          return props
        } else {
          extendedProps = t.callExpression(extendExpression, [
            t.objectExpression([]),
            defaultProps(),
            t.cloneNode(props, true),
          ])
        }
      } else {
        extendedProps = t.callExpression(extendExpression, [
          t.objectExpression([]),
          defaultProps(),
          t.cloneNode(props, true),
        ])
      }

      return t.conditionalExpression(
        defaultProps(),
        extendedProps,
        props,
      )
    }

  });

  function getSource(source: string, importName: string) {
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

  function createImportLazily(
    pass: PluginPass,
    path: NodePath<Program>,
    importName: string,
    source: string,
  ): () => Identifier | MemberExpression {
    return () => {
      const actualSource = getSource(source, importName);
      if (isModule(path)) {
        let reference = get(pass, `imports/${importName}`);
        if (reference) return t.cloneNode(reference);

        reference = addNamed(path, importName, actualSource, {
          importedInterop: "uncompiled",
          importPosition: "after",
        });
        set(pass, `imports/${importName}`, reference);

        return reference;
      } else {
        let reference = get(pass, `requires/${actualSource}`);
        if (reference) {
          reference = t.cloneNode(reference);
        } else {
          reference = addNamespace(path, actualSource, {
            importedInterop: "uncompiled",
          });
          set(pass, `requires/${actualSource}`, reference);
        }

        return t.memberExpression(reference, t.identifier(importName));
      }
    };
  }
}

function toMemberExpression(id: string): Identifier | MemberExpression {
  return (
    id
      .split(".")
      .map(name => t.identifier(name))
      // @ts-expect-error - The Array#reduce does not have a signature
      // where the type of initial value differs from callback return type
      .reduce((object, property) => t.memberExpression(object, property))
  );
}

function makeSource(path: NodePath, state: PluginPass) {
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
      init: t.stringLiteral(filename),
    });
    state.fileNameIdentifier = fileNameIdentifier;
  }

  return makeTrace(
    // @ts-expect-error todo
    t.cloneNode(
      // @ts-expect-error todo
      state.fileNameIdentifier,
    ),
    location.start.line,
    location.start.column,
  );
}

function makeTrace(
  fileNameIdentifier: Identifier,
  lineNumber?: number,
  column0Based?: number,
) {
  const fileLineLiteral =
    lineNumber != null ? t.numericLiteral(lineNumber) : t.nullLiteral();

  const fileColumnLiteral =
    column0Based != null ? t.numericLiteral(column0Based + 1) : t.nullLiteral();

  return template.expression.ast`{
    fileName: ${fileNameIdentifier},
    lineNumber: ${fileLineLiteral},
    columnNumber: ${fileColumnLiteral},
  }`;
}

function sourceSelfError(path: NodePath, name: string) {
  const pluginName = `transform-fast-react-jsx-${name.slice(2)}`;

  return path.buildCodeFrameError(
    `Duplicate ${name} prop found. You are most likely using the deprecated ${pluginName} Babel plugin. Both __source and __self are automatically set when using the automatic runtime. Please remove transform-fast-react-jsx-source and transform-fast-react-jsx-self from your Babel config.`,
  );
}

function hasProto(node: t.ObjectExpression) {
  return node.properties.some(
    value =>
      t.isObjectProperty(value, { computed: false, shorthand: false }) &&
      (t.isIdentifier(value.key, { name: "__proto__" }) ||
        t.isStringLiteral(value.key, { value: "__proto__" })),
  );
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

// import jsx from "@babel/plugin-syntax-jsx";
// @ts-ignore todo
import { declare } from "@babel/helper-plugin-utils";
import { template, types as t } from "@babel/core";
import type { PluginPass } from "@babel/core";
import type { NodePath, Scope, Visitor } from "@babel/traverse";
import { addNamed, addNamespace, isModule } from "@babel/helper-module-imports";
// @ts-ignore todo
import annotateAsPure from "@babel/helper-annotate-as-pure";
import type {
  CallExpression,
  Class,
  Expression,
  Identifier,
  JSXAttribute,
  JSXElement,
  JSXFragment,
  JSXOpeningElement,
  JSXSpreadAttribute,
  MemberExpression,
  ObjectExpression,
  Program,
} from "@babel/types";

const DEFAULT = {
  importSource: "react",
  runtime: "automatic",
  pragma: "React.createElement",
  pragmaFrag: "React.Fragment",
};

const PRELUDE = `
import { react as _react } from 'react'
const _REACT_ELEMENT_TYPE = Symbol.for('react.element');
const _ReactSharedInternals = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
const _ReactCurrentOwner = ReactSharedInternals.ReactCurrentOwner;
function _fastJsx(type, key, ref, props) {
  return {
    $$typeof: _REACT_ELEMENT_TYPE,
    type,
    key,
    ref,
    props,
    _owner: _ReactCurrentOwner.current
  };
}
`;

const PLUGIN_NAME = 'babel-plugin-fast-jsx'

const get = (pass: PluginPass, name: string) => pass.get(`@babel/plugin-react-jsx/${name}`);
const set = (pass: PluginPass, name: string, v: any) => pass.set(`@babel/plugin-react-jsx/${name}`, v);

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

const EMPTY_STATE = {
  jsxIdentifier: null as string | null,
  jsxsIdentifier: null as string | null,
  reactIdentifier: null as string | null,
  reactElementTypeIdentifier: '_REACT_ELEMENT_TYPE',
  reactOwnerIdentifier: '_ReactCurrentOwner',
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
    const {
      pure: PURE_ANNOTATION,

      throwIfNamespace = true,

      filter,

      runtime: RUNTIME_DEFAULT = "automatic",
      importSource: IMPORT_SOURCE_DEFAULT = DEFAULT.importSource,
      pragma: PRAGMA_DEFAULT = DEFAULT.pragma,
      pragmaFrag: PRAGMA_FRAG_DEFAULT = DEFAULT.pragmaFrag,
    } = options;

    // eslint-disable-next-line no-var
    var { useSpread = false, useBuiltIns = false } = options;

    return {
      name,
      // inherits: jsx,
      visitor: {
        Program: {
          enter(path: NodePath, pass: PluginPass) {
            // let runtime: string = RUNTIME_DEFAULT;
            //
            // let source: string = IMPORT_SOURCE_DEFAULT;
            // let pragma: string = PRAGMA_DEFAULT;
            // let pragmaFrag: string = PRAGMA_FRAG_DEFAULT;
            //
            // let sourceSet = !!options.importSource;
            // let pragmaSet = !!options.pragma;
            // let pragmaFragSet = !!options.pragmaFrag;

            const state = { ...EMPTY_STATE }
            pass.set(PLUGIN_NAME, state)
          },

          exit(path: NodePath, pass: PluginPass) {
            const state = pass.get(PLUGIN_NAME) as State
            if (state.needsPrelude) {
              const needReactImport = state.reactIdentifier === null
              const reactIdentifier = state.reactIdentifier ?? '_react'

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

              state.lastImport.insertAfter(
                t.variableDeclaration('var', [
                  t.variableDeclarator(
                    t.identifier(state.reactOwnerIdentifier),
                    toMemberExpression(
                      `${reactIdentifier}.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner`)
                  )
                ])
              )

              if (needReactImport) {
                const reactImport =
                  t.importDeclaration(
                    [t.importSpecifier(t.identifier('_react'), t.identifier('react'))],
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
            console.log('JSX FOUND')
            console.log(node)

            // FIXME: handle some of these cases?
            if (!node.arguments.every(a => t.isExpression(a))){
              return
            }

            const [type, props, maybeKey] = node.arguments as t.Expression[]

            const ref = findRef(props) ?? t.buildUndefinedNode()
            const key = findKey(props, maybeKey) ?? t.buildUndefinedNode()
            const updatedProps = props

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

    function findRef(props: t.Expression): t.Expression {
      return undefined
    }

    function findKey(props: t.Expression, maybeKey?: t.Expression): t.Expression {
      return undefined ?? maybeKey
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


import * as React from "react";
import { jsx as _jsx } from "react/jsx-runtime";

const handleRef = ref => { console.log(ref) }

const flat = /*#__PURE__*/_jsx('div', {
  ref: handleRef,
  key: 'container',
  a: 1,
  b: false,
}, "foo");

function Component({ children }) {
  return /*#__PURE__*/_jsx('div', {
    ref: handleRef,
    key: 'component',
    children: children,
  })
}

const maybeDefaultProps = /*#__PURE__*/_jsx(Component, {
  ref: handleRef,
  key: 'container',
  children: ['text'],
});

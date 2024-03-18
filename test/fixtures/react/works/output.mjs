import * as React from "react";
import { jsx as _jsx } from "react/jsx-runtime";
var __react_CurrentOwner = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner;
var __react_ElementType = Symbol.for("react.element");
const handleRef = ref => {
  console.log(ref);
};
const flat = /*#__PURE__*/{
  $$typeof: __react_ElementType,
  type: 'div',
  ref: handleRef,
  key: 'container',
  props: {
    a: 1,
    b: false
  },
  _owner: __react_CurrentOwner.current
};
function Component({
  children
}) {
  return /*#__PURE__*/{
    $$typeof: __react_ElementType,
    type: 'div',
    ref: handleRef,
    key: 'component',
    props: {
      children: children
    },
    _owner: __react_CurrentOwner.current
  };
}
const maybeDefaultProps = /*#__PURE__*/{
  $$typeof: __react_ElementType,
  type: Component,
  ref: handleRef,
  key: 'container',
  props: Component.defaultProps ? _extend({}, Component.defaultProps, {
    children: ['text']
  }) : {
    children: ['text']
  },
  _owner: __react_CurrentOwner.current
};

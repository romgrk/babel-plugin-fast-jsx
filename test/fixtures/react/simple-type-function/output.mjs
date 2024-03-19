import { jsx as _jsx } from "react/jsx-runtime";
import * as __react from "react";
var __react_CurrentOwner = __react.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner;
var __react_ElementType = Symbol.for("react.element");
const handleRef = ref => {
  console.log(ref);
};
function Component({
  children
}) {
  return /**/{
    $$typeof: __react_ElementType,
    type: 'div',
    ref: handleRef,
    key: 'content',
    props: {
      children: children
    },
    _owner: __react_CurrentOwner.current
  };
}
const component = /**/{
  $$typeof: __react_ElementType,
  type: Component,
  ref: handleRef,
  key: 'component',
  props: Component.defaultProps ? Object.assign({}, Component.defaultProps, {
    children: ['text']
  }) : {
    children: ['text']
  },
  _owner: __react_CurrentOwner.current
};

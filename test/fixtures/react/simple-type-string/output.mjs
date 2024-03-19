import { jsx as _jsx } from "react/jsx-runtime";
import * as __react from "react";
var __react_CurrentOwner = __react.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner;
var __react_ElementType = Symbol.for("react.element");
const handleRef = ref => {
  console.log(ref);
};
const flat = /**/{
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

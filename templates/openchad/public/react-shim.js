// Shim that re-exports react named exports from Vite's pre-bundled module
import React from '/@id/react';

export default React;
// Hooks

export const useState = React.useState;

export const useEffect = React.useEffect;

export const useContext = React.useContext;

export const useReducer = React.useReducer;

export const useCallback = React.useCallback;

export const useMemo = React.useMemo;

export const useRef = React.useRef;

export const useImperativeHandle = React.useImperativeHandle;

export const useLayoutEffect = React.useLayoutEffect;

export const useDebugValue = React.useDebugValue;

export const useDeferredValue = React.useDeferredValue;

export const useTransition = React.useTransition;

export const useId = React.useId;

export const useSyncExternalStore = React.useSyncExternalStore;

export const useInsertionEffect = React.useInsertionEffect;

export const useOptimistic = React.useOptimistic;

export const useActionState = React.useActionState;

export const useEffectEvent = React.useEffectEvent;

export const use = React.use;
// Component classes

export const Component = React.Component;

export const PureComponent = React.PureComponent;
// Component utilities

export const createContext = React.createContext;

export const forwardRef = React.forwardRef;

export const lazy = React.lazy;

export const memo = React.memo;

export const cache = React.cache;
// Transitions

export const startTransition = React.startTransition;
// Built-in components

export const Fragment = React.Fragment;

export const StrictMode = React.StrictMode;

export const Suspense = React.Suspense;

export const Profiler = React.Profiler;

export const Activity = React.Activity;
// React element utilities

export const Children = React.Children;

export const cloneElement = React.cloneElement;

export const createElement = React.createElement;

export const isValidElement = React.isValidElement;

export const createRef = React.createRef;
// Other

export const version = React.version;

export const act = React.act;

export const captureOwnerStack = React.captureOwnerStack;

export const cacheSignal = React.cacheSignal;
import { i as init_defineProperty, n as init_objectSpread2, r as _defineProperty, t as _objectSpread2 } from "./objectSpread2-BY0ivYo0.js";
import { A as DestroyRef, Cr as inject, Hi as signal, Lt as assertInInjectionContext, Sn as effect, Yt as assertNotInReactiveContext, _ as untracked, c as computed, ft as RuntimeError, l as encapsulateResourceError, lt as PendingTasks, m as resource, pi as promiseWithResolvers, q as Injector, u as getOutputDestroyRef, v as require_operators } from "./_resource-chunk-kBPXAreo.js";
import { t as require_cjs } from "./rxjs.js";
//#region ../node_modules/@angular/core/fesm2022/rxjs-interop.mjs
var import_cjs = require_cjs();
var import_operators = require_operators();
init_defineProperty();
init_objectSpread2();
/**
* @license Angular v22.2.0
* (c) 2010-2026 Google LLC. https://angular.dev/
* License: MIT
*/
function takeUntilDestroyed(destroyRef) {
	if (!destroyRef) {
		ngDevMode && assertInInjectionContext(takeUntilDestroyed);
		destroyRef = inject(DestroyRef);
	}
	const destroyed$ = new import_cjs.Observable((subscriber) => {
		if (destroyRef.destroyed) {
			subscriber.next();
			return;
		}
		return destroyRef.onDestroy(subscriber.next.bind(subscriber));
	});
	return (source) => {
		return source.pipe((0, import_operators.takeUntil)(destroyed$));
	};
}
var OutputFromObservableRef = class {
	constructor(source) {
		_defineProperty(this, "source", void 0);
		_defineProperty(this, "destroyed", false);
		_defineProperty(this, "destroyRef", inject(DestroyRef));
		this.source = source;
		this.destroyRef.onDestroy(() => {
			this.destroyed = true;
		});
	}
	subscribe(callbackFn) {
		if (this.destroyed) throw new RuntimeError(953, ngDevMode && "Unexpected subscription to destroyed `OutputRef`. The owning directive/component is destroyed.");
		const subscription = this.source.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: (value) => callbackFn(value) });
		return { unsubscribe: () => subscription.unsubscribe() };
	}
};
function outputFromObservable(observable, opts) {
	ngDevMode && assertInInjectionContext(outputFromObservable);
	return new OutputFromObservableRef(observable);
}
function outputToObservable(ref) {
	const destroyRef = getOutputDestroyRef(ref);
	return new import_cjs.Observable((observer) => {
		const unregisterOnDestroy = destroyRef === null || destroyRef === void 0 ? void 0 : destroyRef.onDestroy(() => observer.complete());
		const subscription = ref.subscribe((v) => observer.next(v));
		return () => {
			subscription.unsubscribe();
			unregisterOnDestroy === null || unregisterOnDestroy === void 0 || unregisterOnDestroy();
		};
	});
}
function toObservable(source, options) {
	var _options$injector;
	if (ngDevMode && !(options === null || options === void 0 ? void 0 : options.injector)) assertInInjectionContext(toObservable);
	const injector = (_options$injector = options === null || options === void 0 ? void 0 : options.injector) !== null && _options$injector !== void 0 ? _options$injector : inject(Injector);
	const subject = new import_cjs.ReplaySubject(1);
	const watcher = effect(() => {
		let value;
		try {
			value = source();
		} catch (err) {
			untracked(() => subject.error(err));
			return;
		}
		untracked(() => subject.next(value));
	}, {
		injector,
		manualCleanup: true
	});
	injector.get(DestroyRef).onDestroy(() => {
		watcher.destroy();
		subject.complete();
	});
	return subject.asObservable();
}
function toSignal(source, options) {
	var _options$injector$get, _options$injector2;
	typeof ngDevMode !== "undefined" && ngDevMode && assertNotInReactiveContext(toSignal, "Invoking `toSignal` causes new subscriptions every time. Consider moving `toSignal` outside of the reactive context and read the signal value where needed.");
	const requiresCleanup = !(options === null || options === void 0 ? void 0 : options.manualCleanup);
	if (ngDevMode && requiresCleanup && !(options === null || options === void 0 ? void 0 : options.injector)) assertInInjectionContext(toSignal);
	const cleanupRef = requiresCleanup ? (_options$injector$get = options === null || options === void 0 || (_options$injector2 = options.injector) === null || _options$injector2 === void 0 ? void 0 : _options$injector2.get(DestroyRef)) !== null && _options$injector$get !== void 0 ? _options$injector$get : inject(DestroyRef) : null;
	const equal = makeToSignalEqual(options === null || options === void 0 ? void 0 : options.equal);
	let state;
	if (options === null || options === void 0 ? void 0 : options.requireSync) state = signal({ kind: 0 }, _objectSpread2({ equal }, ngDevMode ? createDebugNameObject(options === null || options === void 0 ? void 0 : options.debugName, "state") : void 0));
	else state = signal({
		kind: 1,
		value: options === null || options === void 0 ? void 0 : options.initialValue
	}, _objectSpread2({ equal }, ngDevMode ? createDebugNameObject(options === null || options === void 0 ? void 0 : options.debugName, "state") : void 0));
	let destroyUnregisterFn;
	const sub = source.subscribe({
		next: (value) => state.set({
			kind: 1,
			value
		}),
		error: (error) => {
			state.set({
				kind: 2,
				error
			});
			destroyUnregisterFn === null || destroyUnregisterFn === void 0 || destroyUnregisterFn();
		},
		complete: () => {
			destroyUnregisterFn === null || destroyUnregisterFn === void 0 || destroyUnregisterFn();
		}
	});
	if ((options === null || options === void 0 ? void 0 : options.requireSync) && state().kind === 0) throw new RuntimeError(601, (typeof ngDevMode === "undefined" || ngDevMode) && "`toSignal()` called with `requireSync` but `Observable` did not emit synchronously.");
	destroyUnregisterFn = cleanupRef === null || cleanupRef === void 0 ? void 0 : cleanupRef.onDestroy(sub.unsubscribe.bind(sub));
	return computed(() => {
		const current = state();
		switch (current.kind) {
			case 1: return current.value;
			case 2: throw current.error;
			case 0: throw new RuntimeError(601, (typeof ngDevMode === "undefined" || ngDevMode) && "`toSignal()` called with `requireSync` but `Observable` did not emit synchronously.");
		}
	}, _objectSpread2({ equal: options === null || options === void 0 ? void 0 : options.equal }, ngDevMode ? createDebugNameObject(options === null || options === void 0 ? void 0 : options.debugName, "source") : void 0));
}
function makeToSignalEqual(userEquality = Object.is) {
	return (a, b) => a.kind === 1 && b.kind === 1 && userEquality(a.value, b.value);
}
function createDebugNameObject(toSignalDebugName, internalSignalDebugName) {
	return { debugName: `toSignal${toSignalDebugName ? "#" + toSignalDebugName : ""}.${internalSignalDebugName}` };
}
function pendingUntilEvent(injector) {
	if (injector === void 0) {
		ngDevMode && assertInInjectionContext(pendingUntilEvent);
		injector = inject(Injector);
	}
	const taskService = injector.get(PendingTasks);
	return (sourceObservable) => {
		return new import_cjs.Observable((originalSubscriber) => {
			const removeTask = taskService.add();
			let cleanedUp = false;
			function cleanupTask() {
				if (cleanedUp) return;
				removeTask();
				cleanedUp = true;
			}
			const innerSubscription = sourceObservable.subscribe({
				next: (v) => {
					originalSubscriber.next(v);
					cleanupTask();
				},
				complete: () => {
					originalSubscriber.complete();
					cleanupTask();
				},
				error: (e) => {
					originalSubscriber.error(e);
					cleanupTask();
				}
			});
			innerSubscription.add(() => {
				originalSubscriber.unsubscribe();
				cleanupTask();
			});
			return innerSubscription;
		});
	};
}
function rxResource(opts) {
	if (ngDevMode && !(opts === null || opts === void 0 ? void 0 : opts.injector)) assertInInjectionContext(rxResource);
	return resource(_objectSpread2(_objectSpread2({}, opts), {}, {
		loader: void 0,
		stream: (params) => {
			let sub;
			let aborted = false;
			const stream = signal({ value: void 0 });
			const { resolve, promise } = promiseWithResolvers();
			let hasResolved = false;
			function resolveOnce() {
				if (!hasResolved) {
					hasResolved = true;
					resolve(stream);
				}
			}
			const onAbort = () => {
				aborted = true;
				sub === null || sub === void 0 || sub.unsubscribe();
				params.abortSignal.removeEventListener("abort", onAbort);
				resolveOnce();
			};
			params.abortSignal.addEventListener("abort", onAbort);
			function send(value) {
				stream.set(value);
				resolveOnce();
			}
			const streamFn = opts.stream;
			if (streamFn === void 0) throw new RuntimeError(990, ngDevMode && `Must provide \`stream\` option.`);
			sub = streamFn(params).subscribe({
				next: (value) => send({ value }),
				error: (error) => {
					send({ error: encapsulateResourceError(error) });
					params.abortSignal.removeEventListener("abort", onAbort);
				},
				complete: () => {
					if (!hasResolved) send({ error: new RuntimeError(-991, ngDevMode && "Resource completed before producing a value") });
					params.abortSignal.removeEventListener("abort", onAbort);
				}
			});
			if (aborted) sub.unsubscribe();
			if (hasResolved) return stream;
			return promise;
		}
	}));
}
//#endregion
export { outputFromObservable, outputToObservable, pendingUntilEvent, rxResource, takeUntilDestroyed, toObservable, toSignal };

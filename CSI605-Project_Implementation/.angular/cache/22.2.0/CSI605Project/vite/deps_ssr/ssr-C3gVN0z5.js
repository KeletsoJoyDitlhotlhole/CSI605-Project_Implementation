import { a as __toESM } from "./rolldown-runtime-CbG-q-O0.js";
import { i as init_defineProperty, n as init_objectSpread2, r as _defineProperty, t as _objectSpread2 } from "./objectSpread2-BY0ivYo0.js";
import { Cr as inject, G as INTERNAL_APPLICATION_ERROR_HANDLER, K as InjectionToken, L as EnvironmentInjector, O as DOCUMENT, S as APP_ID, Ti as runInInjectionContext, b as init_asyncToGenerator, ca as ɵɵdefineInjectable, fa as ɵɵinject, ft as RuntimeError, hi as provideEnvironmentInitializer, ht as TransferState, la as ɵɵdefineInjector, oi as makeEnvironmentProviders, ot as PLATFORM_ID, q as Injector, st as PLATFORM_INITIALIZER, w as CSP_NONCE, y as _asyncToGenerator } from "./_resource-chunk-kBPXAreo.js";
import { $s as init_objectWithoutProperties, Ai as setClassMetadata, Ci as resetCompiledComponents, E as annotateForHydration, En as LOCALE_ID, F as createPlatformFactory, Ga as ɵɵdefineNgModule, Jn as SSR_CONTENT_INTEGRITY_MARKER, Kt as Compiler, Mi as setDocument, Nn as NgModule, Nr as createEnvironmentInjector, Qs as _objectWithoutProperties, Qt as Console$1, Vt as ApplicationRef, Wn as Renderer2, ar as Testability, b as REQUEST_CONTEXT, bn as Inject, er as TESTABILITY, ht as stopMeasuring, mt as startMeasuring, ot as platformCore, s as ENABLE_ROOT_COMPONENT_BOOTSTRAP, vn as IS_HYDRATION_DOM_REUSE_ENABLED, x as RESPONSE_INIT, xn as Injectable, y as REQUEST } from "./core-Bhv_s4HI.js";
import { t as require_cjs } from "./rxjs.js";
import { c as setRootDomAdapter, o as PlatformLocation, s as getDOM, t as XhrFactory } from "./_xhr-chunk-DJdAAO3l.js";
import { At as APP_BASE_HREF, i as NullViewportScroller, l as ViewportScroller, o as PLATFORM_SERVER_ID } from "./common-B4pH5g9G.js";
import { a as HTTP_FETCH_MAX_RESPONSE_SIZE, s as HTTP_ROOT_INTERCEPTOR_FNS } from "./http-W--UnCno.js";
import { A as EventManagerPlugin, O as EVENT_MANAGER_PLUGINS, b as BrowserModule, v as BrowserDomAdapter } from "./platform-browser-C0p_Tign.js";
import { t as index } from "./bundled-domino-CdyXFVJk.js";
import { M as ActivatedRoute, kt as loadChildren, lt as Router, nt as ROUTES } from "./router-DYLnJa5c.js";
//#region ../node_modules/@angular/ssr/fesm2022/_validation-chunk.mjs
var TRUST_ALL_PROXY_HEADERS = "*";
var HOST_HEADERS_TO_VALIDATE = ["host", "x-forwarded-host"];
var VALID_PORT_REGEX = /^\d+$/;
var VALID_PROTO_REGEX = /^https?$/i;
var VALID_PREFIX_REGEX = /^\/([a-z0-9_-]+\/)*[a-z0-9_-]*$/i;
function getFirstHeaderValue(value) {
	var _value$toString$split;
	return value === null || value === void 0 || (_value$toString$split = value.toString().split(",", 1)[0]) === null || _value$toString$split === void 0 ? void 0 : _value$toString$split.trim();
}
function validateRequest(request, allowedHosts, disableHostCheck) {
	validateHeaders(request, allowedHosts, disableHostCheck);
	if (!disableHostCheck) validateUrl(new URL(request.url), allowedHosts);
}
function validateUrl(url, allowedHosts) {
	const { hostname } = url;
	if (!isHostAllowed$1(hostname, allowedHosts)) throw new Error(`URL with hostname "${hostname}" is not allowed.`);
}
function sanitizeRequestHeaders(request, trustProxyHeaders) {
	let headersDeleted = false;
	const headers = new Headers();
	for (const [key, value] of request.headers) {
		const lowerKey = key.toLowerCase();
		if ((lowerKey === "forwarded" || lowerKey.startsWith("x-forwarded-")) && !isProxyHeaderAllowed(lowerKey, trustProxyHeaders)) {
			console.warn(`Received "${key}" header but "trustProxyHeaders" was not set up to allow it.\nFor more information, see https://angular.dev/best-practices/security#configuring-trusted-proxy-headers`);
			headersDeleted = true;
		} else headers.set(key, value);
	}
	return headersDeleted ? new Request(request, { headers }) : request;
}
function verifyHostAllowed(headerName, headerValue, allowedHosts) {
	const url = `http://${headerValue}`;
	if (!URL.canParse(url)) throw new Error(`Header "${headerName}" contains an invalid value and cannot be parsed.`);
	const { hostname, pathname, search, hash, username, password } = new URL(url);
	if (pathname !== "/" || search || hash || username || password) throw new Error(`Header "${headerName}" with value "${headerValue}" contains characters that are not allowed.`);
	if (!isHostAllowed$1(hostname, allowedHosts)) throw new Error(`Header "${headerName}" with value "${headerValue}" is not allowed.`);
}
function isHostAllowed$1(hostname, allowedHosts) {
	if (allowedHosts.has("*") || allowedHosts.has(hostname)) return true;
	for (const allowedHost of allowedHosts) {
		if (!allowedHost.startsWith("*.")) continue;
		const domain = allowedHost.slice(1);
		if (hostname.endsWith(domain)) return true;
	}
	return false;
}
function validateHeaders(request, allowedHosts, disableHostCheck) {
	const headers = request.headers;
	for (const headerName of HOST_HEADERS_TO_VALIDATE) {
		const headerValue = getFirstHeaderValue(headers.get(headerName));
		if (headerValue && !disableHostCheck) verifyHostAllowed(headerName, headerValue, allowedHosts);
	}
	const forwarded = headers.get("forwarded");
	if (forwarded) {
		const forwardedParams = parseForwardedHeader(forwarded);
		if (forwardedParams.host && !disableHostCheck) verifyHostAllowed("Forwarded \"host\"", forwardedParams.host, allowedHosts);
		if (forwardedParams.proto && !VALID_PROTO_REGEX.test(forwardedParams.proto)) throw new Error("Header \"forwarded\" proto parameter must be either \"http\" or \"https\".");
	}
	const xForwardedPort = getFirstHeaderValue(headers.get("x-forwarded-port"));
	if (xForwardedPort && !VALID_PORT_REGEX.test(xForwardedPort)) throw new Error("Header \"x-forwarded-port\" must be a numeric value.");
	const xForwardedProto = getFirstHeaderValue(headers.get("x-forwarded-proto"));
	if (xForwardedProto && !VALID_PROTO_REGEX.test(xForwardedProto)) throw new Error("Header \"x-forwarded-proto\" must be either \"http\" or \"https\".");
	const xForwardedPrefix = getFirstHeaderValue(headers.get("x-forwarded-prefix"));
	if (xForwardedPrefix && !VALID_PREFIX_REGEX.test(xForwardedPrefix)) throw new Error("Header \"x-forwarded-prefix\" is invalid. It must start with a \"/\" and contain only alphanumeric characters, hyphens, and underscores, separated by single slashes.");
}
function isProxyHeaderAllowed(headerName, trustProxyHeaders) {
	return trustProxyHeaders.has(TRUST_ALL_PROXY_HEADERS) || trustProxyHeaders.has(headerName.toLowerCase());
}
function normalizeTrustProxyHeaders(trustProxyHeaders) {
	if (!trustProxyHeaders) return /* @__PURE__ */ new Set();
	if (trustProxyHeaders === true) return /* @__PURE__ */ new Set([TRUST_ALL_PROXY_HEADERS]);
	const normalizedTrustedProxyHeaders = /* @__PURE__ */ new Set();
	for (const header of trustProxyHeaders) {
		const lowerHeader = header.toLowerCase();
		if (lowerHeader === TRUST_ALL_PROXY_HEADERS) throw new Error(`"${TRUST_ALL_PROXY_HEADERS}" is not allowed as a value for the "trustProxyHeaders" option.`);
		if (!(lowerHeader === "forwarded" || lowerHeader.startsWith("x-forwarded-"))) throw new Error(`"${header}" is not a valid proxy header. Trusted proxy headers must be "forwarded" or start with "x-forwarded-".`);
		normalizedTrustedProxyHeaders.add(lowerHeader);
	}
	return normalizedTrustedProxyHeaders;
}
function parseForwardedHeader(headerValue) {
	if (!headerValue) return {};
	const params = {};
	let inQuotes = false;
	let escaped = false;
	let currentKey = "";
	let currentValue = "";
	let isParsingValue = false;
	let isKeyEnded = false;
	let isParsingValueEnded = false;
	for (const char of headerValue) {
		if (escaped) {
			escaped = false;
			if (isParsingValue) currentValue += char;
			else currentKey += char;
			continue;
		}
		if (char === "\\") {
			if (inQuotes) escaped = true;
			else if (isParsingValue) currentValue += char;
			else currentKey += char;
			continue;
		}
		if (char === "\"") {
			inQuotes = !inQuotes;
			continue;
		}
		if (inQuotes) {
			if (isParsingValue) currentValue += char;
			else currentKey += char;
			continue;
		}
		if (char === ",") {
			addParam(currentKey, currentValue, isParsingValue, params);
			break;
		}
		if (char === ";") {
			addParam(currentKey, currentValue, isParsingValue, params);
			currentKey = "";
			currentValue = "";
			isParsingValue = false;
			isKeyEnded = false;
			isParsingValueEnded = false;
			continue;
		}
		if (char === "=") {
			if (!isParsingValue) isParsingValue = true;
			else currentValue += char;
			continue;
		}
		if (char === " " || char === "	") {
			if (isParsingValue) {
				if (currentValue.length > 0) isParsingValueEnded = true;
			} else if (currentKey.length > 0) isKeyEnded = true;
			continue;
		}
		if (isParsingValue) {
			if (!isParsingValueEnded) currentValue += char;
		} else if (isKeyEnded) {
			currentKey = char;
			isKeyEnded = false;
		} else currentKey += char;
	}
	if (currentKey || currentValue || isParsingValue) addParam(currentKey, currentValue, isParsingValue, params);
	return params;
}
function addParam(key, value, hasValue, params) {
	if (!hasValue) return;
	const trimmedKey = key.trim().toLowerCase();
	if (trimmedKey) params[trimmedKey] = value;
}
//#endregion
//#region ../node_modules/@angular/platform-server/fesm2022/_server-chunk.mjs
/**
* @license Angular v22.2.0
* (c) 2010-2026 Google LLC. https://angular.dev/
* License: MIT
*/
var import_cjs = require_cjs();
init_defineProperty();
init_asyncToGenerator();
var _PlatformState;
var _ServerXhr;
var _ServerPlatformLocation;
var _ServerEventManagerPlugin;
var _ServerModule;
function setDomTypes() {
	Object.assign(globalThis, index.impl);
	globalThis["KeyboardEvent"] = index.impl.Event;
}
function parseDocument(html, url = "/") {
	return index.createWindow(html, url).document;
}
function serializeDocument(doc) {
	return doc.serialize();
}
var DominoAdapter = class DominoAdapter extends BrowserDomAdapter {
	constructor(..._args) {
		super(..._args);
		_defineProperty(this, "supportsDOMEvents", false);
	}
	static makeCurrent() {
		setDomTypes();
		setRootDomAdapter(new DominoAdapter());
	}
	createHtmlDocument() {
		return parseDocument("<html><head><title>fakeTitle</title></head><body></body></html>");
	}
	getDefaultDocument() {
		if (!DominoAdapter.defaultDoc) DominoAdapter.defaultDoc = index.createDocument();
		return DominoAdapter.defaultDoc;
	}
	isElementNode(node) {
		return node ? node.nodeType === DominoAdapter.defaultDoc.ELEMENT_NODE : false;
	}
	isShadowRoot(node) {
		return node.shadowRoot == node;
	}
	getGlobalEventTarget(doc, target) {
		if (target === "window") return doc.defaultView;
		if (target === "document") return doc;
		if (target === "body") return doc.body;
		return null;
	}
	getBaseHref(doc) {
		const length = doc.head.children.length;
		for (let i = 0; i < length; i++) {
			const child = doc.head.children[i];
			if (child.tagName === "BASE") return child.getAttribute("href") || "";
		}
		return "";
	}
	dispatchEvent(el, evt) {
		el.dispatchEvent(evt);
		const win = (el.ownerDocument || el).defaultView;
		if (win) win.dispatchEvent(evt);
	}
	getUserAgent() {
		return "Fake user agent";
	}
	getCookie(name) {
		throw new RuntimeError(5700, (typeof ngDevMode === "undefined" || ngDevMode) && "getCookie has not been implemented");
	}
};
_defineProperty(DominoAdapter, "defaultDoc", void 0);
var INITIAL_CONFIG = new InjectionToken("Server.INITIAL_CONFIG");
var BEFORE_APP_SERIALIZED = new InjectionToken("Server.RENDER_MODULE_HOOK");
var ENABLE_DOM_EMULATION = new InjectionToken("ENABLE_DOM_EMULATION");
var PlatformState = class {
	constructor(_doc) {
		_defineProperty(this, "_doc", void 0);
		_defineProperty(this, "_enableDomEmulation", enableDomEmulation(inject(Injector)));
		this._doc = _doc;
	}
	renderToString() {
		var _window;
		if (ngDevMode && !this._enableDomEmulation && !((_window = window) === null || _window === void 0 ? void 0 : _window.document)) throw new RuntimeError(5704, (typeof ngDevMode === "undefined" || ngDevMode) && "Disabled DOM emulation should only run in browser environments");
		const measuringLabel = "renderToString";
		startMeasuring(measuringLabel);
		const rendered = this._enableDomEmulation ? serializeDocument(this._doc) : this._doc.documentElement.outerHTML;
		stopMeasuring(measuringLabel);
		return rendered;
	}
	getDocument() {
		return this._doc;
	}
};
_PlatformState = PlatformState;
_defineProperty(PlatformState, "ɵfac", function PlatformState_Factory(__ngFactoryType__) {
	return new (__ngFactoryType__ || _PlatformState)(ɵɵinject(DOCUMENT));
});
_defineProperty(PlatformState, "ɵprov", /*@__PURE__*/ ɵɵdefineInjectable({
	token: _PlatformState,
	factory: _PlatformState.ɵfac
}));
(() => {
	(typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(PlatformState, [{ type: Injectable }], () => [{
		type: void 0,
		decorators: [{
			type: Inject,
			args: [DOCUMENT]
		}]
	}], null);
})();
function enableDomEmulation(injector) {
	return injector.get(ENABLE_DOM_EMULATION, true);
}
var HTTP_OR_HTTPS_PROTOCOL_REGEXP = /^https?:/i;
var HTTP_OR_HTTPS_NO_AUTHORITY_REGEXP = /^https?:(?![/\\]{2})/i;
function resolveUrl(urlStr, origin, options = {}) {
	const originUrl = typeof origin === "string" ? new URL("/", origin) : origin;
	if (!urlStr) return originUrl || null;
	let resolved;
	if (!originUrl || !HTTP_OR_HTTPS_NO_AUTHORITY_REGEXP.test(urlStr)) try {
		resolved = new URL(urlStr);
	} catch (_unused) {}
	const { allowProtocolRelative = false, allowOriginChange = true } = options;
	if (resolved) {
		if (originUrl && !isSafeOriginChange(resolved, originUrl, urlStr, allowOriginChange)) throwSuspiciousUrlError(urlStr);
		return resolved;
	}
	if (!URL.canParse(urlStr, "http://fake")) throw new RuntimeError(5701, typeof ngDevMode === "undefined" || ngDevMode ? `Invalid URL: ${urlStr}` : urlStr);
	if (!originUrl) return null;
	if (urlStr.startsWith("//")) {
		if (!allowProtocolRelative) throw new RuntimeError(5702, typeof ngDevMode === "undefined" || ngDevMode ? `Protocol relative URLs are not allowed in this context. URL: ${urlStr}` : urlStr);
		return new URL(urlStr, origin);
	}
	resolved = new URL(urlStr, origin);
	if (!isSafeOriginChange(resolved, originUrl, urlStr, allowOriginChange)) throwSuspiciousUrlError(urlStr);
	return resolved;
}
function throwSuspiciousUrlError(urlStr) {
	throw new RuntimeError(-5703, typeof ngDevMode === "undefined" || ngDevMode ? `URL ${urlStr} changed origin unexpectedly. This is suspicious and may indicate a security bypass attempt.` : urlStr);
}
function isSafeOriginChange(resolved, origin, urlStr, allowOriginChange) {
	if (origin.origin === resolved.origin) return true;
	if (!allowOriginChange) return false;
	return HTTP_OR_HTTPS_PROTOCOL_REGEXP.test(urlStr) && !HTTP_OR_HTTPS_NO_AUTHORITY_REGEXP.test(urlStr);
}
var ServerXhr = class {
	constructor() {
		_defineProperty(this, "xhrImpl", void 0);
	}
	ɵloadImpl() {
		var _this = this;
		return _asyncToGenerator(function* () {
			if (!_this.xhrImpl) {
				if (typeof ngDevMode === "undefined" || ngDevMode) console.warn("XHR support in `@angular/platform-server` is deprecated and will be removed in Angular 23. It has known security and performance issues in server environments, such as forwarding `Authorization` headers on cross-origin redirects and susceptibility to denial-of-service (DoS) via redirect loops. Please use the HttpClient fetch backend instead, which is the default since Angular 22.");
				const { default: xhr } = yield import("./xhr2-C-hxORP5.js").then((m) => /* @__PURE__ */ __toESM(m.default, 1));
				_this.xhrImpl = xhr;
			}
		})();
	}
	build() {
		const impl = this.xhrImpl;
		if (!impl) throw new RuntimeError(5705, (typeof ngDevMode === "undefined" || ngDevMode) && "Unexpected state in ServerXhr: XHR implementation is not loaded.");
		return new impl.XMLHttpRequest();
	}
};
_ServerXhr = ServerXhr;
_defineProperty(ServerXhr, "ɵfac", function ServerXhr_Factory(__ngFactoryType__) {
	return new (__ngFactoryType__ || _ServerXhr)();
});
_defineProperty(ServerXhr, "ɵprov", /*@__PURE__*/ ɵɵdefineInjectable({
	token: _ServerXhr,
	factory: _ServerXhr.ɵfac
}));
(() => {
	(typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(ServerXhr, [{ type: Injectable }], null, null);
})();
var URL_SCHEMA_REGEXP = /^(?:[a-zA-Z][a-zA-Z0-9+\-.]*:)/;
function relativeUrlsTransformerInterceptorFn(request, next) {
	if (URL_SCHEMA_REGEXP.test(request.url) && !HTTP_OR_HTTPS_NO_AUTHORITY_REGEXP.test(request.url)) return next(request);
	const platformLocation = inject(PlatformLocation);
	const { href, protocol, hostname, port } = platformLocation;
	if (!protocol.startsWith("http")) return next(request);
	let urlPrefix = `${protocol}//${hostname}`;
	if (port) urlPrefix += `:${port}`;
	const baseHref = platformLocation.getBaseHrefFromDOM() || href;
	const baseUrl = new URL(baseHref, urlPrefix);
	const parsedUrl = resolveUrl(request.url, baseUrl, { allowProtocolRelative: true });
	return next(request.clone({ url: parsedUrl.toString() }));
}
var SERVER_HTTP_PROVIDERS = [{
	provide: XhrFactory,
	useClass: ServerXhr
}, {
	provide: HTTP_ROOT_INTERCEPTOR_FNS,
	useValue: relativeUrlsTransformerInterceptorFn,
	multi: true
}];
var ServerPlatformLocation = class {
	constructor() {
		_defineProperty(this, "href", "/");
		_defineProperty(this, "hostname", "/");
		_defineProperty(this, "protocol", "/");
		_defineProperty(this, "port", "/");
		_defineProperty(this, "pathname", "/");
		_defineProperty(this, "search", "");
		_defineProperty(this, "hash", "");
		_defineProperty(this, "_hashUpdate", new import_cjs.Subject());
		_defineProperty(this, "_doc", inject(DOCUMENT));
		_defineProperty(this, "origin", this._doc.location.origin);
		const config = inject(INITIAL_CONFIG, { optional: true });
		if (!config) return;
		if (config.url) {
			const { protocol, hostname, port, pathname, search, hash, href, origin } = resolveUrl(config.url, this.origin);
			this.protocol = protocol;
			this.hostname = hostname;
			this.port = port;
			this.pathname = pathname;
			this.search = search;
			this.hash = hash;
			this.href = href;
			this.origin = origin;
		}
	}
	getBaseHrefFromDOM() {
		return getDOM().getBaseHref(this._doc);
	}
	onPopState(fn) {
		return () => {};
	}
	onHashChange(fn) {
		const subscription = this._hashUpdate.subscribe(fn);
		return () => subscription.unsubscribe();
	}
	get url() {
		return `${this.pathname}${this.search}${this.hash}`;
	}
	setHash(value, oldUrl) {
		if (this.hash === value) return;
		this.hash = value;
		const newUrl = this.url;
		queueMicrotask(() => this._hashUpdate.next({
			type: "hashchange",
			state: null,
			oldUrl,
			newUrl
		}));
	}
	replaceState(state, title, newUrl) {
		const oldUrl = this.url;
		const { pathname, search, hash, href, protocol } = resolveUrl(newUrl, this.origin, { allowOriginChange: false });
		const writableThis = this;
		writableThis.pathname = pathname;
		writableThis.search = search;
		writableThis.href = href;
		writableThis.protocol = protocol;
		this.setHash(hash, oldUrl);
	}
	pushState(state, title, newUrl) {
		this.replaceState(state, title, newUrl);
	}
	forward() {
		throw new Error("Not implemented");
	}
	back() {
		throw new Error("Not implemented");
	}
	getState() {}
};
_ServerPlatformLocation = ServerPlatformLocation;
_defineProperty(ServerPlatformLocation, "ɵfac", function ServerPlatformLocation_Factory(__ngFactoryType__) {
	return new (__ngFactoryType__ || _ServerPlatformLocation)();
});
_defineProperty(ServerPlatformLocation, "ɵprov", /*@__PURE__*/ ɵɵdefineInjectable({
	token: _ServerPlatformLocation,
	factory: _ServerPlatformLocation.ɵfac
}));
(() => {
	(typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(ServerPlatformLocation, [{ type: Injectable }], () => [], null);
})();
var ServerEventManagerPlugin = class extends EventManagerPlugin {
	constructor(doc) {
		super(doc);
		_defineProperty(this, "doc", void 0);
		this.doc = doc;
	}
	supports(eventName) {
		return true;
	}
	addEventListener(element, eventName, handler, options) {
		return getDOM().onAndCancel(element, eventName, handler, options);
	}
};
_ServerEventManagerPlugin = ServerEventManagerPlugin;
_defineProperty(ServerEventManagerPlugin, "ɵfac", function ServerEventManagerPlugin_Factory(__ngFactoryType__) {
	return new (__ngFactoryType__ || _ServerEventManagerPlugin)(ɵɵinject(DOCUMENT));
});
_defineProperty(ServerEventManagerPlugin, "ɵprov", /*@__PURE__*/ ɵɵdefineInjectable({
	token: _ServerEventManagerPlugin,
	factory: _ServerEventManagerPlugin.ɵfac
}));
(() => {
	(typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(ServerEventManagerPlugin, [{ type: Injectable }], () => [{
		type: void 0,
		decorators: [{
			type: Inject,
			args: [DOCUMENT]
		}]
	}], null);
})();
var TRANSFER_STATE_STATUS = new InjectionToken(typeof ngDevMode === "undefined" || ngDevMode ? "TRANSFER_STATE_STATUS" : "", { factory: () => ({ serialized: false }) });
var TRANSFER_STATE_SERIALIZATION_PROVIDERS = [{
	provide: BEFORE_APP_SERIALIZED,
	useFactory: serializeTransferStateFactory,
	multi: true
}];
function createScript(doc, textContent, nonce) {
	const script = doc.createElement("script");
	script.textContent = textContent;
	if (nonce) script.setAttribute("nonce", nonce);
	return script;
}
function warnIfStateTransferHappened(injector) {
	const transferStateStatus = injector.get(TRANSFER_STATE_STATUS);
	if (transferStateStatus.serialized) console.warn("Angular detected an incompatible configuration, which causes duplicate serialization of the server-side application state.\n\nThis can happen if the server providers have been provided more than once using different mechanisms. For example:\n\n  imports: [ServerModule], // Registers server providers\n  providers: [provideServerRendering()] // Also registers server providers\n\nTo fix this, ensure that the `provideServerRendering()` function is the only provider used and remove the other(s).");
	transferStateStatus.serialized = true;
}
function serializeTransferStateFactory() {
	const doc = inject(DOCUMENT);
	const appId = inject(APP_ID);
	const transferStore = inject(TransferState);
	const injector = inject(Injector);
	return () => {
		const measuringLabel = "serializeTransferStateFactory";
		startMeasuring(measuringLabel);
		const content = transferStore.toJson();
		if (transferStore.isEmpty) return;
		if (typeof ngDevMode !== "undefined" && ngDevMode) warnIfStateTransferHappened(injector);
		const script = createScript(doc, content, null);
		script.id = appId + "-state";
		script.setAttribute("type", "application/json");
		doc.body.appendChild(script);
		stopMeasuring(measuringLabel);
	};
}
var INTERNAL_SERVER_PLATFORM_PROVIDERS = [
	{
		provide: DOCUMENT,
		useFactory: _document
	},
	{
		provide: PLATFORM_ID,
		useValue: PLATFORM_SERVER_ID
	},
	{
		provide: PLATFORM_INITIALIZER,
		useFactory: initDominoAdapter,
		multi: true
	},
	{
		provide: PlatformLocation,
		useClass: ServerPlatformLocation,
		deps: []
	},
	{
		provide: PlatformState,
		deps: [DOCUMENT]
	}
];
function initDominoAdapter() {
	const _enableDomEmulation = enableDomEmulation(inject(Injector));
	return () => {
		if (_enableDomEmulation) DominoAdapter.makeCurrent();
		else BrowserDomAdapter.makeCurrent();
	};
}
var PLATFORM_SERVER_PROVIDERS = [
	TRANSFER_STATE_SERIALIZATION_PROVIDERS,
	[{
		provide: EVENT_MANAGER_PLUGINS,
		multi: true,
		useClass: ServerEventManagerPlugin
	}],
	SERVER_HTTP_PROVIDERS,
	{
		provide: Testability,
		useValue: null
	},
	{
		provide: TESTABILITY,
		useValue: null
	},
	{
		provide: ViewportScroller,
		useClass: NullViewportScroller
	}
];
var ServerModule = class {};
_ServerModule = ServerModule;
_defineProperty(ServerModule, "ɵfac", function ServerModule_Factory(__ngFactoryType__) {
	return new (__ngFactoryType__ || _ServerModule)();
});
_defineProperty(ServerModule, "ɵmod", /*@__PURE__*/ ɵɵdefineNgModule({
	type: _ServerModule,
	exports: [BrowserModule]
}));
_defineProperty(ServerModule, "ɵinj", /*@__PURE__*/ ɵɵdefineInjector({
	providers: PLATFORM_SERVER_PROVIDERS,
	imports: [BrowserModule]
}));
(() => {
	(typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(ServerModule, [{
		type: NgModule,
		args: [{
			exports: [BrowserModule],
			providers: PLATFORM_SERVER_PROVIDERS
		}]
	}], null, null);
})();
function _document() {
	const injector = inject(Injector);
	const config = injector.get(INITIAL_CONFIG, null);
	const _enableDomEmulation = enableDomEmulation(injector);
	let document;
	if (config && config.document) document = typeof config.document === "string" ? _enableDomEmulation ? parseDocument(config.document, config.url !== void 0 ? resolveUrl(config.url, "http://localhost").href : void 0) : window.document : config.document;
	else document = getDOM().createHtmlDocument();
	setDocument(document);
	return document;
}
function platformServer(extraProviders) {
	return createPlatformFactory(platformCore, "server", INTERNAL_SERVER_PLATFORM_PROVIDERS)(extraProviders);
}
//#endregion
//#region ../node_modules/@angular/platform-server/fesm2022/platform-server.mjs
/**
* @license Angular v22.2.0
* (c) 2010-2026 Google LLC. https://angular.dev/
* License: MIT
*/
init_asyncToGenerator();
function provideServerRendering$1(options) {
	const providers = [...PLATFORM_SERVER_PROVIDERS];
	if (options === null || options === void 0 ? void 0 : options.maxResponseBodySize) providers.push({
		provide: HTTP_FETCH_MAX_RESPONSE_SIZE,
		useValue: options.maxResponseBodySize
	});
	return makeEnvironmentProviders(providers);
}
var EVENT_DISPATCH_SCRIPT_ID = "ng-event-dispatch-contract";
function createServerPlatform(options) {
	var _options$platformProv;
	const extraProviders = (_options$platformProv = options.platformProviders) !== null && _options$platformProv !== void 0 ? _options$platformProv : [];
	const measuringLabel = "createServerPlatform";
	startMeasuring(measuringLabel);
	const { document, url } = options;
	const platform = platformServer([{
		provide: INITIAL_CONFIG,
		useValue: {
			document,
			url
		}
	}, extraProviders]);
	stopMeasuring(measuringLabel);
	return platform;
}
function findEventDispatchScript(doc) {
	return doc.getElementById(EVENT_DISPATCH_SCRIPT_ID);
}
function removeEventDispatchScript(doc) {
	var _findEventDispatchScr;
	(_findEventDispatchScr = findEventDispatchScript(doc)) === null || _findEventDispatchScr === void 0 || _findEventDispatchScr.remove();
}
function prepareForHydration(platformState, applicationRef) {
	const measuringLabel = "prepareForHydration";
	startMeasuring(measuringLabel);
	const environmentInjector = applicationRef.injector;
	const doc = platformState.getDocument();
	if (!environmentInjector.get(IS_HYDRATION_DOM_REUSE_ENABLED, false)) {
		removeEventDispatchScript(doc);
		return;
	}
	appendSsrContentIntegrityMarker(doc);
	const eventTypesToReplay = annotateForHydration(applicationRef, doc);
	if (eventTypesToReplay.regular.size || eventTypesToReplay.capture.size) insertEventRecordScript(environmentInjector.get(APP_ID), doc, eventTypesToReplay, environmentInjector.get(CSP_NONCE, null));
	else removeEventDispatchScript(doc);
	stopMeasuring(measuringLabel);
}
function appendSsrContentIntegrityMarker(doc) {
	const comment = doc.createComment(SSR_CONTENT_INTEGRITY_MARKER);
	doc.body.firstChild ? doc.body.insertBefore(comment, doc.body.firstChild) : doc.body.append(comment);
}
function appendServerContextInfo(applicationRef) {
	const injector = applicationRef.injector;
	let serverContext = sanitizeServerContext(injector.get(SERVER_CONTEXT, DEFAULT_SERVER_CONTEXT));
	applicationRef.components.forEach((componentRef) => {
		const renderer = componentRef.injector.get(Renderer2);
		const element = componentRef.location.nativeElement;
		if (element) renderer.setAttribute(element, "ng-server-context", serverContext);
	});
}
function insertEventRecordScript(appId, doc, eventTypesToReplay, nonce) {
	const measuringLabel = "insertEventRecordScript";
	startMeasuring(measuringLabel);
	const { regular, capture } = eventTypesToReplay;
	const eventDispatchScript = findEventDispatchScript(doc);
	if (eventDispatchScript) {
		const replayScript = createScript(doc, `window.__jsaction_bootstrap(document.body,"${appId}",${JSON.stringify(Array.from(regular))},${JSON.stringify(Array.from(capture))});`, nonce);
		eventDispatchScript.after(replayScript);
	}
	stopMeasuring(measuringLabel);
}
function renderInternal(_x, _x2) {
	return _renderInternal.apply(this, arguments);
}
function _renderInternal() {
	_renderInternal = _asyncToGenerator(function* (platformRef, applicationRef) {
		const platformState = platformRef.injector.get(PlatformState);
		prepareForHydration(platformState, applicationRef);
		appendServerContextInfo(applicationRef);
		const environmentInjector = applicationRef.injector;
		const errorHandler = environmentInjector.get(INTERNAL_APPLICATION_ERROR_HANDLER);
		const callbacks = environmentInjector.get(BEFORE_APP_SERIALIZED, null);
		if (callbacks) {
			const asyncCallbacks = [];
			for (const callback of callbacks) try {
				const callbackResult = callback();
				if (callbackResult) asyncCallbacks.push(callbackResult);
			} catch (e) {
				errorHandler(e);
			}
			if (asyncCallbacks.length) {
				for (const result of yield Promise.allSettled(asyncCallbacks)) if (result.status === "rejected") errorHandler(result.reason);
			}
		}
		return platformState.renderToString();
	});
	return _renderInternal.apply(this, arguments);
}
function asyncDestroyPlatform$1(platformRef) {
	return new Promise((resolve) => {
		setTimeout(() => {
			platformRef.destroy();
			resolve();
		}, 0);
	});
}
var DEFAULT_SERVER_CONTEXT = "other";
var SERVER_CONTEXT = new InjectionToken("SERVER_CONTEXT");
function sanitizeServerContext(serverContext) {
	const context = serverContext.replace(/[^a-zA-Z0-9\-]/g, "");
	return context.length > 0 ? context : DEFAULT_SERVER_CONTEXT;
}
function renderModule(_x3, _x4) {
	return _renderModule.apply(this, arguments);
}
function _renderModule() {
	_renderModule = _asyncToGenerator(function* (moduleType, options) {
		const { document, url, extraProviders: platformProviders, allowedHosts } = options;
		validateAllowedHosts(url, allowedHosts);
		const platformRef = createServerPlatform({
			document,
			url,
			platformProviders
		});
		try {
			const applicationRef = (yield platformRef.bootstrapModule(moduleType)).injector.get(ApplicationRef);
			const measuringLabel = "whenStable";
			startMeasuring(measuringLabel);
			yield applicationRef.whenStable();
			stopMeasuring(measuringLabel);
			return yield renderInternal(platformRef, applicationRef);
		} finally {
			yield asyncDestroyPlatform$1(platformRef);
		}
	});
	return _renderModule.apply(this, arguments);
}
function renderApplication(_x5, _x6) {
	return _renderApplication.apply(this, arguments);
}
function _renderApplication() {
	_renderApplication = _asyncToGenerator(function* (bootstrap, options) {
		const renderAppLabel = "renderApplication";
		const bootstrapLabel = "bootstrap";
		const _renderLabel = "_render";
		const { url, allowedHosts } = options;
		validateAllowedHosts(url, allowedHosts);
		startMeasuring(renderAppLabel);
		const platformRef = createServerPlatform(options);
		try {
			startMeasuring(bootstrapLabel);
			const applicationRef = yield bootstrap({ platformRef });
			stopMeasuring(bootstrapLabel);
			startMeasuring(_renderLabel);
			const measuringLabel = "whenStable";
			startMeasuring(measuringLabel);
			yield applicationRef.whenStable();
			stopMeasuring(measuringLabel);
			const rendered = yield renderInternal(platformRef, applicationRef);
			stopMeasuring(_renderLabel);
			return rendered;
		} finally {
			yield asyncDestroyPlatform$1(platformRef);
			stopMeasuring(renderAppLabel);
		}
	});
	return _renderApplication.apply(this, arguments);
}
function validateAllowedHosts(url, allowedHosts) {
	if (typeof url === "string") {
		const parsedUrl = resolveUrl(url);
		if (parsedUrl !== null) {
			const hostname = parsedUrl.hostname;
			if (!isHostAllowed(hostname, new Set(allowedHosts))) throw new RuntimeError(5706, typeof ngDevMode === "undefined" || ngDevMode ? `Host ${url} is not allowed. You can configure \`allowedHosts\` option.` : url);
		}
	}
}
function isHostAllowed(hostname, allowedHosts) {
	if (allowedHosts.has("*") || allowedHosts.has(hostname)) return true;
	for (const allowedHost of allowedHosts) {
		if (!allowedHost.startsWith("*.")) continue;
		const domain = allowedHost.slice(1);
		if (hostname.endsWith(domain)) return true;
	}
	return false;
}
//#endregion
//#region ../node_modules/beasties/dist/plan-DLQRCYVX.mjs
var HEX_ESCAPE_RE = /\\([0-9a-f]{1,6})[\t\n\f\r ]?/gi;
var CHAR_ESCAPE_RE = /\\(.)/g;
var WHITESPACE_RE$1 = /\s+/g;
/**
* Whether any of a document's codepoints falls inside a face's `unicode-range`.
* Unknown ranges or unknown document text count as a match, so a face is only
* excluded when its subset is provably unused.
*/
function unicodeRangeUsed(ranges, chars) {
	if (!ranges || !chars) return true;
	for (const codepoint of chars) for (let i = 0; i < ranges.length; i += 2) if (codepoint >= ranges[i] && codepoint <= ranges[i + 1]) return true;
	return false;
}
var ENTITY_RE = /&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/iy;
var NAMED_ENTITIES = {
	amp: "&",
	apos: "'",
	gt: ">",
	lt: "<",
	nbsp: "\xA0",
	quot: "\""
};
function createTextCodepoints() {
	return {
		bmp: /* @__PURE__ */ new Uint8Array(65536),
		astral: /* @__PURE__ */ new Set(),
		complete: true
	};
}
/** Materialize collected codepoints, or `undefined` if some text was undecodable */
function toCodepointSet(text) {
	if (!text.complete) return;
	const chars = new Set(text.astral);
	for (let codepoint = 0; codepoint < text.bmp.length; codepoint++) if (text.bmp[codepoint]) chars.add(codepoint);
	return chars;
}
/**
* Add the codepoints of a run of (possibly entity-encoded) HTML text. An
* entity that can't be decoded clears `complete`, since the document then
* contains characters we can't account for.
*/
function addTextCodepoints(text, into) {
	const { bmp } = into;
	for (let index = 0; index < text.length; index++) {
		const code = text.charCodeAt(index);
		if (code === 38) {
			ENTITY_RE.lastIndex = index;
			const entity = ENTITY_RE.exec(text);
			if (entity) {
				const body = entity[1];
				if (body[0] === "#") {
					const codepoint = body[1] === "x" || body[1] === "X" ? Number.parseInt(body.slice(2), 16) : Number.parseInt(body.slice(1), 10);
					if (codepoint >= 0 && codepoint <= 65535) bmp[codepoint] = 1;
					else if (codepoint > 65535 && codepoint <= 1114111) into.astral.add(codepoint);
				} else {
					const decoded = NAMED_ENTITIES[body.toLowerCase()];
					if (decoded) bmp[decoded.charCodeAt(0)] = 1;
					else into.complete = false;
				}
				index = ENTITY_RE.lastIndex - 1;
				continue;
			}
		}
		if (code >= 55296 && code <= 56319 && index + 1 < text.length) {
			const low = text.charCodeAt(index + 1);
			if (low >= 56320 && low <= 57343) {
				into.astral.add((code - 55296) * 1024 + low - 56320 + 65536);
				index++;
				continue;
			}
		}
		bmp[code] = 1;
	}
}
/** Case-fold, unquote and unescape a single family name for comparison */
function normalizeFontFamily(family) {
	let value = family.trim();
	const quote = value[0];
	if ((quote === "\"" || quote === "'") && value.endsWith(quote) && value.length > 1) value = value.slice(1, -1);
	value = value.replace(HEX_ESCAPE_RE, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16))).replace(CHAR_ESCAPE_RE, "$1").replace(WHITESPACE_RE$1, " ").trim();
	return value.toLowerCase();
}
var ATTR_ACTIONS = [
	"exists",
	"equals",
	"element",
	"start",
	"end",
	"any",
	"hyphen"
];
/** Whether a value is a compact plan rather than a `CompiledSheet` */
function isCompactPlan(plan) {
	return Array.isArray(plan) && plan[0] === 1;
}
//#endregion
//#region ../node_modules/beasties/dist/runtime.mjs
init_objectSpread2();
/**
* Conservative allowlist for re-emitting a `media` attribute value into
* generated JavaScript. `validateMediaQuery()` parses the query but tolerates
* quotes and semicolons, which would break out of the `onload` handler that the
* `media` and `js*` strategies build.
*
* @see https://github.com/angular/angular-cli/issues/33342
*/
var SAFE_MEDIA_RE = /^[\w\s\-(),:.]+$/;
function isSafeMediaValue(media) {
	return SAFE_MEDIA_RE.test(media);
}
function decodePlan(plan) {
	const [, href, size, pool, wraps, rules] = plan;
	const deref = (value) => typeof value === "number" ? pool[value - 1] : value;
	const derefAll = (values) => values.map(deref);
	const wrapChains = wraps.map(derefAll);
	return {
		href: href === 0 ? void 0 : href,
		size,
		warnings: [],
		rules: rules.map((rule) => decodeRule(rule, deref, derefAll, wrapChains))
	};
}
function decodeRule(compact, deref, derefAll, wrapChains) {
	const flags = compact[0];
	let cursor = 1;
	const next = () => compact[cursor++];
	const rule = {};
	if (flags & 1) {
		const selectors = next();
		rule.selectors = Array.isArray(selectors) ? derefAll(selectors) : [deref(selectors)];
		rule.body = deref(next());
	}
	if (flags & 2) rule.css = deref(next());
	if (flags & 4) rule.match = next().map((condition, index) => {
		var _rule$selectors;
		return decodeMatch(condition, (_rule$selectors = rule.selectors) === null || _rule$selectors === void 0 ? void 0 : _rule$selectors[index], deref, derefAll);
	});
	if (flags & 8) rule.always = true;
	if (flags & 16) rule.wrap = wrapChains[next()];
	if (flags & 32) rule.fontsUsed = derefAll(next());
	if (flags & 64) rule.keyframesUsed = derefAll(next());
	if (flags & 128) {
		const [family, src, ranges] = next();
		rule.fontFace = {
			family: family === 0 ? void 0 : deref(family),
			src: src === 0 ? void 0 : deref(src),
			ranges
		};
	}
	if (flags & 256) rule.keyframes = deref(next());
	return rule;
}
function decodeMatch(compact, selector, deref, derefAll) {
	if (compact === 0) return true;
	if (compact === 1) return { classes: [selector.slice(1)] };
	if (compact === 2) return { ids: [selector.slice(1)] };
	if (compact === 3) return { tags: [selector.toLowerCase()] };
	if (typeof compact[0] === "string") return { program: decodeProgram(compact, deref, derefAll) };
	const [classes, ids, tags, attrs] = compact;
	const condition = {};
	if (classes !== 0) condition.classes = derefAll(classes);
	if (ids !== 0) condition.ids = derefAll(ids);
	if (tags !== 0) condition.tags = derefAll(tags);
	if (attrs !== 0) condition.attrs = derefAll(attrs);
	return condition;
}
function decodeProgram(compact, deref, derefAll) {
	const [combinators, compounds] = compact;
	return {
		combinators: [...combinators],
		compounds: compounds.map((compound) => decodeCompound(compound, deref, derefAll))
	};
}
function decodeCompound(compact, deref, derefAll) {
	if (!Array.isArray(compact)) return { classes: [deref(compact)] };
	const [tag, classes, ids, attrs] = compact;
	const compound = {};
	if (tag !== 0) compound.tag = deref(tag);
	if (classes !== 0) compound.classes = derefAll(classes);
	if (ids !== 0) compound.ids = derefAll(ids);
	if (attrs !== 0) compound.attrs = attrs.map(([name, action, value, ignoreCase]) => {
		const test = {
			name: deref(name),
			action: ATTR_ACTIONS[action]
		};
		if (value !== 0) test.value = deref(value);
		if (ignoreCase) test.ignoreCase = true;
		return test;
	});
	return compound;
}
var VOID_ELEMENTS = /* @__PURE__ */ new Set([
	"area",
	"base",
	"br",
	"col",
	"embed",
	"hr",
	"img",
	"input",
	"link",
	"meta",
	"param",
	"source",
	"track",
	"wbr"
]);
var RAW_TEXT_ELEMENTS = /* @__PURE__ */ new Set([
	"script",
	"style",
	"textarea",
	"title",
	"xmp"
]);
/** Raw text elements whose contents are still rendered as page text */
var RENDERED_RAW_TEXT_ELEMENTS = /* @__PURE__ */ new Set(["textarea", "xmp"]);
/** Attributes whose value can be rendered as text */
var RENDERED_ATTRS = /* @__PURE__ */ new Set([
	"alt",
	"label",
	"placeholder",
	"title",
	"value"
]);
var TAG_START_RE = /[a-z]/;
var TAG_NAME_END_RE = /[\s/>]/;
var ATTR_NAME_END_RE = /[\s=/>]/;
var WHITESPACE_RE = /\s/;
var CLASS_SPLIT_RE = /\s+/;
function createTokens() {
	return {
		tags: /* @__PURE__ */ new Set(),
		classes: /* @__PURE__ */ new Set(),
		ids: /* @__PURE__ */ new Set(),
		attrs: /* @__PURE__ */ new Set()
	};
}
function preparePrograms(programs) {
	const prepared = {
		programs,
		flat: [],
		byClass: /* @__PURE__ */ new Map(),
		byId: /* @__PURE__ */ new Map(),
		byTag: /* @__PURE__ */ new Map(),
		byAttr: /* @__PURE__ */ new Map(),
		universal: []
	};
	for (let p = 0; p < programs.length; p++) {
		var _combinators$c, _first$classes, _first$ids, _first$attrs;
		const { compounds, combinators } = programs[p];
		const start = prepared.flat.length;
		for (let c = 0; c < compounds.length; c++) prepared.flat.push({
			test: compounds[c],
			edge: (_combinators$c = combinators[c]) !== null && _combinators$c !== void 0 ? _combinators$c : null,
			last: c === compounds.length - 1,
			program: p
		});
		const first = compounds[0];
		if ((_first$classes = first.classes) === null || _first$classes === void 0 ? void 0 : _first$classes.length) pushIndex(prepared.byClass, first.classes[0], start);
		else if ((_first$ids = first.ids) === null || _first$ids === void 0 ? void 0 : _first$ids.length) pushIndex(prepared.byId, first.ids[0], start);
		else if (first.tag) pushIndex(prepared.byTag, first.tag, start);
		else if ((_first$attrs = first.attrs) === null || _first$attrs === void 0 ? void 0 : _first$attrs.length) pushIndex(prepared.byAttr, first.attrs[0].name, start);
		else prepared.universal.push(start);
	}
	return prepared;
}
function pushIndex(map, key, position) {
	const list = map.get(key);
	if (list) list.push(position);
	else map.set(key, [position]);
}
function getAttrValue(element, name) {
	for (const [attrName, value] of element.attrs) if (attrName === name) return value !== null && value !== void 0 ? value : "";
}
function matchesAttr(test, element) {
	var _test$value;
	let value = getAttrValue(element, test.name);
	if (value === void 0) return false;
	if (test.action === "exists") return true;
	let expected = (_test$value = test.value) !== null && _test$value !== void 0 ? _test$value : "";
	if (test.ignoreCase) {
		value = value.toLowerCase();
		expected = expected.toLowerCase();
	}
	switch (test.action) {
		case "equals": return value === expected;
		case "element": return expected.length > 0 && value.split(CLASS_SPLIT_RE).includes(expected);
		case "start": return expected.length > 0 && value.startsWith(expected);
		case "end": return expected.length > 0 && value.endsWith(expected);
		case "any": return expected.length > 0 && value.includes(expected);
		case "hyphen": return value === expected || value.startsWith(`${expected}-`);
	}
	return false;
}
function matchesCompound(test, element) {
	if (test.tag && test.tag !== element.tag) return false;
	if (test.ids) {
		for (const id of test.ids) if (element.id !== id) return false;
	}
	if (test.classes) {
		for (const cls of test.classes) if (!element.classes.includes(cls)) return false;
	}
	if (test.attrs) {
		for (const attr of test.attrs) if (!matchesAttr(attr, element)) return false;
	}
	return true;
}
function createFrame(container, desc, child) {
	return {
		container,
		desc,
		child,
		adjacent: [],
		sibling: []
	};
}
function scanHtml(html, programs, options = {}) {
	const collectText = options.chars !== false;
	const lower = html.toLowerCase();
	const all = createTokens();
	const contained = createTokens();
	const text = createTextCodepoints();
	const collectChars = collectText ? (run) => addTextCodepoints(run, text) : () => {};
	const prepared = programs && programs.length > 0 ? preparePrograms(programs) : void 0;
	const matchedAll = prepared ? Array.from({ length: prepared.programs.length }).fill(false) : [];
	const matchedContained = prepared ? Array.from({ length: prepared.programs.length }).fill(false) : [];
	const candidateSet = /* @__PURE__ */ new Set();
	let containerFound = false;
	const frames = [createFrame(false, [], [])];
	let i = 0;
	const length = html.length;
	while (i < length) {
		var _childOut2;
		const textStart = i;
		i = lower.indexOf("<", i);
		if (i === -1) {
			collectChars(html.slice(textStart));
			break;
		}
		if (i > textStart) collectChars(html.slice(textStart, i));
		const next = lower[i + 1];
		if (next === "/") {
			const end = lower.indexOf(">", i);
			if (end === -1) break;
			if (frames.length > 1) frames.pop();
			i = end + 1;
			continue;
		}
		if (next === "!") {
			if (lower.startsWith("<!--", i)) {
				const end = lower.indexOf("-->", i + 4);
				i = end === -1 ? length : end + 3;
			} else {
				const end = lower.indexOf(">", i);
				i = end === -1 ? length : end + 1;
			}
			continue;
		}
		if (next === "?") {
			const end = lower.indexOf(">", i);
			i = end === -1 ? length : end + 1;
			continue;
		}
		if (!next || !TAG_START_RE.test(next)) {
			i++;
			continue;
		}
		let pos = i + 1;
		while (pos < length && !TAG_NAME_END_RE.test(lower[pos])) pos++;
		const tagName = lower.slice(i + 1, pos);
		const element = {
			tag: tagName,
			id: null,
			classes: [],
			attrs: []
		};
		let isContainer = false;
		let selfClosing = false;
		while (pos < length) {
			while (pos < length && WHITESPACE_RE.test(lower[pos])) pos++;
			if (lower[pos] === "/") {
				selfClosing = true;
				pos++;
				continue;
			}
			if (lower[pos] === ">" || pos >= length) break;
			selfClosing = false;
			const nameStart = pos;
			while (pos < length && !ATTR_NAME_END_RE.test(lower[pos])) pos++;
			const attrName = lower.slice(nameStart, pos);
			let value = null;
			while (pos < length && WHITESPACE_RE.test(lower[pos])) pos++;
			if (lower[pos] === "=") {
				pos++;
				while (pos < length && WHITESPACE_RE.test(lower[pos])) pos++;
				const quote = lower[pos];
				if (quote === "\"" || quote === "'") {
					const valueEnd = lower.indexOf(quote, pos + 1);
					value = html.slice(pos + 1, valueEnd === -1 ? length : valueEnd);
					pos = valueEnd === -1 ? length : valueEnd + 1;
				} else {
					const valueStart = pos;
					while (pos < length && !WHITESPACE_RE.test(lower[pos]) && lower[pos] !== ">") pos++;
					value = html.slice(valueStart, pos);
				}
			}
			if (attrName) {
				element.attrs.push([attrName, value]);
				if (value !== null && RENDERED_ATTRS.has(attrName)) collectChars(value);
				if (attrName === "data-beasties-container") {
					isContainer = true;
					containerFound = true;
				} else if (attrName === "class" && value !== null) {
					for (const cls of value.trim().split(CLASS_SPLIT_RE)) if (cls) element.classes.push(cls);
				} else if (attrName === "id" && value !== null) element.id = value.trim() || null;
			}
		}
		const frame = frames[frames.length - 1];
		const insideContainer = frame.container || isContainer;
		collectElement(all, element);
		if (insideContainer) collectElement(contained, element);
		let descOut;
		let childOut;
		if (prepared) {
			const strictlyInside = frame.container;
			candidateSet.clear();
			for (const list of [
				frame.desc,
				frame.child,
				frame.adjacent,
				frame.sibling
			]) for (const encoded of list) candidateSet.add(encoded);
			addAnchoredStarts(candidateSet, prepared, element);
			const adjacentOut = [];
			frame.adjacent = adjacentOut;
			for (const encoded of candidateSet) {
				const position = encoded >> 1;
				const compound = prepared.flat[position];
				if (!matchesCompound(compound.test, element)) continue;
				const chainContained = (encoded & 1) === 1 && strictlyInside;
				if (compound.last) {
					matchedAll[compound.program] = true;
					if (chainContained) matchedContained[compound.program] = true;
					continue;
				}
				const nextEncoded = position + 1 << 1 | (chainContained ? 1 : 0);
				switch (compound.edge) {
					case " ":
						var _descOut;
						((_descOut = descOut) !== null && _descOut !== void 0 ? _descOut : descOut = []).push(nextEncoded);
						break;
					case ">":
						var _childOut;
						((_childOut = childOut) !== null && _childOut !== void 0 ? _childOut : childOut = []).push(nextEncoded);
						break;
					case "+":
						adjacentOut.push(nextEncoded);
						break;
					case "~": frame.sibling.push(nextEncoded);
				}
			}
		} else frame.adjacent = [];
		const isVoid = VOID_ELEMENTS.has(tagName) || selfClosing;
		const isRawText = RAW_TEXT_ELEMENTS.has(tagName);
		if (!isVoid && !isRawText) frames.push(createFrame(insideContainer, descOut ? frame.desc.concat(descOut) : frame.desc, (_childOut2 = childOut) !== null && _childOut2 !== void 0 ? _childOut2 : []));
		i = lower[pos] === ">" ? pos + 1 : pos;
		if (!isVoid && isRawText) {
			const close = lower.indexOf(`</${tagName}`, i);
			if (close === -1) break;
			if (RENDERED_RAW_TEXT_ELEMENTS.has(tagName)) collectChars(html.slice(i, close));
			const end = lower.indexOf(">", close);
			i = end === -1 ? length : end + 1;
		}
	}
	const tokens = containerFound ? contained : all;
	if (collectText) tokens.chars = toCodepointSet(text);
	if (prepared) {
		const matched = containerFound ? matchedContained : matchedAll;
		tokens.matchedPrograms = /* @__PURE__ */ new Map();
		for (let p = 0; p < prepared.programs.length; p++) tokens.matchedPrograms.set(prepared.programs[p], matched[p]);
	}
	return tokens;
}
function collectElement(tokens, element) {
	tokens.tags.add(element.tag);
	if (element.id) tokens.ids.add(element.id);
	for (const cls of element.classes) tokens.classes.add(cls);
	for (const [name] of element.attrs) tokens.attrs.add(name);
}
function addAnchoredStarts(candidates, prepared, element) {
	for (const cls of element.classes) {
		const starts = prepared.byClass.get(cls);
		if (starts) for (const position of starts) candidates.add(position << 1 | 1);
	}
	if (element.id) {
		const starts = prepared.byId.get(element.id);
		if (starts) for (const position of starts) candidates.add(position << 1 | 1);
	}
	const tagStarts = prepared.byTag.get(element.tag);
	if (tagStarts) for (const position of tagStarts) candidates.add(position << 1 | 1);
	for (const [name] of element.attrs) {
		const starts = prepared.byAttr.get(name);
		if (starts) for (const position of starts) candidates.add(position << 1 | 1);
	}
	for (const position of prepared.universal) candidates.add(position << 1 | 1);
}
function matchesCondition(condition, tokens) {
	if (condition === true) return true;
	if (condition.program) {
		var _tokens$matchedProgra;
		const exact = (_tokens$matchedProgra = tokens.matchedPrograms) === null || _tokens$matchedProgra === void 0 ? void 0 : _tokens$matchedProgra.get(condition.program);
		if (exact !== void 0) return exact;
	}
	if (condition.classes) {
		for (const cls of condition.classes) if (!tokens.classes.has(cls)) return false;
	}
	if (condition.ids) {
		for (const id of condition.ids) if (!tokens.ids.has(id)) return false;
	}
	if (condition.tags) {
		for (const tag of condition.tags) if (!tokens.tags.has(tag)) return false;
	}
	if (condition.attrs) {
		for (const attr of condition.attrs) if (!tokens.attrs.has(attr)) return false;
	}
	return true;
}
/** Collect structural programs referenced by the compiled sheets */
function collectPrograms(sheets) {
	const programs = [];
	for (const sheet of sheets) for (const rule of sheet.rules) {
		if (!rule.match) continue;
		for (const condition of rule.match) if (condition !== true && condition.program) programs.push(condition.program);
	}
	return programs;
}
/**
* Evaluate a compiled sheet against scanned document tokens, producing the
* critical CSS subset.
*/
function renderCriticalCss(sheet, tokens, options = {}) {
	var _options$keyframes;
	let keyframesMode = (_options$keyframes = options.keyframes) !== null && _options$keyframes !== void 0 ? _options$keyframes : "critical";
	if (keyframesMode === true) keyframesMode = "all";
	if (keyframesMode === false) keyframesMode = "none";
	const shouldPreloadFonts = options.fonts === true || options.preloadFonts === true;
	const shouldInlineFonts = options.fonts !== false && options.inlineFonts === true;
	const rules = sheet.rules;
	const texts = Array.from({ length: rules.length }).fill(null);
	const inverseTexts = options.inverse ? Array.from({ length: rules.length }).fill(null) : void 0;
	const criticalFonts = /* @__PURE__ */ new Set();
	const criticalKeyframeNames = /* @__PURE__ */ new Set();
	const fontPreloads = [];
	const preloadedFonts = /* @__PURE__ */ new Set();
	for (let i = 0; i < rules.length; i++) {
		const rule = rules[i];
		if (rule.fontFace) continue;
		if (rule.keyframes !== void 0) continue;
		const text = ruleText(rule, tokens);
		if (inverseTexts) inverseTexts[i] = ruleText(rule, tokens, true);
		if (text === null) continue;
		texts[i] = text;
		if (rule.fontsUsed) for (const family of rule.fontsUsed) criticalFonts.add(normalizeFontFamily(family));
		if (rule.keyframesUsed) for (const name of rule.keyframesUsed) criticalKeyframeNames.add(name);
	}
	for (let i = 0; i < rules.length; i++) {
		const rule = rules[i];
		if (rule.keyframes !== void 0) {
			var _rule$css, _rule$css2;
			if (keyframesMode !== "none" && (keyframesMode === "all" || criticalKeyframeNames.has(rule.keyframes))) texts[i] = (_rule$css = rule.css) !== null && _rule$css !== void 0 ? _rule$css : "";
			else if (inverseTexts) inverseTexts[i] = (_rule$css2 = rule.css) !== null && _rule$css2 !== void 0 ? _rule$css2 : "";
			continue;
		}
		if (rule.fontFace) {
			var _rule$css3, _rule$css4;
			const { family, src, ranges } = rule.fontFace;
			const used = !!family && criticalFonts.has(normalizeFontFamily(family)) && unicodeRangeUsed(ranges, tokens.chars);
			if (used && src && shouldPreloadFonts && !preloadedFonts.has(src)) {
				preloadedFonts.add(src);
				fontPreloads.push(src.trim());
			}
			if (shouldInlineFonts && used) texts[i] = (_rule$css3 = rule.css) !== null && _rule$css3 !== void 0 ? _rule$css3 : "";
			else if (inverseTexts) inverseTexts[i] = (_rule$css4 = rule.css) !== null && _rule$css4 !== void 0 ? _rule$css4 : "";
		}
	}
	const result = {
		css: assemble(texts, rules),
		fontPreloads
	};
	if (inverseTexts) result.inverseCss = assemble(inverseTexts, rules);
	return result;
}
/** Emit every rule in the sheet, as when a stylesheet is inlined in full */
function renderFullCss(sheet) {
	return assemble(sheet.rules.map(wholeRuleText), sheet.rules);
}
function wholeRuleText(rule) {
	if (rule.css !== void 0) return rule.css;
	return rule.selectors ? rule.selectors.join(",") + rule.body : "";
}
/** Join rule texts, opening and closing at-rule wrappers as needed */
function assemble(texts, rules) {
	const out = [];
	let openWrap = [];
	for (let i = 0; i < texts.length; i++) {
		var _rules$i$wrap;
		const text = texts[i];
		if (text == null) continue;
		const wrap = (_rules$i$wrap = rules[i].wrap) !== null && _rules$i$wrap !== void 0 ? _rules$i$wrap : [];
		let common = 0;
		while (common < openWrap.length && common < wrap.length && openWrap[common] === wrap[common]) common++;
		for (let j = openWrap.length; j > common; j--) out.push("}");
		for (let j = common; j < wrap.length; j++) out.push(wrap[j]);
		openWrap = wrap;
		out.push(text);
	}
	for (let j = openWrap.length; j > 0; j--) out.push("}");
	return out.join("");
}
/**
* The rule's text as inlined, or `null` when it isn't. With `invert`, returns
* the complement instead: what the external stylesheet still has to provide.
*/
function ruleText(rule, tokens, invert = false) {
	var _rule$css5, _rule$css6;
	if (rule.always) return invert ? null : wholeRuleText(rule);
	if (!rule.match) return invert ? null : (_rule$css5 = rule.css) !== null && _rule$css5 !== void 0 ? _rule$css5 : null;
	const body = rule.body;
	if (rule.selectors && body !== void 0) {
		const kept = rule.selectors.filter((_, index) => matchesCondition(rule.match[index], tokens) !== invert);
		if (kept.length === 0) return null;
		return kept.join(",") + body;
	}
	if (rule.match.some((condition) => matchesCondition(condition, tokens)) !== invert) return (_rule$css6 = rule.css) !== null && _rule$css6 !== void 0 ? _rule$css6 : "";
	return null;
}
var DEFAULT_CACHE_SIZE = 100;
/**
* Fingerprint the scanned tokens. Token sets iterate in insertion order,
* which is deterministic for a given document shape; a differently-ordered
* but equal set only costs a cache miss, never a wrong hit.
*/
function fingerprintTokens(tokens) {
	const parts = [];
	for (const set of [
		tokens.tags,
		tokens.classes,
		tokens.ids,
		tokens.attrs
	]) {
		for (const token of set) parts.push(token);
		parts.push("\n");
	}
	if (tokens.chars) parts.push(Array.from(tokens.chars).join(","));
	parts.push("\n");
	if (tokens.matchedPrograms) for (const matched of tokens.matchedPrograms.values()) parts.push(matched ? "1" : "0");
	return parts.join(" ");
}
var CSS_HREF_RE = /\.css(?:[?#]|$)/i;
var LINK_TAG_RE = /<link\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi;
var REL_STYLESHEET_RE = /\brel\s*=\s*(?:"stylesheet"|'stylesheet'|stylesheet(?=[\s>]))/i;
var REL_PRELOAD_RE = /\brel\s*=\s*(?:"preload"|'preload'|preload(?=[\s>]))/i;
var AS_FONT_RE = /\bas\s*=\s*(?:"font"|'font'|font(?=[\s>]))/i;
var CSS_LOADER_PREAMBLE = "function $loadcss(u,m,l){(l=document.createElement('link')).rel='stylesheet';l.href=u;document.head.appendChild(l)}";
var CSS_LOADER_LAZY_PREAMBLE = CSS_LOADER_PREAMBLE.replace("l.href", "l.media='print';l.onload=function(){l.media=m};l.href");
var CSS_LOADER_INVOKE = "$loadcss(document.currentScript.dataset.href,document.currentScript.dataset.media)";
var DEFERRED_MEDIA_ATTR = "data-beasties-media";
var DEFERRED_MEDIA_SCRIPT = `document.querySelectorAll('link[${DEFERRED_MEDIA_ATTR}]').forEach(function(l){l.media=l.getAttribute('${DEFERRED_MEDIA_ATTR}');l.removeAttribute('${DEFERRED_MEDIA_ATTR}')})`;
function attrValueRegex(name) {
	return new RegExp(`(^|\\s)(${name})\\s*=\\s*("[^"]*"|'[^']*'|[^\\s>]+)`, "i");
}
function attrNameRegex(name) {
	return new RegExp(`(^|\\s)${name}(?=[\\s/>=])`, "i");
}
function escapeAttr(value) {
	return value.replace(/"/g, "&quot;");
}
/** Get a (raw, un-decoded) attribute value from a tag string */
function getAttr(tag, name) {
	const match = tag.match(attrValueRegex(name));
	if (match) {
		const raw = match[3];
		if (raw[0] === "\"" || raw[0] === "'") return raw.slice(1, -1);
		return raw;
	}
	return attrNameRegex(name).test(tag) ? "" : null;
}
/** Set an attribute in a tag string, replacing in place or appending before `>` */
function setAttr(tag, name, value) {
	const valueRe = attrValueRegex(name);
	if (valueRe.test(tag)) return tag.replace(valueRe, `$1$2="${escapeAttr(value)}"`);
	const nameRe = attrNameRegex(name);
	if (nameRe.test(tag)) return tag.replace(nameRe, `$1${name}="${escapeAttr(value)}"`);
	if (!tag.endsWith(">")) return tag;
	let cut = tag.length - 1;
	if (tag[cut - 1] === "/") cut--;
	while (cut > 0 && WHITESPACE_RE.test(tag[cut - 1])) cut--;
	return `${tag.slice(0, cut)} ${name}="${escapeAttr(value)}"${tag.slice(cut)}`;
}
/** Remove an attribute from a tag string */
function removeAttr(tag, name) {
	return tag.replace(attrValueRegex(name), "").replace(attrNameRegex(name), "");
}
function toPreload(tag) {
	return setAttr(setAttr(tag, "rel", "preload"), "as", "style");
}
function normalizeHref(href) {
	const query = href.indexOf("?");
	const hash = href.indexOf("#");
	let end = href.length;
	if (query !== -1) end = query;
	if (hash !== -1 && hash < end) end = hash;
	let start = 0;
	if (href[0] === "." && href[1] === "/") start = 2;
	else if (href[0] === "/") start = 1;
	return href.slice(start, end);
}
function sheetForHref(sheets, href) {
	const normalized = normalizeHref(href);
	return sheets.find((sheet) => {
		if (!sheet.href) return false;
		const sheetHref = normalizeHref(sheet.href);
		return normalized === sheetHref || normalized.endsWith(`/${sheetHref}`);
	});
}
function applyEdits(html, edits) {
	edits.sort((a, b) => a.start - b.start || a.end - b.end);
	let out = "";
	let cursor = 0;
	for (const edit of edits) {
		if (edit.start < cursor) continue;
		out += html.slice(cursor, edit.start) + edit.text;
		cursor = edit.end;
	}
	return out + html.slice(cursor);
}
function createProcessor(plans, options = {}) {
	var _options$cache$maxSiz;
	const sheets = plans.map((plan) => isCompactPlan(plan) ? decodePlan(plan) : plan);
	const programs = collectPrograms(sheets);
	const scanOptions = { chars: sheets.some((sheet) => sheet.rules.some((rule) => {
		var _rule$fontFace;
		return (_rule$fontFace = rule.fontFace) === null || _rule$fontFace === void 0 ? void 0 : _rule$fontFace.ranges;
	})) };
	const cacheSize = options.cache === false ? 0 : typeof options.cache === "object" ? (_options$cache$maxSiz = options.cache.maxSize) !== null && _options$cache$maxSiz !== void 0 ? _options$cache$maxSiz : DEFAULT_CACHE_SIZE : DEFAULT_CACHE_SIZE;
	const cache = cacheSize > 0 ? /* @__PURE__ */ new Map() : void 0;
	const renderOptions = _objectSpread2(_objectSpread2({}, options), {}, { inverse: !!options.minimumExternalSize });
	const fullCssCache = /* @__PURE__ */ new Map();
	function fullCss(sheet) {
		let css = fullCssCache.get(sheet);
		if (css === void 0) {
			css = renderFullCss(sheet);
			fullCssCache.set(sheet, css);
		}
		return css;
	}
	/**
	* Whether the whole stylesheet should be inlined, making its `<link>`
	* unnecessary: either it is small enough outright, or what would be left for
	* it to serve is small enough that the request isn't worth saving.
	*/
	function inlineInFull(sheet, critical) {
		if (options.inlineThreshold && sheet.size < options.inlineThreshold) return true;
		if (options.minimumExternalSize && critical.inverseCss !== void 0) return critical.inverseCss.length < options.minimumExternalSize;
		return false;
	}
	function renderSheet(sheet, tokens, key) {
		if (!cache || key === void 0) return renderCriticalCss(sheet, tokens, renderOptions);
		let bySheet = cache.get(key);
		if (bySheet) {
			cache.delete(key);
			cache.set(key, bySheet);
		} else {
			bySheet = /* @__PURE__ */ new Map();
			cache.set(key, bySheet);
			if (cache.size > cacheSize) cache.delete(cache.keys().next().value);
		}
		let result = bySheet.get(sheet);
		if (!result) {
			result = renderCriticalCss(sheet, tokens, renderOptions);
			bySheet.set(sheet, result);
		}
		return result;
	}
	function skippedSheets(html) {
		let skipped;
		for (const match of html.matchAll(LINK_TAG_RE)) {
			var _skipped;
			const tag = match[0];
			if (!REL_STYLESHEET_RE.test(tag) || getAttr(tag, "data-beasties-skip") === null) continue;
			const href = getAttr(tag, "href");
			const sheet = href ? sheetForHref(sheets, href) : void 0;
			if (sheet) ((_skipped = skipped) !== null && _skipped !== void 0 ? _skipped : skipped = /* @__PURE__ */ new Set()).add(sheet);
		}
		return skipped;
	}
	function extract(html) {
		const tokens = scanHtml(html, programs, scanOptions);
		const key = cache ? fingerprintTokens(tokens) : void 0;
		const skipped = skippedSheets(html);
		const css = [];
		const fontPreloads = [];
		for (const sheet of sheets) {
			if (skipped === null || skipped === void 0 ? void 0 : skipped.has(sheet)) continue;
			const result = renderSheet(sheet, tokens, key);
			css.push(inlineInFull(sheet, result) ? fullCss(sheet) : result.css);
			fontPreloads.push(...result.fontPreloads);
		}
		return {
			css: css.join(""),
			fontPreloads
		};
	}
	function process(html, processOptions) {
		var _processOptions$nonce;
		const tokens = scanHtml(html, programs, scanOptions);
		const key = cache ? fingerprintTokens(tokens) : void 0;
		const strategy = options.preload;
		const nonce = (_processOptions$nonce = processOptions === null || processOptions === void 0 ? void 0 : processOptions.nonce) !== null && _processOptions$nonce !== void 0 ? _processOptions$nonce : options.nonce;
		const nonceAttr = nonce ? ` nonce="${escapeAttr(nonce)}"` : "";
		let firstLinkIndex = -1;
		const edits = [];
		const bodyAppends = [];
		let deferredMedia = false;
		const criticalParts = [];
		const fontPreloads = /* @__PURE__ */ new Set();
		const existingFontPreloads = /* @__PURE__ */ new Set();
		let isFirstSheet = true;
		for (const match of html.matchAll(LINK_TAG_RE)) {
			const tag = match[0];
			if (!REL_STYLESHEET_RE.test(tag)) {
				if (REL_PRELOAD_RE.test(tag) && AS_FONT_RE.test(tag)) {
					const preloaded = getAttr(tag, "href");
					if (preloaded) existingFontPreloads.add(preloaded);
				}
				continue;
			}
			if (getAttr(tag, "data-beasties-skip") !== null) continue;
			const href = getAttr(tag, "href");
			if (!href) continue;
			const sheet = sheetForHref(sheets, href);
			if (!sheet) {
				var _options$logger, _options$logger$warn;
				if (CSS_HREF_RE.test(href)) (_options$logger = options.logger) === null || _options$logger === void 0 || (_options$logger$warn = _options$logger.warn) === null || _options$logger$warn === void 0 || _options$logger$warn.call(_options$logger, `Unable to locate stylesheet: ${href}`);
				continue;
			}
			const result = renderSheet(sheet, tokens, key);
			const wholeSheet = inlineInFull(sheet, result);
			criticalParts.push(wholeSheet ? fullCss(sheet) : result.css);
			for (const preload of result.fontPreloads) fontPreloads.add(preload);
			const start = match.index;
			const end = start + tag.length;
			if (firstLinkIndex === -1) firstLinkIndex = start;
			if (wholeSheet) {
				edits.push({
					start,
					end,
					text: ""
				});
				continue;
			}
			if (strategy === false) continue;
			const rawMedia = getAttr(tag, "media");
			const media = rawMedia && isSafeMediaValue(rawMedia) ? rawMedia : void 0;
			let newTag = tag;
			let noscriptFallback = false;
			let scriptAfter;
			if (strategy === "body") {
				bodyAppends.push(tag);
				newTag = "";
			} else if (strategy === "media-script") {
				newTag = setAttr(setAttr(tag, "media", "print"), DEFERRED_MEDIA_ATTR, media || "all");
				deferredMedia = true;
				noscriptFallback = true;
			} else if (strategy === "media") {
				newTag = setAttr(setAttr(tag, "media", "print"), "onload", `this.media='${media || "all"}'`);
				noscriptFallback = true;
			} else if (strategy === "swap") {
				newTag = toPreload(setAttr(tag, "onload", "this.rel='stylesheet'"));
				noscriptFallback = true;
			} else if (strategy === "swap-high") {
				newTag = setAttr(setAttr(setAttr(setAttr(tag, "rel", "alternate stylesheet preload"), "title", "styles"), "as", "style"), "onload", "this.title='';this.rel='stylesheet'");
				noscriptFallback = true;
			} else if (strategy === "swap-low") {
				newTag = setAttr(setAttr(setAttr(tag, "rel", "alternate stylesheet"), "title", "styles"), "onload", "this.title='';this.rel='stylesheet'");
				noscriptFallback = true;
			} else if (strategy === "js" || strategy === "js-lazy") {
				const preamble = isFirstSheet ? strategy === "js-lazy" ? CSS_LOADER_LAZY_PREAMBLE : CSS_LOADER_PREAMBLE : "";
				scriptAfter = `<script${nonceAttr} data-href="${escapeAttr(href)}" data-media="${escapeAttr(media || "all")}">${preamble}${CSS_LOADER_INVOKE}<\/script>`;
				newTag = toPreload(tag);
				noscriptFallback = true;
			} else {
				bodyAppends.push(removeAttr(tag, "id"));
				newTag = toPreload(tag);
			}
			if (options.noscriptFallback !== false && noscriptFallback && !href.includes("</noscript>")) edits.push({
				start: end,
				end,
				text: `<noscript>${removeAttr(tag, "id")}</noscript>`
			});
			if (scriptAfter) edits.push({
				start: end,
				end,
				text: scriptAfter
			});
			if (newTag !== tag) edits.push({
				start,
				end,
				text: newTag
			});
			isFirstSheet = false;
		}
		for (const preloaded of existingFontPreloads) fontPreloads.delete(preloaded);
		const critical = criticalParts.join("");
		if (!critical && fontPreloads.size === 0 && edits.length === 0 && bodyAppends.length === 0) return html;
		const headInsertions = [];
		for (const preload of fontPreloads) headInsertions.push(`<link rel="preload" as="font" crossorigin="anonymous" href="${escapeAttr(preload)}">`);
		if (critical) headInsertions.push(`<style${nonceAttr}>${critical}</style>`);
		if (deferredMedia) bodyAppends.push(`<script${nonceAttr}>${DEFERRED_MEDIA_SCRIPT}<\/script>`);
		if (headInsertions.length > 0) {
			var _html$match$index, _html$match;
			let insertAt = firstLinkIndex;
			if (insertAt === -1) insertAt = (_html$match$index = (_html$match = html.match(/<\/head\s*>/i)) === null || _html$match === void 0 ? void 0 : _html$match.index) !== null && _html$match$index !== void 0 ? _html$match$index : 0;
			edits.push({
				start: insertAt,
				end: insertAt,
				text: headInsertions.join("")
			});
		}
		if (bodyAppends.length > 0) {
			const bodyClose = lastIndexOfRe(html, /<\/body\s*>/gi);
			const insertAt = bodyClose === -1 ? html.length : bodyClose;
			edits.push({
				start: insertAt,
				end: insertAt,
				text: bodyAppends.join("")
			});
		}
		return applyEdits(html, edits);
	}
	return {
		process,
		extract
	};
}
function lastIndexOfRe(html, re) {
	let last = -1;
	for (const match of html.matchAll(re)) last = match.index;
	return last;
}
//#endregion
//#region \0@oxc-project+runtime@0.149.0/helpers/esm/asyncIterator.js
init_objectWithoutProperties();
function _asyncIterator(r) {
	var n, t, o, e = 2;
	for ("undefined" != typeof Symbol && (t = Symbol.asyncIterator, o = Symbol.iterator); e--;) {
		if (t && null != (n = r[t])) return n.call(r);
		if (o && null != (n = r[o])) return new AsyncFromSyncIterator(n.call(r));
		t = "@@asyncIterator", o = "@@iterator";
	}
	throw new TypeError("Object is not async iterable");
}
function AsyncFromSyncIterator(r) {
	function AsyncFromSyncIteratorContinuation(r) {
		if (Object(r) !== r) return Promise.reject(/* @__PURE__ */ new TypeError(r + " is not an object."));
		var n = r.done;
		return Promise.resolve(r.value).then(function(r) {
			return {
				value: r,
				done: n
			};
		});
	}
	return AsyncFromSyncIterator = function AsyncFromSyncIterator(r) {
		this.s = r, this.n = r.next;
	}, AsyncFromSyncIterator.prototype = {
		s: null,
		n: null,
		next: function next() {
			return AsyncFromSyncIteratorContinuation(this.n.apply(this.s, arguments));
		},
		"return": function _return(r) {
			var n = this.s["return"];
			return void 0 === n ? Promise.resolve({
				value: r,
				done: !0
			}) : AsyncFromSyncIteratorContinuation(n.apply(this.s, arguments));
		},
		"throw": function _throw(r) {
			var n = this.s["return"];
			return void 0 === n ? Promise.reject(r) : AsyncFromSyncIteratorContinuation(n.apply(this.s, arguments));
		}
	}, new AsyncFromSyncIterator(r);
}
//#endregion
//#region \0@oxc-project+runtime@0.149.0/helpers/esm/OverloadYield.js
function _OverloadYield(e, d) {
	this.v = e, this.k = d;
}
//#endregion
//#region \0@oxc-project+runtime@0.149.0/helpers/esm/asyncGeneratorDelegate.js
function _asyncGeneratorDelegate(t) {
	var e = {}, n = !1;
	function pump(e, r) {
		return n = !0, r = new Promise(function(n) {
			n(t[e](r));
		}), {
			done: !1,
			value: new _OverloadYield(r, 1)
		};
	}
	return e["undefined" != typeof Symbol && Symbol.iterator || "@@iterator"] = function() {
		return this;
	}, e.next = function(t) {
		return n ? (n = !1, t) : pump("next", t);
	}, "function" == typeof t["throw"] && (e["throw"] = function(t) {
		if (n) throw n = !1, t;
		return pump("throw", t);
	}), "function" == typeof t["return"] && (e["return"] = function(t) {
		return n ? (n = !1, t) : pump("return", t);
	}), e;
}
//#endregion
//#region \0@oxc-project+runtime@0.149.0/helpers/esm/awaitAsyncGenerator.js
function _awaitAsyncGenerator(e) {
	return new _OverloadYield(e, 0);
}
//#endregion
//#region \0@oxc-project+runtime@0.149.0/helpers/esm/wrapAsyncGenerator.js
function _wrapAsyncGenerator(e) {
	return function() {
		return new AsyncGenerator(e.apply(this, arguments));
	};
}
function AsyncGenerator(e) {
	var r, t;
	function resume(r, t) {
		try {
			var n = e[r](t), o = n.value, u = o instanceof _OverloadYield;
			Promise.resolve(u ? o.v : o).then(function(t) {
				if (u) {
					var i = "return" === r ? "return" : "next";
					if (!o.k || t.done) return resume(i, t);
					t = e[i](t).value;
				}
				settle(n.done ? "return" : "normal", t);
			}, function(e) {
				resume("throw", e);
			});
		} catch (e) {
			settle("throw", e);
		}
	}
	function settle(e, n) {
		switch (e) {
			case "return":
				r.resolve({
					value: n,
					done: !0
				});
				break;
			case "throw":
				r.reject(n);
				break;
			default: r.resolve({
				value: n,
				done: !1
			});
		}
		(r = r.next) ? resume(r.key, r.arg) : t = null;
	}
	this._invoke = function(e, n) {
		return new Promise(function(o, u) {
			var i = {
				key: e,
				arg: n,
				resolve: o,
				reject: u,
				next: null
			};
			t ? t = t.next = i : (r = t = i, resume(e, n));
		});
	}, "function" != typeof e["return"] && (this["return"] = void 0);
}
AsyncGenerator.prototype["function" == typeof Symbol && Symbol.asyncIterator || "@@asyncIterator"] = function() {
	return this;
}, AsyncGenerator.prototype.next = function(e) {
	return this._invoke("next", e);
}, AsyncGenerator.prototype["throw"] = function(e) {
	return this._invoke("throw", e);
}, AsyncGenerator.prototype["return"] = function(e) {
	return this._invoke("return", e);
};
//#endregion
//#region ../node_modules/@angular/ssr/fesm2022/ssr.mjs
init_defineProperty();
init_asyncToGenerator();
init_objectSpread2();
var _excluded = ["route"];
var _excluded2 = ["route", "fallback"];
var _excluded3 = ["path"];
var _excluded4 = ["route"];
var ServerAssets = class {
	constructor(manifest) {
		_defineProperty(this, "manifest", void 0);
		this.manifest = manifest;
	}
	getServerAsset(path) {
		const asset = this.manifest.assets[path];
		if (!asset) throw new Error(`Server asset '${path}' does not exist.`);
		return asset;
	}
	hasServerAsset(path) {
		return !!this.manifest.assets[path];
	}
	getIndexServerHtml() {
		return this.getServerAsset("index.server.html");
	}
};
var IGNORED_LOGS = /* @__PURE__ */ new Set(["Angular is running in development mode."]);
var Console = class extends Console$1 {
	log(message) {
		if (!IGNORED_LOGS.has(message)) super.log(message);
	}
};
var angularAppManifest;
function setAngularAppManifest(manifest) {
	angularAppManifest = manifest;
}
function getAngularAppManifest() {
	if (!angularAppManifest) throw new Error("Angular app manifest is not set. Please ensure you are using the '@angular/build:application' builder to build your server application.");
	return angularAppManifest;
}
var angularAppEngineManifest;
function setAngularAppEngineManifest(manifest) {
	angularAppEngineManifest = manifest;
}
function getAngularAppEngineManifest() {
	if (!angularAppEngineManifest) throw new Error("Angular app engine manifest is not set. Please ensure you are using the '@angular/build:application' builder to build your server application.");
	return angularAppEngineManifest;
}
function stripTrailingSlash(url) {
	return url.length > 1 && url.at(-1) === "/" ? url.slice(0, -1) : url;
}
function stripLeadingSlash(url) {
	return url.length > 1 && url[0] === "/" ? url.slice(1) : url;
}
function addLeadingSlash(url) {
	return url[0] === "/" ? url : `/${url}`;
}
function addTrailingSlash(url) {
	return url.at(-1) === "/" ? url : `${url}/`;
}
function joinUrlParts(...parts) {
	const normalizedParts = [];
	for (const part of parts) {
		if (part === "") continue;
		let start = 0;
		let end = part.length;
		while (start < end && part[start] === "/") start++;
		while (end > start && part[end - 1] === "/") end--;
		if (start < end) normalizedParts.push(part.slice(start, end));
	}
	return addLeadingSlash(normalizedParts.join("/"));
}
function stripIndexHtmlFromURL(url) {
	if (url.pathname.endsWith("/index.html")) {
		const modifiedURL = new URL(url);
		modifiedURL.pathname = modifiedURL.pathname.slice(0, -11);
		return modifiedURL;
	}
	return url;
}
function buildPathWithParams(toPath, fromPath) {
	if (toPath[0] !== "/") throw new Error(`Invalid toPath: The string must start with a '/'. Received: '${toPath}'`);
	if (fromPath[0] !== "/") throw new Error(`Invalid fromPath: The string must start with a '/'. Received: '${fromPath}'`);
	if (!toPath.includes("/*")) return toPath;
	const fromPathParts = fromPath.split("/");
	const toPathParts = toPath.split("/");
	return joinUrlParts(...toPathParts.map((part, index) => toPathParts[index] === "*" ? fromPathParts[index] : part));
}
var MATRIX_PARAMS_REGEX = /;[^/]+/g;
function stripMatrixParams(pathname) {
	return pathname.includes(";") ? pathname.replace(MATRIX_PARAMS_REGEX, "") : pathname;
}
function renderAngular(_x, _x2, _x3, _x4, _x5) {
	return _renderAngular.apply(this, arguments);
}
function _renderAngular() {
	_renderAngular = _asyncToGenerator(function* (html, bootstrap, url, platformProviders, serverContext) {
		const urlToRender = stripIndexHtmlFromURL(url);
		const platformRef = platformServer([
			{
				provide: INITIAL_CONFIG,
				useValue: {
					url: urlToRender.href,
					document: html
				}
			},
			{
				provide: SERVER_CONTEXT,
				useValue: serverContext
			},
			{
				provide: Console$1,
				useFactory: () => new Console()
			},
			...platformProviders
		]);
		let redirectTo;
		let hasNavigationError = true;
		try {
			let applicationRef;
			if (isNgModule(bootstrap)) applicationRef = (yield platformRef.bootstrapModule(bootstrap)).injector.get(ApplicationRef);
			else applicationRef = yield bootstrap({ platformRef });
			yield applicationRef.whenStable();
			if (applicationRef.destroyed) return { hasNavigationError: true };
			const envInjector = applicationRef.injector;
			const routerIsProvided = !!envInjector.get(ActivatedRoute, null);
			const router = envInjector.get(Router);
			const lastSuccessfulNavigation = router.lastSuccessfulNavigation();
			if (!routerIsProvided) hasNavigationError = false;
			else if (lastSuccessfulNavigation === null || lastSuccessfulNavigation === void 0 ? void 0 : lastSuccessfulNavigation.finalUrl) {
				var _envInjector$get, _envInjector$get2;
				hasNavigationError = false;
				const requestPrefix = (_envInjector$get = envInjector.get(APP_BASE_HREF, null, { optional: true })) !== null && _envInjector$get !== void 0 ? _envInjector$get : (_envInjector$get2 = envInjector.get(REQUEST, null, { optional: true })) === null || _envInjector$get2 === void 0 ? void 0 : _envInjector$get2.headers.get("X-Forwarded-Prefix");
				const { pathname, search, hash } = envInjector.get(PlatformLocation);
				const finalUrl = constructSerializedUrl(router, {
					pathname,
					search,
					hash
				}, requestPrefix);
				if (constructSerializedUrl(router, urlToRender, requestPrefix) !== finalUrl) redirectTo = [
					pathname,
					search,
					hash
				].join("");
			}
			return {
				destroy: () => void asyncDestroyPlatform(platformRef),
				hasNavigationError,
				redirectTo,
				content: () => new Promise((resolve, reject) => {
					setTimeout(() => {
						renderInternal(platformRef, applicationRef).then(resolve).catch(reject).finally(() => void asyncDestroyPlatform(platformRef));
					}, 0);
				})
			};
		} catch (error) {
			yield asyncDestroyPlatform(platformRef);
			throw error;
		} finally {
			if (hasNavigationError || redirectTo) asyncDestroyPlatform(platformRef);
		}
	});
	return _renderAngular.apply(this, arguments);
}
function isNgModule(value) {
	return "ɵmod" in value;
}
function asyncDestroyPlatform(platformRef) {
	if (platformRef.destroyed) return Promise.resolve();
	return new Promise((resolve) => {
		setTimeout(() => {
			if (!platformRef.destroyed) platformRef.destroy();
			resolve();
		}, 0);
	});
}
function constructSerializedUrl(router, url, prefix) {
	const { pathname, hash, search } = url;
	const urlParts = [];
	if (prefix && !addTrailingSlash(pathname).startsWith(addTrailingSlash(prefix))) urlParts.push(joinUrlParts(prefix, pathname));
	else urlParts.push(stripTrailingSlash(pathname));
	urlParts.push(search, hash);
	const urlTree = router.parseUrl(urlParts.join(""));
	return router.serializeUrl(urlTree);
}
function promiseWithAbort(promise, signal, errorMessagePrefix) {
	return new Promise((resolve, reject) => {
		const abortHandler = () => {
			reject(new DOMException(`${errorMessagePrefix} was aborted.\n${signal.reason}`, "AbortError"));
		};
		if (signal.aborted) {
			abortHandler();
			return;
		}
		signal.addEventListener("abort", abortHandler, { once: true });
		promise.then(resolve).catch(reject).finally(() => {
			signal.removeEventListener("abort", abortHandler);
		});
	});
}
var VALID_REDIRECT_RESPONSE_CODES = /* @__PURE__ */ new Set([
	301,
	302,
	303,
	307,
	308
]);
function isValidRedirectResponseCode(code) {
	return VALID_REDIRECT_RESPONSE_CODES.has(code);
}
function createRedirectResponse(location, status = 302, headers) {
	var _resHeaders$get$split, _resHeaders$get;
	if (ngDevMode && !isValidRedirectResponseCode(status)) throw new Error(`Invalid redirect status code: ${status}. Please use one of the following redirect response codes: ${[...VALID_REDIRECT_RESPONSE_CODES.values()].join(", ")}.`);
	const resHeaders = headers instanceof Headers ? headers : new Headers(headers);
	if (ngDevMode && resHeaders.has("location")) console.warn(`Location header "${resHeaders.get("location")}" will be ignored and set to "${location}".`);
	const varyArray = (_resHeaders$get$split = (_resHeaders$get = resHeaders.get("Vary")) === null || _resHeaders$get === void 0 ? void 0 : _resHeaders$get.split(",")) !== null && _resHeaders$get$split !== void 0 ? _resHeaders$get$split : [];
	const varySet = /* @__PURE__ */ new Set(["X-Forwarded-Prefix"]);
	for (const vary of varyArray) {
		const value = vary.trim();
		if (value) varySet.add(value);
	}
	resHeaders.set("Vary", [...varySet].join(", "));
	resHeaders.set("Location", location);
	return new Response(null, {
		status,
		headers: resHeaders
	});
}
var APP_SHELL_ROUTE = "ng-app-shell";
var ServerRenderingFeatureKind;
(function(ServerRenderingFeatureKind) {
	ServerRenderingFeatureKind[ServerRenderingFeatureKind["AppShell"] = 0] = "AppShell";
	ServerRenderingFeatureKind[ServerRenderingFeatureKind["ServerRoutes"] = 1] = "ServerRoutes";
})(ServerRenderingFeatureKind || (ServerRenderingFeatureKind = {}));
var RenderMode;
(function(RenderMode) {
	RenderMode[RenderMode["Server"] = 0] = "Server";
	RenderMode[RenderMode["Client"] = 1] = "Client";
	RenderMode[RenderMode["Prerender"] = 2] = "Prerender";
})(RenderMode || (RenderMode = {}));
var PrerenderFallback;
(function(PrerenderFallback) {
	PrerenderFallback[PrerenderFallback["Server"] = 0] = "Server";
	PrerenderFallback[PrerenderFallback["Client"] = 1] = "Client";
	PrerenderFallback[PrerenderFallback["None"] = 2] = "None";
})(PrerenderFallback || (PrerenderFallback = {}));
var SERVER_ROUTES_CONFIG = new InjectionToken("SERVER_ROUTES_CONFIG");
function withRoutes(routes) {
	const config = { routes };
	return {
		ɵkind: ServerRenderingFeatureKind.ServerRoutes,
		ɵproviders: [{
			provide: SERVER_ROUTES_CONFIG,
			useValue: config
		}]
	};
}
function withAppShell(component) {
	const routeConfig = { path: APP_SHELL_ROUTE };
	if ("ɵcmp" in component) routeConfig.component = component;
	else routeConfig.loadComponent = component;
	return {
		ɵkind: ServerRenderingFeatureKind.AppShell,
		ɵproviders: [{
			provide: ROUTES,
			useValue: routeConfig,
			multi: true
		}, provideEnvironmentInitializer(() => {
			const config = inject(SERVER_ROUTES_CONFIG);
			config.appShellRoute = APP_SHELL_ROUTE;
		})]
	};
}
function provideServerRendering(...args) {
	let options;
	let features;
	if (hasOptions(args)) {
		const [first, ...rest] = args;
		options = first;
		features = rest;
	} else features = args;
	const providers = [provideServerRendering$1(options)];
	let hasAppShell = false;
	let hasServerRoutes = false;
	for (const { ɵkind, ɵproviders } of features) {
		hasAppShell || (hasAppShell = ɵkind === ServerRenderingFeatureKind.AppShell);
		hasServerRoutes || (hasServerRoutes = ɵkind === ServerRenderingFeatureKind.ServerRoutes);
		providers.push(...ɵproviders);
	}
	if (!hasServerRoutes && hasAppShell) throw new Error("Configuration error: found 'withAppShell()' without 'withRoutes()' in the same call to 'provideServerRendering()'.The 'withAppShell()' function requires 'withRoutes()' to be used.");
	return makeEnvironmentProviders(providers);
}
function hasOptions(args) {
	const value = args[0];
	return !!value && typeof value === "object" && !("ɵkind" in value);
}
var RouteTree = class RouteTree {
	constructor() {
		_defineProperty(this, "root", this.createEmptyRouteTreeNode());
	}
	insert(route, metadata) {
		let node = this.root;
		const segments = this.getPathSegments(route);
		const normalizedSegments = [];
		for (const segment of segments) {
			const normalizedSegment = segment[0] === ":" ? "*" : segment;
			let childNode = node.children.get(normalizedSegment);
			if (!childNode) {
				childNode = this.createEmptyRouteTreeNode();
				node.children.set(normalizedSegment, childNode);
			}
			node = childNode;
			normalizedSegments.push(normalizedSegment);
		}
		node.metadata = _objectSpread2(_objectSpread2({}, metadata), {}, { route: addLeadingSlash(normalizedSegments.join("/")) });
	}
	match(route) {
		var _this$traverseBySegme;
		const segments = this.getPathSegments(route);
		return (_this$traverseBySegme = this.traverseBySegments(segments)) === null || _this$traverseBySegme === void 0 ? void 0 : _this$traverseBySegme.metadata;
	}
	toObject() {
		return Array.from(this.traverse());
	}
	static fromObject(value) {
		const tree = new RouteTree();
		for (const _ref of value) {
			let { route } = _ref, metadata = _objectWithoutProperties(_ref, _excluded);
			tree.insert(route, metadata);
		}
		return tree;
	}
	*traverse(node = this.root) {
		if (node.metadata) yield node.metadata;
		for (const childNode of node.children.values()) yield* this.traverse(childNode);
	}
	getPathSegments(route) {
		return route.split("/").filter(Boolean).map(decodeURIComponent);
	}
	traverseBySegments(segments, node = this.root, currentIndex = 0) {
		if (currentIndex >= segments.length) return node.metadata ? node : node.children.get("**");
		if (!node.children.size) return;
		const segment = segments[currentIndex];
		const exactMatch = node.children.get(segment);
		if (exactMatch) {
			const match = this.traverseBySegments(segments, exactMatch, currentIndex + 1);
			if (match) return match;
		}
		const wildcardMatch = node.children.get("*");
		if (wildcardMatch) {
			const match = this.traverseBySegments(segments, wildcardMatch, currentIndex + 1);
			if (match) return match;
		}
		return node.children.get("**");
	}
	createEmptyRouteTreeNode() {
		return { children: /* @__PURE__ */ new Map() };
	}
};
var IS_DISCOVERING_ROUTES = new InjectionToken(typeof ngDevMode === "undefined" || ngDevMode ? "IS_DISCOVERING_ROUTES" : "", {
	providedIn: "platform",
	factory: () => false
});
var MODULE_PRELOAD_MAX = 10;
var CATCH_ALL_REGEXP = /\/(\*\*)$/;
var URL_PARAMETER_REGEXP = new RegExp("(?<!\\\\):([^/]+)", "");
var URL_PARAMETER_GLOBAL_REGEXP = new RegExp(URL_PARAMETER_REGEXP, "g");
function handleRoute(_x6) {
	return _handleRoute.apply(this, arguments);
}
function _handleRoute() {
	_handleRoute = _wrapAsyncGenerator(function* (options) {
		try {
			const { metadata, currentRoutePath, route, compiler, parentInjector, serverConfigRouteTree, entryPointToBrowserMapping, invokeGetPrerenderParams, includePrerenderFallbackRoutes } = options;
			const { redirectTo, loadChildren: loadChildren$1, loadComponent, children, ɵentryName } = route;
			if (ɵentryName && loadComponent) appendPreloadToMetadata(ɵentryName, entryPointToBrowserMapping, metadata);
			if (metadata.renderMode === RenderMode.Prerender) yield* _asyncGeneratorDelegate(_asyncIterator(handleSSGRoute(serverConfigRouteTree, typeof redirectTo === "string" ? redirectTo : void 0, metadata, parentInjector, invokeGetPrerenderParams, includePrerenderFallbackRoutes)));
			else if (redirectTo !== void 0) {
				if (metadata.status && !isValidRedirectResponseCode(metadata.status)) yield { error: `The '${metadata.status}' status code is not a valid redirect response code. Please use one of the following redirect response codes: ${[...VALID_REDIRECT_RESPONSE_CODES.values()].join(", ")}.` };
				else if (typeof redirectTo === "string") yield _objectSpread2(_objectSpread2({}, metadata), {}, { redirectTo: resolveRedirectTo(metadata.route, redirectTo) });
				else yield metadata;
			} else yield metadata;
			if (children === null || children === void 0 ? void 0 : children.length) yield* _asyncGeneratorDelegate(_asyncIterator(traverseRoutesConfig(_objectSpread2(_objectSpread2({}, options), {}, {
				routes: children,
				parentRoute: currentRoutePath,
				parentPreloads: metadata.preload
			}))));
			if (loadChildren$1) {
				if (ɵentryName) appendPreloadToMetadata(ɵentryName, entryPointToBrowserMapping, metadata);
				const routeInjector = route.providers ? createEnvironmentInjector(route.providers, parentInjector.get(EnvironmentInjector), `Route: ${route.path}`) : parentInjector;
				const loadedChildRoutes = yield _awaitAsyncGenerator(loadChildren(route, compiler, routeInjector));
				if (loadedChildRoutes) {
					const { routes: childRoutes, injector = routeInjector } = loadedChildRoutes;
					yield* _asyncGeneratorDelegate(_asyncIterator(traverseRoutesConfig(_objectSpread2(_objectSpread2({}, options), {}, {
						routes: childRoutes,
						parentInjector: injector,
						parentRoute: currentRoutePath,
						parentPreloads: metadata.preload
					}))));
				}
			}
		} catch (error) {
			yield { error: `Error in handleRoute for '${options.currentRoutePath}': ${error.message}` };
		}
	});
	return _handleRoute.apply(this, arguments);
}
function traverseRoutesConfig(_x7) {
	return _traverseRoutesConfig.apply(this, arguments);
}
function _traverseRoutesConfig() {
	_traverseRoutesConfig = _wrapAsyncGenerator(function* (options) {
		const { routes: routeConfigs, parentPreloads, parentRoute, serverConfigRouteTree } = options;
		for (const route of routeConfigs) {
			const { matcher, path = matcher ? "**" : "" } = route;
			const currentRoutePath = joinUrlParts(parentRoute, path);
			if (matcher && serverConfigRouteTree) {
				const matches = [];
				for (const matchedMetaData of serverConfigRouteTree.traverse()) if (matchedMetaData.route.startsWith(currentRoutePath)) matches.push(matchedMetaData);
				if (!matches.length) {
					const matchedMetaData = serverConfigRouteTree.match(currentRoutePath);
					if (matchedMetaData) matches.push(matchedMetaData);
				}
				for (const matchedMetaData of matches) {
					matchedMetaData.presentInClientRouter = true;
					if (matchedMetaData.renderMode === RenderMode.Prerender) {
						yield { error: `The route '${stripLeadingSlash(currentRoutePath)}' is set for prerendering but has a defined matcher. Routes with matchers cannot use prerendering. Please specify a different 'renderMode'.` };
						continue;
					}
					yield* _asyncGeneratorDelegate(_asyncIterator(handleRoute(_objectSpread2(_objectSpread2({}, options), {}, {
						currentRoutePath,
						route,
						metadata: _objectSpread2(_objectSpread2({}, matchedMetaData), {}, {
							preload: parentPreloads,
							route: matchedMetaData.route,
							presentInClientRouter: void 0
						})
					}))));
				}
				if (!matches.length) yield { error: `The route '${stripLeadingSlash(currentRoutePath)}' has a defined matcher but does not match any route in the server routing configuration. Please ensure this route is added to the server routing configuration.` };
				continue;
			}
			let matchedMetaData;
			if (serverConfigRouteTree) {
				matchedMetaData = serverConfigRouteTree.match(currentRoutePath);
				if (!matchedMetaData) {
					yield { error: `The '${stripLeadingSlash(currentRoutePath)}' route does not match any route defined in the server routing configuration. Please ensure this route is added to the server routing configuration.` };
					continue;
				}
				matchedMetaData.presentInClientRouter = true;
			}
			yield* _asyncGeneratorDelegate(_asyncIterator(handleRoute(_objectSpread2(_objectSpread2({}, options), {}, {
				metadata: _objectSpread2(_objectSpread2({ renderMode: RenderMode.Prerender }, matchedMetaData), {}, {
					preload: parentPreloads,
					route: path === "" ? addTrailingSlash(currentRoutePath) : currentRoutePath,
					presentInClientRouter: void 0
				}),
				currentRoutePath,
				route
			}))));
		}
	});
	return _traverseRoutesConfig.apply(this, arguments);
}
function appendPreloadToMetadata(entryName, entryPointToBrowserMapping, metadata) {
	var _metadata$preload;
	const existingPreloads = (_metadata$preload = metadata.preload) !== null && _metadata$preload !== void 0 ? _metadata$preload : [];
	if (!entryPointToBrowserMapping || existingPreloads.length >= MODULE_PRELOAD_MAX) return;
	const preload = entryPointToBrowserMapping[entryName];
	if (!(preload === null || preload === void 0 ? void 0 : preload.length)) return;
	const combinedPreloads = new Set(existingPreloads);
	for (const href of preload) {
		combinedPreloads.add(href);
		if (combinedPreloads.size === MODULE_PRELOAD_MAX) break;
	}
	metadata.preload = Array.from(combinedPreloads);
}
function handleSSGRoute(_x8, _x9, _x10, _x11, _x12, _x13) {
	return _handleSSGRoute.apply(this, arguments);
}
function _handleSSGRoute() {
	_handleSSGRoute = _wrapAsyncGenerator(function* (serverConfigRouteTree, redirectTo, metadata, parentInjector, invokeGetPrerenderParams, includePrerenderFallbackRoutes) {
		if (metadata.renderMode !== RenderMode.Prerender) throw new Error(`'handleSSGRoute' was called for a route which rendering mode is not prerender.`);
		const { route: currentRoutePath, fallback } = metadata, meta = _objectWithoutProperties(metadata, _excluded2);
		const getPrerenderParams = "getPrerenderParams" in meta ? meta.getPrerenderParams : void 0;
		if ("getPrerenderParams" in meta) delete meta["getPrerenderParams"];
		if (redirectTo !== void 0) meta.redirectTo = resolveRedirectTo(currentRoutePath, redirectTo);
		const isCatchAllRoute = CATCH_ALL_REGEXP.test(currentRoutePath);
		if (isCatchAllRoute && !getPrerenderParams || !isCatchAllRoute && !URL_PARAMETER_REGEXP.test(currentRoutePath)) {
			yield _objectSpread2(_objectSpread2({}, meta), {}, { route: currentRoutePath });
			return;
		}
		if (invokeGetPrerenderParams) {
			if (!getPrerenderParams) {
				yield { error: `The '${stripLeadingSlash(currentRoutePath)}' route uses prerendering and includes parameters, but 'getPrerenderParams' is missing. Please define 'getPrerenderParams' function for this route in your server routing configuration or specify a different 'renderMode'.` };
				return;
			}
			if (serverConfigRouteTree) {
				const catchAllRoutePath = isCatchAllRoute ? currentRoutePath : joinUrlParts(currentRoutePath, "**");
				const match = serverConfigRouteTree.match(catchAllRoutePath);
				if (match && match.renderMode === RenderMode.Prerender && !("getPrerenderParams" in match)) serverConfigRouteTree.insert(catchAllRoutePath, _objectSpread2(_objectSpread2({}, match), {}, {
					presentInClientRouter: true,
					getPrerenderParams
				}));
			}
			const parameters = yield _awaitAsyncGenerator(runInInjectionContext(parentInjector, () => getPrerenderParams()));
			try {
				for (const params of parameters) {
					const replacer = handlePrerenderParamsReplacement(params, currentRoutePath);
					const routeWithResolvedParams = currentRoutePath.replace(URL_PARAMETER_GLOBAL_REGEXP, replacer).replace(CATCH_ALL_REGEXP, replacer);
					yield _objectSpread2(_objectSpread2({}, meta), {}, {
						route: routeWithResolvedParams,
						redirectTo: redirectTo === void 0 ? void 0 : resolveRedirectTo(routeWithResolvedParams, redirectTo)
					});
				}
			} catch (error) {
				yield { error: `${error.message}` };
				return;
			}
		}
		if (includePrerenderFallbackRoutes && (fallback !== PrerenderFallback.None || !invokeGetPrerenderParams)) yield _objectSpread2(_objectSpread2({}, meta), {}, {
			route: currentRoutePath,
			renderMode: fallback === PrerenderFallback.Client ? RenderMode.Client : RenderMode.Server
		});
	});
	return _handleSSGRoute.apply(this, arguments);
}
function handlePrerenderParamsReplacement(params, currentRoutePath) {
	return (match) => {
		const parameterName = match.slice(1);
		const value = params[parameterName];
		if (typeof value !== "string") throw new Error(`The 'getPrerenderParams' function defined for the '${stripLeadingSlash(currentRoutePath)}' route returned a non-string value for parameter '${parameterName}'. Please make sure the 'getPrerenderParams' function returns values for all parameters specified in this route.`);
		return parameterName === "**" ? `/${value}` : value;
	};
}
function resolveRedirectTo(routePath, redirectTo) {
	if (redirectTo[0] === "/") return redirectTo;
	const segments = routePath.replace(URL_PARAMETER_GLOBAL_REGEXP, "*").split("/");
	segments.pop();
	return joinUrlParts(...segments, redirectTo);
}
function buildServerConfigRouteTree({ routes, appShellRoute }) {
	const serverRoutes = [...routes];
	if (appShellRoute !== void 0) serverRoutes.unshift({
		path: appShellRoute,
		renderMode: RenderMode.Prerender
	});
	const serverConfigRouteTree = new RouteTree();
	const errors = [];
	for (const _ref2 of serverRoutes) {
		let { path } = _ref2, metadata = _objectWithoutProperties(_ref2, _excluded3);
		if (path[0] === "/") {
			errors.push(`Invalid '${path}' route configuration: the path cannot start with a slash.`);
			continue;
		}
		if ("getPrerenderParams" in metadata && (path.includes("/*/") || path.endsWith("/*"))) {
			errors.push(`Invalid '${path}' route configuration: 'getPrerenderParams' cannot be used with a '*' route.`);
			continue;
		}
		serverConfigRouteTree.insert(path, metadata);
	}
	return {
		serverConfigRouteTree,
		errors
	};
}
function getRoutesFromAngularRouterConfig(_x14, _x15, _x16) {
	return _getRoutesFromAngularRouterConfig.apply(this, arguments);
}
function _getRoutesFromAngularRouterConfig() {
	_getRoutesFromAngularRouterConfig = _asyncToGenerator(function* (bootstrap, document, url, invokeGetPrerenderParams = false, includePrerenderFallbackRoutes = true, entryPointToBrowserMapping = void 0) {
		const { protocol, host } = url;
		const platformRef = platformServer([
			{
				provide: INITIAL_CONFIG,
				useValue: {
					document,
					url: `${protocol}//${host}/`
				}
			},
			{
				provide: Console$1,
				useFactory: () => new Console()
			},
			{
				provide: ENABLE_ROOT_COMPONENT_BOOTSTRAP,
				useValue: false
			},
			{
				provide: IS_DISCOVERING_ROUTES,
				useValue: true
			}
		]);
		try {
			var _router$navigationTra, _router$navigationTra2, _injector$get;
			let applicationRef;
			if (isNgModule(bootstrap)) applicationRef = (yield platformRef.bootstrapModule(bootstrap)).injector.get(ApplicationRef);
			else applicationRef = yield bootstrap({ platformRef });
			const injector = applicationRef.injector;
			const router = injector.get(Router);
			(_router$navigationTra = router.navigationTransitions.afterPreactivation()) === null || _router$navigationTra === void 0 || (_router$navigationTra2 = _router$navigationTra.next) === null || _router$navigationTra2 === void 0 || _router$navigationTra2.call(_router$navigationTra);
			yield applicationRef.whenStable();
			const errors = [];
			const rawBaseHref = (_injector$get = injector.get(APP_BASE_HREF, null, { optional: true })) !== null && _injector$get !== void 0 ? _injector$get : injector.get(PlatformLocation).getBaseHrefFromDOM();
			const { pathname: baseHref } = new URL(rawBaseHref, "http://localhost");
			const compiler = injector.get(Compiler);
			const serverRoutesConfig = injector.get(SERVER_ROUTES_CONFIG, null, { optional: true });
			let serverConfigRouteTree;
			if (serverRoutesConfig) {
				const result = buildServerConfigRouteTree(serverRoutesConfig);
				serverConfigRouteTree = result.serverConfigRouteTree;
				errors.push(...result.errors);
			}
			if (errors.length) return {
				baseHref,
				routes: [],
				errors
			};
			const routesResults = [];
			if (router.config.length) {
				const traverseRoutes = traverseRoutesConfig({
					routes: router.config,
					compiler,
					parentInjector: injector,
					parentRoute: "",
					serverConfigRouteTree,
					invokeGetPrerenderParams,
					includePrerenderFallbackRoutes,
					entryPointToBrowserMapping
				});
				const seenRoutes = /* @__PURE__ */ new Set();
				var _iteratorAbruptCompletion = false;
				var _didIteratorError = false;
				var _iteratorError;
				try {
					for (var _iterator = _asyncIterator(traverseRoutes), _step; _iteratorAbruptCompletion = !(_step = yield _iterator.next()).done; _iteratorAbruptCompletion = false) {
						const routeMetadata = _step.value;
						{
							if ("error" in routeMetadata) {
								errors.push(routeMetadata.error);
								continue;
							}
							const routePath = routeMetadata.route;
							if (!seenRoutes.has(routePath)) {
								routesResults.push(routeMetadata);
								seenRoutes.add(routePath);
							}
						}
					}
				} catch (err) {
					_didIteratorError = true;
					_iteratorError = err;
				} finally {
					try {
						if (_iteratorAbruptCompletion && _iterator.return != null) yield _iterator.return();
					} finally {
						if (_didIteratorError) throw _iteratorError;
					}
				}
				yield new Promise((resolve) => setTimeout(resolve, 0));
				if (serverConfigRouteTree) for (const { route, presentInClientRouter } of serverConfigRouteTree.traverse()) {
					if (presentInClientRouter || route.endsWith("/**")) continue;
					errors.push(`The '${stripLeadingSlash(route)}' server route does not match any routes defined in the Angular routing configuration (typically provided as a part of the 'provideRouter' call). Please make sure that the mentioned server route is present in the Angular routing configuration.`);
				}
			} else {
				var _serverConfigRouteTre;
				const rootRouteMetadata = (_serverConfigRouteTre = serverConfigRouteTree === null || serverConfigRouteTree === void 0 ? void 0 : serverConfigRouteTree.match("")) !== null && _serverConfigRouteTre !== void 0 ? _serverConfigRouteTre : {
					route: "",
					renderMode: RenderMode.Prerender
				};
				routesResults.push(_objectSpread2(_objectSpread2({}, rootRouteMetadata), {}, { route: "" }));
			}
			return {
				baseHref,
				routes: routesResults,
				errors,
				appShellRoute: serverRoutesConfig === null || serverRoutesConfig === void 0 ? void 0 : serverRoutesConfig.appShellRoute
			};
		} finally {
			platformRef.destroy();
		}
	});
	return _getRoutesFromAngularRouterConfig.apply(this, arguments);
}
function extractRoutesAndCreateRouteTree(options) {
	const { url, manifest = getAngularAppManifest(), invokeGetPrerenderParams = false, includePrerenderFallbackRoutes = true, signal } = options;
	function extract() {
		return _extract.apply(this, arguments);
	}
	function _extract() {
		_extract = _asyncToGenerator(function* () {
			const routeTree = new RouteTree();
			const document = yield new ServerAssets(manifest).getIndexServerHtml().text();
			const { baseHref, appShellRoute, routes, errors } = yield getRoutesFromAngularRouterConfig(yield manifest.bootstrap(), document, url, invokeGetPrerenderParams, includePrerenderFallbackRoutes, manifest.entryPointToBrowserMapping);
			for (const _ref3 of routes) {
				let { route } = _ref3, metadata = _objectWithoutProperties(_ref3, _excluded4);
				if (metadata.redirectTo !== void 0) metadata.redirectTo = joinUrlParts(baseHref, metadata.redirectTo);
				for (const [key, value] of Object.entries(metadata)) if (value === void 0) delete metadata[key];
				const fullRoute = joinUrlParts(baseHref, route);
				routeTree.insert(fullRoute, metadata);
			}
			return {
				appShellRoute,
				routeTree,
				errors
			};
		});
		return _extract.apply(this, arguments);
	}
	return signal ? promiseWithAbort(extract(), signal, "Routes extraction") : extract();
}
var Hooks = class {
	constructor() {
		_defineProperty(this, "store", /* @__PURE__ */ new Map());
	}
	run(name, context) {
		var _this = this;
		return _asyncToGenerator(function* () {
			const hooks = _this.store.get(name);
			switch (name) {
				case "html:transform:pre": {
					if (!hooks) return context.html;
					const ctx = _objectSpread2({}, context);
					for (const hook of hooks) ctx.html = yield hook(ctx);
					return ctx.html;
				}
				default: throw new Error(`Running hook "${name}" is not supported.`);
			}
		})();
	}
	on(name, handler) {
		const hooks = this.store.get(name);
		if (hooks) hooks.push(handler);
		else this.store.set(name, [handler]);
	}
	has(name) {
		var _this$store$get;
		return !!((_this$store$get = this.store.get(name)) === null || _this$store$get === void 0 ? void 0 : _this$store$get.length);
	}
};
var ServerRouter = class ServerRouter {
	constructor(routeTree) {
		_defineProperty(this, "routeTree", void 0);
		this.routeTree = routeTree;
	}
	static from(manifest, url) {
		var _extractionPromise$_;
		if (manifest.routes) {
			const routeTree = RouteTree.fromObject(manifest.routes);
			return Promise.resolve(new ServerRouter(routeTree));
		}
		(_extractionPromise$_ = _extractionPromise._) !== null && _extractionPromise$_ !== void 0 || (_extractionPromise._ = extractRoutesAndCreateRouteTree({
			url,
			manifest
		}).then(({ routeTree, errors }) => {
			if (errors.length > 0) throw new Error("Error(s) occurred while extracting routes:\n" + errors.map((error) => `- ${error}`).join("\n"));
			return new ServerRouter(routeTree);
		}).finally(() => {
			_extractionPromise._ = void 0;
		}));
		return _extractionPromise._;
	}
	match(url) {
		let { pathname } = stripIndexHtmlFromURL(url);
		pathname = stripMatrixParams(pathname);
		return this.routeTree.match(pathname);
	}
};
var _extractionPromise = { _: void 0 };
var WELL_KNOWN_NON_ANGULAR_URLS = /* @__PURE__ */ new Set(["/favicon.ico", "/.well-known/appspecific/com.chrome.devtools.json"]);
var SERVER_CONTEXT_VALUE = {
	[RenderMode.Prerender]: "ssg",
	[RenderMode.Server]: "ssr",
	[RenderMode.Client]: ""
};
var AngularServerApp = class {
	constructor(options = {}) {
		var _this$options$allowSt, _options$hooks;
		_defineProperty(this, "options", void 0);
		_defineProperty(this, "allowStaticRouteRender", void 0);
		_defineProperty(this, "hooks", void 0);
		_defineProperty(this, "manifest", getAngularAppManifest());
		_defineProperty(this, "assets", new ServerAssets(this.manifest));
		_defineProperty(this, "router", void 0);
		_defineProperty(this, "inlineCriticalCssProcessor", void 0);
		_defineProperty(this, "boostrap", void 0);
		_defineProperty(this, "textEncoder", new TextEncoder());
		this.options = options;
		this.allowStaticRouteRender = (_this$options$allowSt = this.options.allowStaticRouteRender) !== null && _this$options$allowSt !== void 0 ? _this$options$allowSt : false;
		this.hooks = (_options$hooks = options.hooks) !== null && _options$hooks !== void 0 ? _options$hooks : new Hooks();
	}
	handle(request, requestContext) {
		var _this2 = this;
		return _asyncToGenerator(function* () {
			var _this$router;
			const url = new URL(request.url);
			if (WELL_KNOWN_NON_ANGULAR_URLS.has(url.pathname)) return null;
			(_this$router = _this2.router) !== null && _this$router !== void 0 || (_this2.router = yield ServerRouter.from(_this2.manifest, url));
			const matchedRoute = _this2.router.match(url);
			if (!matchedRoute) return null;
			const { redirectTo, status, renderMode, headers } = matchedRoute;
			if (redirectTo !== void 0) {
				var _request$headers$get;
				return createRedirectResponse(joinUrlParts((_request$headers$get = request.headers.get("X-Forwarded-Prefix")) !== null && _request$headers$get !== void 0 ? _request$headers$get : "", buildPathWithParams(redirectTo, url.pathname)), status, headers);
			}
			if (renderMode === RenderMode.Prerender) {
				const response = yield _this2.handleServe(request, matchedRoute);
				if (response) return response;
			}
			return promiseWithAbort(_this2.handleRendering(request, matchedRoute, requestContext), request.signal, `Request for: ${request.url}`);
		})();
	}
	handleServe(request, matchedRoute) {
		var _this3 = this;
		return _asyncToGenerator(function* () {
			const { headers, renderMode } = matchedRoute;
			if (renderMode !== RenderMode.Prerender) return null;
			const { method } = request;
			if (method !== "GET" && method !== "HEAD") return null;
			const assetPath = _this3.buildServerAssetPathFromRequest(request);
			const { manifest: { locale }, assets } = _this3;
			if (!assets.hasServerAsset(assetPath)) return null;
			const { text, hash, size } = assets.getServerAsset(assetPath);
			const etag = `"${hash}"`;
			return request.headers.get("if-none-match") === etag ? new Response(void 0, {
				status: 304,
				statusText: "Not Modified"
			}) : new Response(yield text(), { headers: _objectSpread2(_objectSpread2({
				"Content-Length": size.toString(),
				"ETag": etag,
				"Content-Type": "text/html;charset=UTF-8"
			}, locale !== void 0 ? { "Content-Language": locale } : {}), headers) });
		})();
	}
	handleRendering(request, matchedRoute, requestContext) {
		var _this4 = this;
		return _asyncToGenerator(function* () {
			var _this$boostrap;
			const { renderMode, headers, status, preload } = matchedRoute;
			if (!_this4.allowStaticRouteRender && renderMode === RenderMode.Prerender) return null;
			const url = new URL(request.url);
			const platformProviders = [];
			const { manifest: { bootstrap, locale }, assets } = _this4;
			const responseInit = {
				status,
				headers: new Headers(_objectSpread2(_objectSpread2({ "Content-Type": "text/html;charset=UTF-8" }, locale !== void 0 ? { "Content-Language": locale } : {}), headers))
			};
			if (renderMode === RenderMode.Server) platformProviders.push({
				provide: REQUEST,
				useValue: request
			}, {
				provide: REQUEST_CONTEXT,
				useValue: requestContext
			}, {
				provide: RESPONSE_INIT,
				useValue: responseInit
			});
			else if (renderMode === RenderMode.Client) {
				let html = yield _this4.assets.getServerAsset("index.csr.html").text();
				html = yield _this4.runTransformsOnHtml(html, url, preload);
				return new Response(html, responseInit);
			}
			if (locale !== void 0) platformProviders.push({
				provide: LOCALE_ID,
				useValue: locale
			});
			(_this$boostrap = _this4.boostrap) !== null && _this$boostrap !== void 0 || (_this4.boostrap = yield bootstrap());
			let html = yield assets.getIndexServerHtml().text();
			html = yield _this4.runTransformsOnHtml(html, url, preload);
			const result = yield renderAngular(html, _this4.boostrap, url, platformProviders, SERVER_CONTEXT_VALUE[renderMode]);
			if (result.hasNavigationError) return null;
			if (result.redirectTo) return createRedirectResponse(result.redirectTo, responseInit.status, responseInit.headers);
			if (renderMode === RenderMode.Prerender) {
				const renderedHtml = yield result.content();
				const finalHtml = _this4.inlineCriticalCss(renderedHtml);
				return new Response(finalHtml, responseInit);
			}
			const stream = new ReadableStream({
				start: function() {
					var _ref4 = _asyncToGenerator(function* (controller) {
						try {
							let renderedHtml = yield result.content();
							renderedHtml = _this4.inlineCriticalCss(renderedHtml);
							controller.enqueue(_this4.textEncoder.encode(renderedHtml));
							controller.close();
						} catch (error) {
							result.destroy();
							controller.error(error);
						}
					});
					return function start(_x17) {
						return _ref4.apply(this, arguments);
					};
				}(),
				cancel: () => {
					result.destroy();
				}
			});
			return new Response(stream, responseInit);
		})();
	}
	inlineCriticalCss(html) {
		const { criticalCssPlans, nonce } = this.manifest;
		if (!(criticalCssPlans === null || criticalCssPlans === void 0 ? void 0 : criticalCssPlans.length)) return html;
		try {
			var _this$inlineCriticalC;
			(_this$inlineCriticalC = this.inlineCriticalCssProcessor) !== null && _this$inlineCriticalC !== void 0 || (this.inlineCriticalCssProcessor = createProcessor([...criticalCssPlans], {
				preload: "media-script",
				nonce,
				preloadFonts: true,
				inlineFonts: true,
				noscriptFallback: true,
				cache: true,
				logger: { warn: console.warn }
			}).process);
			return this.inlineCriticalCssProcessor(html);
		} catch (error) {
			console.error("An error occurred while inlining critical CSS.", error);
			return html;
		}
	}
	buildServerAssetPathFromRequest(request) {
		let { pathname: assetPath } = new URL(request.url);
		try {
			assetPath = decodeURIComponent(assetPath);
		} catch (_unused) {}
		if (!assetPath.endsWith("/index.html")) assetPath = joinUrlParts(assetPath, "index.html");
		const { baseHref } = this.manifest;
		if (baseHref.length > 1 && assetPath.startsWith(baseHref)) assetPath = assetPath.slice(baseHref.length);
		return stripLeadingSlash(assetPath);
	}
	runTransformsOnHtml(html, url, preload) {
		var _this5 = this;
		return _asyncToGenerator(function* () {
			if (_this5.hooks.has("html:transform:pre")) html = yield _this5.hooks.run("html:transform:pre", {
				html,
				url
			});
			if (preload === null || preload === void 0 ? void 0 : preload.length) html = appendPreloadHintsToHtml(html, preload);
			return html;
		})();
	}
};
var angularServerApp;
function getOrCreateAngularServerApp(options) {
	var _angularServerApp;
	return (_angularServerApp = angularServerApp) !== null && _angularServerApp !== void 0 ? _angularServerApp : angularServerApp = new AngularServerApp(options);
}
function destroyAngularServerApp() {
	if (typeof ngDevMode === "undefined" || ngDevMode) resetCompiledComponents();
	angularServerApp = void 0;
}
function appendPreloadHintsToHtml(html, preload) {
	const bodyCloseIdx = html.lastIndexOf("</body>");
	if (bodyCloseIdx === -1) return html;
	return [
		html.slice(0, bodyCloseIdx),
		...preload.map((val) => `<link rel="modulepreload" href="${val}">`),
		html.slice(bodyCloseIdx)
	].join("\n");
}
function getPotentialLocaleIdFromUrl(url, basePath) {
	const { pathname } = url;
	let start = basePath.length;
	if (pathname[start] === "/") start++;
	let end = pathname.indexOf("/", start);
	if (end === -1) end = pathname.length;
	return pathname.slice(start, end);
}
function parseLanguageHeader(header) {
	if (header === "*") return /* @__PURE__ */ new Map([["*", 1]]);
	const parsedValues = header.split(",").map((item) => {
		const [locale, qualityValue] = item.split(";", 2).map((v) => v.trim());
		let quality = (qualityValue === null || qualityValue === void 0 ? void 0 : qualityValue.startsWith("q=")) ? parseFloat(qualityValue.slice(2)) : void 0;
		if (typeof quality !== "number" || isNaN(quality) || quality < 0 || quality > 1) quality = 1;
		return [locale, quality];
	}).sort(([_localeA, qualityA], [_localeB, qualityB]) => qualityB - qualityA);
	return new Map(parsedValues);
}
function getPreferredLocale(header, supportedLocales) {
	if (supportedLocales.length < 2) return supportedLocales[0];
	const parsedLocales = parseLanguageHeader(header);
	if (parsedLocales.size === 0 || parsedLocales.size === 1 && parsedLocales.has("*")) return supportedLocales[0];
	const normalizedSupportedLocales = /* @__PURE__ */ new Map();
	for (const locale of supportedLocales) normalizedSupportedLocales.set(normalizeLocale(locale), locale);
	let bestMatch;
	const qualityZeroNormalizedLocales = /* @__PURE__ */ new Set();
	for (const [locale, quality] of parsedLocales) {
		const normalizedLocale = normalizeLocale(locale);
		if (quality === 0) {
			qualityZeroNormalizedLocales.add(normalizedLocale);
			continue;
		}
		if (normalizedSupportedLocales.has(normalizedLocale)) return normalizedSupportedLocales.get(normalizedLocale);
		if (bestMatch !== void 0) continue;
		const [languagePrefix] = normalizedLocale.split("-", 1);
		for (const supportedLocale of normalizedSupportedLocales.keys()) if (supportedLocale.startsWith(languagePrefix)) {
			bestMatch = normalizedSupportedLocales.get(supportedLocale);
			break;
		}
	}
	if (bestMatch !== void 0) return bestMatch;
	for (const [normalizedLocale, locale] of normalizedSupportedLocales) if (!qualityZeroNormalizedLocales.has(normalizedLocale)) return locale;
}
function normalizeLocale(locale) {
	return locale.toLowerCase();
}
var AngularAppEngine = class AngularAppEngine {
	constructor(options) {
		_defineProperty(this, "manifest", getAngularAppEngineManifest());
		_defineProperty(this, "allowedHosts", void 0);
		_defineProperty(this, "supportedLocales", Object.keys(this.manifest.supportedLocales));
		_defineProperty(this, "trustProxyHeaders", void 0);
		_defineProperty(this, "entryPointsCache", /* @__PURE__ */ new Map());
		this.allowedHosts = this.getAllowedHosts(options);
		this.trustProxyHeaders = normalizeTrustProxyHeaders(options === null || options === void 0 ? void 0 : options.trustProxyHeaders);
	}
	getAllowedHosts(options) {
		var _options$allowedHosts;
		const allowedHosts = /* @__PURE__ */ new Set([...(_options$allowedHosts = options === null || options === void 0 ? void 0 : options.allowedHosts) !== null && _options$allowedHosts !== void 0 ? _options$allowedHosts : [], ...this.manifest.allowedHosts]);
		if (allowedHosts.has("*")) console.warn("Allowing all hosts via \"*\" is a security risk. This configuration should only be used when validation for \"Host\" and \"X-Forwarded-Host\" headers is performed in another layer, such as a load balancer or reverse proxy. For more information see: https://angular.dev/best-practices/security#preventing-server-side-request-forgery-ssrf");
		return allowedHosts;
	}
	handle(request, requestContext) {
		var _this6 = this;
		return _asyncToGenerator(function* () {
			const allowedHost = _this6.allowedHosts;
			const securedRequest = sanitizeRequestHeaders(request, _this6.trustProxyHeaders);
			try {
				validateRequest(securedRequest, allowedHost, AngularAppEngine.ɵdisableAllowedHostsCheck);
			} catch (error) {
				return _this6.handleValidationError(securedRequest.url, error);
			}
			const serverApp = yield _this6.getAngularServerAppForRequest(securedRequest);
			if (serverApp) return serverApp.handle(securedRequest, requestContext);
			if (_this6.supportedLocales.length > 1) return _this6.redirectBasedOnAcceptLanguage(securedRequest);
			return null;
		})();
	}
	redirectBasedOnAcceptLanguage(request) {
		const { basePath, supportedLocales } = this.manifest;
		const { pathname } = new URL(request.url);
		if (pathname !== basePath) return null;
		const preferredLocale = getPreferredLocale(request.headers.get("Accept-Language") || "*", this.supportedLocales);
		if (preferredLocale) {
			const subPath = supportedLocales[preferredLocale];
			if (subPath !== void 0) {
				var _request$headers$get2;
				return createRedirectResponse(joinUrlParts((_request$headers$get2 = request.headers.get("X-Forwarded-Prefix")) !== null && _request$headers$get2 !== void 0 ? _request$headers$get2 : "", pathname, subPath), 302, { "Vary": "Accept-Language" });
			}
		}
		return null;
	}
	getAngularServerAppForRequest(request) {
		var _this7 = this;
		return _asyncToGenerator(function* () {
			const url = new URL(request.url);
			const entryPoint = yield _this7.getEntryPointExportsForUrl(url);
			if (!entryPoint) return null;
			const ɵgetOrCreateAngularServerApp = entryPoint.ɵgetOrCreateAngularServerApp;
			return ɵgetOrCreateAngularServerApp({
				allowStaticRouteRender: AngularAppEngine.ɵallowStaticRouteRender,
				hooks: AngularAppEngine.ɵhooks
			});
		})();
	}
	getEntryPointExports(potentialLocale) {
		const cachedEntryPoint = this.entryPointsCache.get(potentialLocale);
		if (cachedEntryPoint) return cachedEntryPoint;
		const { entryPoints } = this.manifest;
		const entryPoint = entryPoints[potentialLocale];
		if (!entryPoint) return;
		const entryPointExports = entryPoint();
		this.entryPointsCache.set(potentialLocale, entryPointExports);
		return entryPointExports;
	}
	getEntryPointExportsForUrl(url) {
		var _this$getEntryPointEx;
		const { basePath, supportedLocales } = this.manifest;
		if (this.supportedLocales.length === 1) return this.getEntryPointExports(supportedLocales[this.supportedLocales[0]]);
		const potentialLocale = getPotentialLocaleIdFromUrl(url, basePath);
		return (_this$getEntryPointEx = this.getEntryPointExports(potentialLocale)) !== null && _this$getEntryPointEx !== void 0 ? _this$getEntryPointEx : this.getEntryPointExports("");
	}
	handleValidationError(url, error) {
		const errorMessage = error.message;
		console.error(`ERROR: Bad Request ("${url}").\n` + errorMessage + "\n\nFor more information, see https://angular.dev/best-practices/security#preventing-server-side-request-forgery-ssrf");
		return new Response(errorMessage, {
			status: 400,
			statusText: "Bad Request",
			headers: { "Content-Type": "text/plain" }
		});
	}
};
_defineProperty(AngularAppEngine, "ɵallowStaticRouteRender", false);
_defineProperty(AngularAppEngine, "ɵdisableAllowedHostsCheck", false);
_defineProperty(AngularAppEngine, "ɵhooks", new Hooks());
function createRequestHandler(handler) {
	handler["__ng_request_handler__"] = true;
	return handler;
}
//#endregion
export { validateUrl as S, renderModule as _, createRequestHandler as a, normalizeTrustProxyHeaders as b, getOrCreateAngularServerApp as c, setAngularAppEngineManifest as d, setAngularAppManifest as f, renderApplication as g, SERVER_CONTEXT as h, RenderMode as i, getRoutesFromAngularRouterConfig as l, withRoutes as m, IS_DISCOVERING_ROUTES as n, destroyAngularServerApp as o, withAppShell as p, PrerenderFallback as r, extractRoutesAndCreateRouteTree as s, AngularAppEngine as t, provideServerRendering as u, getFirstHeaderValue as v, parseForwardedHeader as x, isProxyHeaderAllowed as y };

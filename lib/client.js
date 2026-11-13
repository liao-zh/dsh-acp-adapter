window.__ModuleLoader__.load({
	id: "@zaimokuza/dsh-acp-adapter",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let _deepseek_ai_dsh_client_store = require("@deepseek-ai/dsh-client-store");
		let _deepseek_ai_dsh_api_gateway_client = require("@deepseek-ai/dsh-api-gateway/client");
		let zod = require("zod");
		//#region src/client/coordinator/native-session-navigation.ts
		function isMainSession(sessions, sessionId) {
			return (sessions.retainInfo(sessionId).getSnapshot().retainedBy.mainView ?? 0) > 0;
		}
		/**
		* The alpha.2 ui-subagent resource provider owns retention, restoration and rendering.
		* Keep its wire address here; do not import the upstream private source helper or
		* mount another Conversation implementation. Both direct-parent identity and mode
		* are required so a restored tab cannot turn a read-only projection into a live child.
		*/
		function openSubagentAside(sidebar, address) {
			const query = new URLSearchParams({
				parent: address.parentSessionId,
				mode: address.mode
			});
			sidebar.openResource(`dsh-resource://subagentchat/session/${encodeURIComponent(address.childSessionId)}?${query}`, {
				kind: "subagentchat",
				preferNewPane: true
			});
		}
		//#endregion
		//#region node_modules/.pnpm/@deepseek-ai+dsh-util-value_f181d1fcd8a8b46f1abb181be7cb1d74/node_modules/@deepseek-ai/dsh-util-values/lib/index.js
		/**
		* Lazily scanned view of one JSON object's top-level fields, built from text
		* that may still be streaming or from an already parsed object. Nothing is
		* scanned until a reader asks; the view remembers every question it answered
		* and reports changed answers when the owner refreshes for publication.
		* Used for model tool-call arguments: a row reads the fields it
		* cares about at whatever granularity it displays, at every stage of the call.
		* @module @deepseek-ai/dsh-util-values/src/partial-json
		*/
		const SIMPLE_ESCAPES = {
			"\"": "\"",
			"\\": "\\",
			"/": "/",
			b: "\b",
			f: "\f",
			n: "\n",
			r: "\r",
			t: "	"
		};
		const CONTENT_ESCAPE = /[\\\u0000-\u001f]/u;
		function isWhitespace(c) {
			return c === " " || c === "\n" || c === "\r" || c === "	";
		}
		function isHex(c) {
			return c >= "0" && c <= "9" || c >= "a" && c <= "f" || c >= "A" && c <= "F";
		}
		/**
		* The view. A streaming instance grows through {@link PartialArguments.append};
		* {@link PartialArguments.fromText} and {@link PartialArguments.fromObject} build
		* sealed instances over a finished call. Every reader is total: an absent or
		* differently typed field answers `undefined` (or `false`), never throws.
		*/
		var PartialArguments = class PartialArguments {
			/** The view of a call with no arguments available. */
			static EMPTY = PartialArguments.fromObject({});
			/**
			* View finished argument text without scanning it until a reader asks.
			* @param text - the complete argument JSON text.
			* @returns a sealed view.
			*/
			static fromText(text) {
				const view = new PartialArguments();
				view.append(text);
				view.sealed = true;
				return view;
			}
			/**
			* View an already parsed argument payload, such as a PTC dispatch object.
			* @param value - the parsed argument value.
			* @returns a sealed view; a non-object payload has no fields.
			*/
			static fromObject(value) {
				const view = new PartialArguments();
				view.object = typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
				view.sealed = true;
				return view;
			}
			/**
			* The source: text so far or a parsed object, plus whether it can still grow.
			* These are the only enumerable fields, so two views over the same source
			* compare equal structurally however far each has been read.
			*/
			chunks = [];
			object;
			sealed = false;
			#ends = [];
			#size = 0;
			#consumed = 0;
			#mode = "root";
			#escape = false;
			#keyStart = 0;
			#keyEscaped = false;
			#key = "";
			#current = null;
			#nestedEnds = [];
			#nestedInString = false;
			#invalidAt;
			#invalidValue = false;
			#entries = /* @__PURE__ */ new Map();
			#order = [];
			#reads = /* @__PURE__ */ new Map();
			/** Whether this view rejects further appends; does not scan text or register reads. */
			get isSealed() {
				return this.sealed;
			}
			/** Whether indexing or a content read found invalid JSON; unread value contents are not validated. */
			get invalid() {
				this.scan();
				return this.#mode === "invalid" || this.#invalidValue;
			}
			/**
			* Retain streamed argument text without scanning or comparing observed answers.
			* @param fragment - the text following every fragment appended before.
			*/
			append(fragment) {
				if (this.sealed) throw new Error("PartialArguments: cannot append to a sealed view");
				if (fragment.length === 0) return;
				this.chunks.push(fragment);
				this.#size += fragment.length;
				this.#ends.push(this.#size);
			}
			/**
			* Reconcile a streamed prefix with authoritative complete text without joining the fragments.
			* @param text - the final argument text, which replaces missing or conflicting deltas.
			* @returns this view sealed with its caches retained when every character matches; otherwise a new sealed view.
			*/
			settle(text) {
				if (this.object !== void 0 || text.length !== this.#size) return PartialArguments.fromText(text);
				let offset = 0;
				for (const chunk of this.chunks) {
					if (!text.startsWith(chunk, offset)) return PartialArguments.fromText(text);
					offset += chunk.length;
				}
				this.chunks = text.length === 0 ? [] : [text];
				this.#ends = text.length === 0 ? [] : [text.length];
				this.sealed = true;
				return this;
			}
			/**
			* Compare observed answers and advance their publication baseline. Unread views remain unscanned.
			* @returns whether any observed answer changed since its first read or the preceding refresh.
			*/
			refresh() {
				if (this.#reads.size === 0) return false;
				this.scan();
				let changed = false;
				let completions = false;
				for (const read of this.#reads.values()) {
					if (read.completion) {
						completions = true;
						continue;
					}
					changed = this.refreshRead(read) || changed;
				}
				if (completions) {
					for (const read of this.#reads.values()) if (read.completion) changed = this.refreshRead(read) || changed;
				}
				if (this.sealed) this.#reads.clear();
				return changed;
			}
			refreshRead(read) {
				const now = read.answer();
				if (Object.is(now, read.last)) return false;
				read.last = now;
				return true;
			}
			/**
			* Check whether no further fields can arrive.
			* @returns whether the outer object closed, indexing failed, or the view is sealed; unread values are not validated.
			*/
			closed() {
				return this.remember("closed", "", () => this.closedNow());
			}
			/**
			* List discovered fields in first-appearance order.
			* @returns top-level keys seen so far, in first-appearance order.
			*/
			keys() {
				return this.remember("keys", "", () => this.keysNow(), (keys) => keys.length);
			}
			/**
			* Check whether a top-level field has appeared.
			* @param key - argument name.
			* @returns whether the field has appeared (a string opened or another value began).
			*/
			has(key) {
				return this.remember("has", key, () => this.hasNow(key));
			}
			/**
			* Check whether a field's closing delimiter has arrived, without validating its contents.
			* @param key - argument name.
			* @returns whether its delimiter arrived and no content reader has reported an error for this value.
			*/
			complete(key) {
				return this.remember("complete", key, () => this.completeNow(key));
			}
			/**
			* Read string length without materializing its text.
			* @param key - argument name.
			* @param options - change granularity for a streaming string.
			* @returns decoded UTF-16 length of the string field so far; undefined when absent or not a string.
			*/
			stringLength(key, options) {
				const step = Math.max(1, Math.floor(options?.step ?? 1));
				const offset = options?.offset ?? 0;
				return this.remember(`length:${step}:${offset}`, key, () => this.lengthNow(key), (length) => length === void 0 ? void 0 : Math.ceil((length + offset) / step));
			}
			/**
			* Check a string against a decoded UTF-16 length limit without materializing it.
			* @param key - argument name.
			* @param maxLength - decoded UTF-16 limit, floored to at least zero.
			* @returns whether the string is longer than the limit; false when absent or not a string.
			*/
			stringExceeds(key, maxLength) {
				const limit = Math.max(0, Math.floor(maxLength));
				return this.remember(`exceeds:${limit}`, key, () => (this.lengthNow(key, limit + 1) ?? 0) > limit);
			}
			/**
			* Read a decoded string, including a streaming prefix.
			* @param key - argument name.
			* @returns the string field's decoded text so far; undefined when absent or not a string.
			*/
			text(key) {
				return this.remember("text", key, () => this.textNow(key));
			}
			/**
			* Read at most the first decoded UTF-16 units of a string.
			* @param key - argument name.
			* @param maxLength - maximum decoded UTF-16 length, floored to at least one.
			* @returns the bounded string prefix; undefined when absent or not a string.
			*/
			textPrefix(key, maxLength) {
				const limit = Math.max(1, Math.floor(maxLength));
				return this.remember(`prefix:${limit}`, key, () => this.textPrefixNow(key, limit));
			}
			/**
			* Read a completed non-string argument.
			* @param key - argument name.
			* @returns the parsed non-string value once it closed; undefined while open, absent, or a string.
			*/
			value(key) {
				return this.remember("value", key, () => this.valueNow(key));
			}
			/** Answer a question and, on a streaming view, remember it for change detection. */
			remember(kind, key, read, comparison) {
				this.scan();
				const result = read();
				if (!this.sealed) {
					const id = `${kind}/${key}`;
					if (!this.#reads.has(id)) this.#reads.set(id, {
						completion: kind === "complete",
						answer: comparison === void 0 ? read : () => comparison(read()),
						last: comparison === void 0 ? result : comparison(result)
					});
				}
				return result;
			}
			closedNow() {
				return this.sealed || this.#mode === "closed" || this.#mode === "invalid";
			}
			keysNow() {
				return this.object === void 0 ? this.#order : Object.keys(this.object);
			}
			hasNow(key) {
				return this.object === void 0 ? this.#entries.has(key) : Object.hasOwn(this.object, key);
			}
			completeNow(key) {
				if (this.object !== void 0) return Object.hasOwn(this.object, key);
				const entry = this.#entries.get(key);
				return entry !== void 0 && entry.end >= 0 && (entry.kind === "string" ? entry.invalidAt === void 0 : !entry.invalid);
			}
			lengthNow(key, limit = Number.POSITIVE_INFINITY) {
				if (this.object !== void 0) {
					const field = Object.hasOwn(this.object, key) ? this.object[key] : void 0;
					return typeof field === "string" ? field.length : void 0;
				}
				const entry = this.#entries.get(key);
				if (entry?.kind !== "string") return void 0;
				if (entry.text !== void 0 && entry.text.at === entry.end) return entry.text.length;
				const read = entry.length ??= {
					at: entry.start,
					length: 0,
					text: ""
				};
				this.readString(entry, read, limit, false);
				return read.length;
			}
			textNow(key) {
				if (this.object !== void 0) {
					const field = Object.hasOwn(this.object, key) ? this.object[key] : void 0;
					return typeof field === "string" ? field : void 0;
				}
				const entry = this.#entries.get(key);
				if (entry?.kind !== "string") return void 0;
				if (entry.text === void 0 && entry.end >= 0 && entry.needsDecoding && entry.invalidAt === void 0) {
					let text;
					try {
						text = JSON.parse(`"${this.slice(entry.start, entry.end)}"`);
					} catch (_error) {}
					if (text !== void 0) entry.text = {
						at: entry.end,
						length: text.length,
						text
					};
				}
				const read = entry.text ??= {
					at: entry.start,
					length: 0,
					text: ""
				};
				this.readString(entry, read, Number.POSITIVE_INFINITY, true);
				return read.text;
			}
			textPrefixNow(key, maxLength) {
				if (this.object !== void 0) {
					const field = Object.hasOwn(this.object, key) ? this.object[key] : void 0;
					return typeof field === "string" ? field.slice(0, maxLength) : void 0;
				}
				const entry = this.#entries.get(key);
				if (entry?.kind !== "string") return void 0;
				const prefixes = entry.prefixes ??= /* @__PURE__ */ new Map();
				let read = prefixes.get(maxLength);
				if (read === void 0) {
					read = {
						at: entry.start,
						length: 0,
						text: ""
					};
					prefixes.set(maxLength, read);
				}
				this.readString(entry, read, maxLength, true);
				return read.text;
			}
			valueNow(key) {
				if (this.object !== void 0) {
					if (!Object.hasOwn(this.object, key)) return void 0;
					const field = this.object[key];
					return typeof field === "string" ? void 0 : field;
				}
				const entry = this.#entries.get(key);
				if (entry?.kind !== "value" || entry.end < 0 || entry.invalid) return void 0;
				if (entry.parsed === void 0) try {
					entry.parsed = JSON.parse(this.slice(entry.start, entry.end));
				} catch (_error) {
					entry.invalid = true;
					this.#invalidValue = true;
				}
				return entry.parsed;
			}
			chunkAt(at) {
				let low = 0;
				let high = this.#ends.length;
				while (low < high) {
					const mid = low + high >>> 1;
					if (this.#ends[mid] <= at) low = mid + 1;
					else high = mid;
				}
				return low;
			}
			/** Materialize only a requested range, never the cumulative source. */
			slice(start, end) {
				if (start >= end) return "";
				const first = this.chunkAt(start);
				const last = this.chunkAt(end - 1);
				const base = first === 0 ? 0 : this.#ends[first - 1];
				if (first === last) return this.chunks[first].slice(start - base, end - base);
				const parts = [this.chunks[first].slice(start - base)];
				for (let i = first + 1; i < last; i++) parts.push(this.chunks[i]);
				parts.push(this.chunks[last].slice(0, end - this.#ends[last - 1]));
				return parts.join("");
			}
			readString(entry, read, limit, materialize) {
				const end = Math.min(entry.end < 0 ? this.#consumed : entry.end, entry.invalidAt ?? Number.POSITIVE_INFINITY, this.#invalidAt ?? Number.POSITIVE_INFINITY);
				if (!entry.needsDecoding) {
					const length = Math.min(end - read.at, limit - read.length);
					if (length <= 0) return;
					if (materialize) read.text += this.slice(read.at, read.at + length);
					read.at += length;
					read.length += length;
					return;
				}
				let chunkIndex = this.chunkAt(read.at);
				while (read.at < end && read.length < limit) {
					const base = chunkIndex === 0 ? 0 : this.#ends[chunkIndex - 1];
					const chunk = this.chunks[chunkIndex];
					const remaining = chunk.slice(read.at - base, Math.min(chunk.length, end - base));
					const boundary = remaining.search(CONTENT_ESCAPE);
					const length = Math.min(boundary < 0 ? remaining.length : boundary, limit - read.length);
					if (length > 0) {
						if (materialize) read.text += remaining.slice(0, length);
						read.at += length;
						read.length += length;
						if (read.at === base + chunk.length) chunkIndex++;
						continue;
					}
					const type = remaining.length > 1 ? remaining[1] : read.at + 1 < end ? this.chunks[chunkIndex + 1][0] : void 0;
					let decoded;
					let width = 2;
					if (remaining[0] === "\\" && type === void 0 && entry.end < 0) return;
					if (remaining[0] === "\\" && type === "u") {
						const hex = this.slice(read.at + 2, Math.min(end, read.at + 6));
						let valid = true;
						for (let i = 0; i < hex.length; i++) if (!isHex(hex[i])) valid = false;
						if (valid) {
							if (hex.length < 4 && entry.end < 0) return;
							if (hex.length === 4) decoded = String.fromCharCode(Number.parseInt(hex, 16));
						}
						width = 6;
					} else if (remaining[0] === "\\" && type !== void 0) decoded = SIMPLE_ESCAPES[type];
					if (decoded === void 0) {
						entry.invalidAt = read.at;
						this.#invalidValue = true;
						return;
					}
					if (materialize) read.text += decoded;
					read.length++;
					read.at += width;
					while (chunkIndex < this.chunks.length && read.at >= this.#ends[chunkIndex]) chunkIndex++;
				}
			}
			/** Locate new field ranges without decoding or parsing their contents. */
			scan() {
				if (this.object !== void 0 || this.#consumed === this.#size) return;
				for (let i = this.chunkAt(this.#consumed); i < this.chunks.length && this.#invalidAt === void 0; i++) {
					const pending = this.chunks[i];
					const base = i === 0 ? 0 : this.#ends[i - 1];
					for (let index = this.#consumed - base; index < pending.length && this.#mode !== "invalid"; index++) {
						if (this.#mode === "string" || this.#mode === "nested" && this.#nestedInString) {
							const end = this.stringBoundary(pending, index);
							this.#consumed += end - index;
							index = end;
							if (index === pending.length) break;
						}
						this.step(pending[index], this.#consumed);
						this.#consumed++;
					}
				}
			}
			/** Only raw quotes and their preceding backslash runs can terminate a string. */
			stringBoundary(fragment, start) {
				let at = start;
				while (true) {
					const quote = fragment.indexOf("\"", at);
					const end = quote < 0 ? fragment.length : quote;
					if (this.#mode === "string") {
						const entry = this.#current;
						if (!entry.needsDecoding && CONTENT_ESCAPE.test(fragment.slice(at, end))) entry.needsDecoding = true;
					}
					let slashStart = end;
					while (slashStart > at && fragment[slashStart - 1] === "\\") slashStart--;
					const escaped = (end - slashStart) % 2 === 1 !== (slashStart === at && this.#escape);
					this.#escape = quote < 0 && escaped;
					if (quote < 0 || !escaped) return end;
					at = quote + 1;
				}
			}
			step(c, at) {
				switch (this.#mode) {
					case "root":
						if (isWhitespace(c)) return;
						if (c === "{") {
							this.#mode = "key-or-end";
							return;
						}
						this.fail();
						return;
					case "key-or-end":
						if (isWhitespace(c)) return;
						if (c === "}") {
							this.#mode = "closed";
							return;
						}
						if (c === "\"") {
							this.beginKey(at);
							return;
						}
						this.fail();
						return;
					case "key-only":
						if (isWhitespace(c)) return;
						if (c === "\"") {
							this.beginKey(at);
							return;
						}
						this.fail();
						return;
					case "key":
						this.stepKey(c, at);
						return;
					case "colon":
						if (isWhitespace(c)) return;
						if (c === ":") {
							this.#mode = "value";
							return;
						}
						this.fail();
						return;
					case "value":
						this.beginValue(c, at);
						return;
					case "string": {
						const entry = this.#current;
						entry.end = at;
						this.#current = null;
						this.#mode = "comma-or-end";
						return;
					}
					case "scalar":
						this.stepScalar(c, at);
						return;
					case "nested":
						this.stepNested(c, at);
						return;
					case "comma-or-end":
						if (isWhitespace(c)) return;
						if (c === ",") {
							this.#mode = "key-only";
							return;
						}
						if (c === "}") {
							this.#mode = "closed";
							return;
						}
						this.fail();
						return;
					case "closed":
						if (isWhitespace(c)) return;
						this.fail();
						return;
					/* v8 ignore next 2 -- scan() stops stepping once the view is invalid. */
					case "invalid": return;
					/* v8 ignore next 2 -- Every scanner mode has a handler above. */
					default: assertNever(this.#mode);
				}
			}
			fail() {
				this.#invalidAt = this.#consumed;
				this.#mode = "invalid";
				this.#current = null;
			}
			beginKey(at) {
				this.#mode = "key";
				this.#keyStart = at + 1;
				this.#keyEscaped = false;
				this.#escape = false;
			}
			stepKey(c, at) {
				if (c < " ") {
					this.fail();
					return;
				}
				if (this.#escape) {
					this.#escape = false;
					return;
				}
				if (c === "\\") {
					this.#escape = true;
					this.#keyEscaped = true;
					return;
				}
				if (c !== "\"") return;
				const raw = this.slice(this.#keyStart, at);
				if (this.#keyEscaped) try {
					this.#key = JSON.parse(`"${raw}"`);
				} catch (_error) {
					this.fail();
					return;
				}
				else this.#key = raw;
				this.#mode = "colon";
			}
			open(entry) {
				if (!this.#entries.has(this.#key)) this.#order.push(this.#key);
				this.#entries.set(this.#key, entry);
				this.#current = entry;
			}
			beginValue(c, at) {
				if (isWhitespace(c)) return;
				if (c === "\"") {
					this.open({
						kind: "string",
						start: at + 1,
						end: -1,
						needsDecoding: false,
						invalidAt: void 0,
						length: void 0,
						text: void 0,
						prefixes: void 0
					});
					this.#escape = false;
					this.#mode = "string";
					return;
				}
				if (c === "}" || c === "," || c === ":" || c === "]") {
					this.fail();
					return;
				}
				this.open({
					kind: "value",
					start: at,
					end: -1,
					parsed: void 0,
					invalid: false
				});
				if (c === "{" || c === "[") {
					this.#mode = "nested";
					this.#nestedEnds = [c === "{" ? "}" : "]"];
					this.#nestedInString = false;
					this.#escape = false;
					return;
				}
				this.#mode = "scalar";
			}
			stepScalar(c, at) {
				if (c !== "," && c !== "}" && !isWhitespace(c)) return;
				this.closeValue(at);
				this.#mode = c === "," ? "key-only" : c === "}" ? "closed" : "comma-or-end";
			}
			stepNested(c, at) {
				if (this.#nestedInString) {
					this.#nestedInString = false;
					return;
				}
				if (c === "\"") {
					this.#nestedInString = true;
					return;
				}
				if (c === "{" || c === "[") {
					this.#nestedEnds.push(c === "{" ? "}" : "]");
					return;
				}
				if (c === "}" || c === "]") {
					if (this.#nestedEnds.pop() !== c) {
						this.fail();
						return;
					}
					if (this.#nestedEnds.length === 0) {
						this.closeValue(at + 1);
						this.#mode = "comma-or-end";
					}
				}
			}
			closeValue(end) {
				const entry = this.#current;
				entry.end = end;
				this.#current = null;
			}
		};
		/** Duplicate-install-safe JSON and immutable-value helpers. @module @deepseek-ai/dsh-util-values */
		/**
		* Mark an unreachable closed-union branch.
		* @param value - impossible value; an unhandled typed variant fails at the call site.
		* @param context - optional switch-site label included in the failure message.
		* @returns never; a runtime value that escaped its type always throws.
		*/
		function assertNever(value, context) {
			const rendered = JSON.stringify(value) ?? String(value);
			throw new Error(`unreachable variant${context ? ` in ${context}` : ""}: ${rendered}`);
		}
		//#endregion
		//#region node_modules/.pnpm/@deepseek-ai+dsh-util-works_b11d01d5744ea259086ff4f66c615a61/node_modules/@deepseek-ai/dsh-util-workspace-path/lib/index.js
		/**
		* Browser-safe Workspace path and display helpers.
		* @module @deepseek-ai/dsh-util-workspace-path
		*/
		/** Whether a path uses a Windows drive or UNC prefix. */
		function isWindowsStylePath(value) {
			return /^[A-Za-z]:[/\\]/.test(value) || value.startsWith("\\\\");
		}
		/**
		* Whether a path is absolute in either spelling the Host accepts: POSIX (`/a/b`) or Windows drive or UNC.
		* @param path - the path to classify.
		* @returns `true` for an absolute path; `false` for a Workspace-relative one.
		*/
		function isAbsoluteWorkspacePath(path) {
			return path.startsWith("/") || isWindowsStylePath(path);
		}
		//#endregion
		//#region src/contract/activity-diffs.ts
		function activityDiffsOf(value) {
			const record = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
			const candidates = record(value) && Array.isArray(value.content) ? value.content : [value];
			const diffs = [];
			for (const item of candidates) if (record(item) && item.type === "diff" && typeof item.path === "string" && typeof item.newText === "string") diffs.push({
				path: item.path,
				oldText: typeof item.oldText === "string" ? item.oldText : null,
				newText: item.newText
			});
			if (diffs.length === 0 && record(value) && value.toolKind === "edit" && record(value.rawInput)) {
				const input = value.rawInput;
				const path = typeof input.path === "string" ? input.path : input.file_path;
				if (typeof path === "string" && path.trim() && typeof input.content === "string") diffs.push({
					path,
					oldText: null,
					newText: input.content
				});
			}
			return diffs;
		}
		//#endregion
		//#region src/contract/terminal-outcome.ts
		function record$5(value) {
			return typeof value === "object" && value !== null && !Array.isArray(value);
		}
		/** More than one terminal entry is ambiguous, even if its ids repeat. */
		function singleActivityTerminalId(content) {
			if (!Array.isArray(content)) return void 0;
			const references = content.filter((item) => record$5(item) && item.type === "terminal");
			if (references.length !== 1) return void 0;
			const id = references[0]?.terminalId;
			return typeof id === "string" && id.length > 0 ? id : void 0;
		}
		/** Validate the Host-only field again at the persisted presentation boundary. */
		function activityHostTerminalOutcome(detail, ownerDshSessionId) {
			if (!record$5(detail) || !record$5(detail.hostTerminalOutcome)) return void 0;
			const value = detail.hostTerminalOutcome;
			if (value.source !== "acp-client-terminal" || value.dshSessionId !== ownerDshSessionId || typeof value.acpSessionId !== "string" || value.acpSessionId.length === 0 || value.terminalId !== singleActivityTerminalId(detail.content) || typeof value.terminalId !== "string" || !(value.exitCode === null || Number.isSafeInteger(value.exitCode)) || !(value.signal === null || typeof value.signal === "string" && value.signal.length > 0) || value.exitCode === null && value.signal === null) return void 0;
			return value;
		}
		//#endregion
		//#region src/contract/tool-control-outcome.ts
		function record$4(value) {
			return typeof value === "object" && value !== null && !Array.isArray(value);
		}
		/** Only the Host projection writes this field; provider metadata is not copied into it. */
		function activityHostToolControlOutcome(detail, row) {
			if (!record$4(detail) || !record$4(detail.hostControlOutcome) || row.status !== "failed") return void 0;
			const value = detail.hostControlOutcome;
			if (value.source !== "dsh-tool-bridge" || value.kind !== "deferred-team-message" || value.dshSessionId !== row.ownerDshSessionId || value.tool !== "wait_agent" || detail.toolName !== "wait_agent" || value.executed !== false || typeof value.toolCallId !== "string" || value.toolCallId.length === 0 || row.activityId !== `${row.promptAnchorMessageId}:tool:${value.toolCallId}`) return void 0;
			return value;
		}
		//#endregion
		//#region src/client/ui/json-tree.ts
		/** Shared copy for all ACP JSON inspectors. */
		function acpJsonTreeLabels(t) {
			return {
				copyValue: t("auditCopyValue"),
				copyJson: t("auditCopyJson"),
				copyPath: t("auditCopyPath"),
				copyPrettyJson: t("auditCopyPrettyJson"),
				copyCompactJson: t("auditCopyCompactJson"),
				copied: t("auditCopied"),
				copyFailed: t("auditCopyFailed"),
				collapseNode: t("auditCollapseNode"),
				expandNode: t("auditExpandNode"),
				copyButtonTitle: (action) => t("auditCopyOptions", { action })
			};
		}
		/** Share the native expanded-string preference for one client registration. */
		function createAcpJsonStringWrapping() {
			const store = (0, _deepseek_ai_dsh_client_store.createSnapshotStore)(true);
			return {
				getDefault: store.getSnapshot,
				setDefault: (value) => {
					store.set(value);
				}
			};
		}
		//#endregion
		//#region src/client/data/acp-replay-payload.ts
		function record$3(value) {
			return typeof value === "object" && value !== null && !Array.isArray(value);
		}
		/** Extract an ACP marker from a DSH assistant/message event. */
		function acpReplayPayloadOf(event) {
			if (event.type !== "assistant/message" || !record$3(event.data)) return void 0;
			const message = record$3(event.data.message) ? event.data.message : event.data;
			const source = record$3(message.source) ? message.source : void 0;
			const replayState = record$3(source?.replayState) ? source.replayState : record$3(message.replayState) ? message.replayState : record$3(event.data.replayState) ? event.data.replayState : void 0;
			const response = record$3(replayState?.response) ? replayState.response : replayState;
			if (!record$3(response) || response.kind !== "dsh-acp" || response.version !== 1) return void 0;
			if (typeof response.ownerDshSessionId !== "string" || typeof response.profileId !== "string" || typeof response.profileGeneration !== "number" || typeof response.agentSessionId !== "string" || typeof response.bindingEpoch !== "number" || typeof response.launchFingerprint !== "string" || typeof response.committedPromptOrdinal !== "number" || typeof response.committedActivitySeq !== "number") return void 0;
			return response;
		}
		//#endregion
		//#region src/client/ui/activity-definitions.ts
		function record$2(value) {
			return typeof value === "object" && value !== null && !Array.isArray(value);
		}
		function userInputMessage(event) {
			if (event.type !== "user/message" || !record$2(event.data)) return void 0;
			const source = record$2(event.data.source) ? event.data.source : void 0;
			return typeof source?.kind === "string" && typeof event.data.id === "string" ? {
				messageId: event.data.id,
				sourceKind: source.kind
			} : void 0;
		}
		function sameStep(left, right) {
			return left.kind === "step" && right.kind === "step" && left.turn.turn === right.turn.turn && left.step.step === right.step.step;
		}
		function promptAnchorForInput(input, location, previous) {
			const prior = previous !== void 0 && sameStep(previous.location, location) ? previous : void 0;
			const lastDirectUserMessageId = input.sourceKind === "user" ? input.messageId : prior?.lastDirectUserMessageId;
			return {
				anchorMessageId: lastDirectUserMessageId ?? input.messageId,
				...lastDirectUserMessageId === void 0 ? {} : { lastDirectUserMessageId },
				location
			};
		}
		function requestProvider(event) {
			if (event.type !== "request/header" || !record$2(event.data)) return void 0;
			const header = record$2(event.data.header) ? event.data.header : void 0;
			const config = record$2(header?.config) ? header.config : void 0;
			return typeof config?.provider === "string" ? config.provider : void 0;
		}
		function promptProvider(value) {
			if (!record$2(value)) return void 0;
			const prompt = record$2(value.prompt) ? value.prompt : void 0;
			const config = record$2(prompt?.config) ? prompt.config : void 0;
			return typeof config?.provider === "string" ? config.provider : void 0;
		}
		function effectiveRouteForStep(state, location) {
			if (state === void 0 || location.kind !== "step") return void 0;
			const targetTurn = location.turn.turn;
			const targetStep = location.step.step;
			let provider = state.baselineProvider;
			for (const change of state.changes) {
				if (change.turn === void 0 || change.step === void 0) {
					const stepStartSeq = location.step.start?.seq;
					if (stepStartSeq !== void 0 && change.seq < stepStartSeq) provider = change.provider;
					continue;
				}
				if (change.turn < targetTurn || change.turn === targetTurn && change.step <= targetStep) provider = change.provider;
			}
			return provider;
		}
		function createAcpEffectiveRouteDefinition() {
			const updateRoute = (state, match) => {
				const provider = requestProvider(match.event);
				if (match.event.type !== "request/header") return state;
				if (provider === state.currentProvider) return state;
				const { turn, step } = match.location.kind === "step" ? {
					turn: match.location.turn.turn,
					step: match.location.step.step
				} : {};
				let earlierStepRoute = state.baselineProvider;
				if (turn !== void 0 && step !== void 0) {
					const stepStartSeq = match.location.kind === "step" ? match.location.step.start?.seq : void 0;
					for (const change of state.changes) if (change.turn === void 0 || change.step === void 0) {
						if (stepStartSeq !== void 0 && change.seq < stepStartSeq) earlierStepRoute = change.provider;
					} else if (change.turn < turn || change.turn === turn && change.step < step) earlierStepRoute = change.provider;
				}
				const sameStep = turn === void 0 || step === void 0 ? -1 : state.changes.findIndex((change) => change.turn === turn && change.step === step);
				const inherited = turn === void 0 || step === void 0 ? state.currentProvider : earlierStepRoute;
				const changes = [...state.changes];
				if (sameStep >= 0) changes.splice(sameStep, 1);
				if (provider !== inherited) changes.push({
					seq: match.event.seq,
					...turn === void 0 ? {} : { turn },
					...step === void 0 ? {} : { step },
					provider
				});
				return {
					...state,
					currentProvider: provider,
					changes
				};
			};
			return {
				kind: "acp-effective-route",
				match: (event) => event.type === "turn/start" || event.type === "request/header" ? {
					id: "effective",
					role: "start"
				} : null,
				start: (_context, match, reader) => {
					const initialProvider = promptProvider(reader.previous("request-prompt")?.state);
					return updateRoute({
						baselineProvider: initialProvider,
						currentProvider: initialProvider,
						changes: []
					}, match);
				},
				update: (context, match) => updateRoute(context.state, match)
			};
		}
		function interruptedAssistantProvider(event) {
			if (event.type !== "assistant/message" || !record$2(event.data) || event.data.interrupted !== true) return void 0;
			const message = record$2(event.data.message) ? event.data.message : void 0;
			const source = record$2(message?.source) ? message.source : void 0;
			return source?.kind === "model" && typeof source.provider === "string" ? source.provider : void 0;
		}
		function activityNodeData(state) {
			return {
				...state.settled === true ? { settled: true } : {},
				ownerDshSessionId: state.ownerDshSessionId,
				promptAnchorMessageId: state.promptAnchorMessageId,
				profileId: state.profileId,
				agentSessionId: state.agentSessionId,
				committedActivitySeq: state.committedActivitySeq
			};
		}
		/** State-only admitted-input anchor consumed by subsequent ACP requests. */
		const acpPromptAnchorDefinition = {
			kind: "acp-prompt-anchor",
			match: (event) => {
				const input = userInputMessage(event);
				return input === void 0 ? null : {
					id: `input:${input.messageId}`,
					role: "start"
				};
			},
			start: (_context, match, reader) => {
				const input = userInputMessage(match.event);
				if (input === void 0) throw new Error("acp-prompt-anchor requires a user message");
				return {
					...promptAnchorForInput(input, match.location, reader.previous("acp-prompt-anchor")?.state),
					seq: match.event.seq
				};
			},
			update: (context) => context.state
		};
		/** An ACP request plus its durable replay marker produces a read-only activity view. */
		function createAcpActivityDefinition(ownsRoute) {
			return {
				kind: "acp-activity",
				target: "chat",
				match: (event) => {
					const payload = acpReplayPayloadOf(event);
					if (payload !== void 0) return {
						id: `answer:${JSON.stringify([
							payload.ownerDshSessionId,
							payload.profileId,
							payload.profileGeneration,
							payload.bindingEpoch,
							payload.agentSessionId,
							payload.committedPromptOrdinal
						])}`,
						role: "start"
					};
					const interruptedProvider = interruptedAssistantProvider(event);
					if (interruptedProvider !== void 0 && ownsRoute(interruptedProvider)) return {
						id: `interrupted:${event.seq}`,
						role: "start"
					};
					const provider = requestProvider(event);
					return provider !== void 0 && ownsRoute(provider) ? {
						id: `request:${event.seq}`,
						role: "start"
					} : null;
				},
				start: (_context, match, reader) => {
					const payload = acpReplayPayloadOf(match.event);
					if (payload !== void 0) return {
						settled: true,
						ownerDshSessionId: payload.ownerDshSessionId,
						promptAnchorMessageId: payload.activityAnchorMessageId ?? `prompt:${payload.committedPromptOrdinal}`,
						profileId: payload.profileId,
						agentSessionId: payload.agentSessionId,
						committedActivitySeq: payload.committedActivitySeq,
						seq: match.event.seq,
						location: match.location
					};
					const interruptedProvider = interruptedAssistantProvider(match.event);
					const provider = requestProvider(match.event) ?? interruptedProvider;
					if (provider === void 0) throw new Error("acp-activity requires a matched ACP request or interrupted answer");
					const candidateAnchor = reader.previous("acp-prompt-anchor")?.state;
					const anchor = candidateAnchor !== void 0 && sameStep(candidateAnchor.location, match.location) ? candidateAnchor.anchorMessageId : void 0;
					if (interruptedProvider !== void 0) {
						const previous = reader.previous("acp-activity")?.state;
						if (previous !== void 0 && previous.settled !== true && previous.profileId === interruptedProvider && sameStep(previous.location, match.location) && (anchor === void 0 || previous.promptAnchorMessageId === anchor)) return {
							...previous,
							settled: true,
							seq: match.event.seq,
							location: match.location
						};
					}
					return {
						...interruptedProvider === void 0 ? {} : { settled: true },
						ownerDshSessionId: "",
						promptAnchorMessageId: anchor ?? `request:${match.event.seq}`,
						profileId: provider,
						agentSessionId: "",
						committedActivitySeq: 0,
						seq: match.event.seq,
						location: match.location
					};
				},
				update: (context) => context.state,
				buildLocationData: (context, scope) => {
					const state = context.state;
					if (scope !== "step" || state?.settled !== true || state.location.kind !== "step") return null;
					return {
						kind: "step",
						turn: state.location.turn.turn,
						step: state.location.step.step,
						key: "acp-activity",
						value: activityNodeData(state)
					};
				},
				buildViewNode: (context) => {
					if (context.state === void 0) return null;
					return {
						key: context.key,
						kind: "acp-activity",
						id: context.id,
						target: "chat",
						anchorSeq: context.state.seq,
						location: context.state.location,
						visibility: "visible",
						groupTree: "process",
						data: activityNodeData(context.state)
					};
				}
			};
		}
		/** Own an admitted user/message input's effective ACP route as a read-only live marker. */
		function createAcpLiveActivityDefinition(ownsRoute) {
			return {
				kind: "acp-activity-live",
				target: "chat",
				match: (event) => {
					const input = userInputMessage(event);
					return input === void 0 ? null : {
						id: `input:${input.messageId}`,
						role: "start"
					};
				},
				start: (_context, match, reader) => {
					const input = userInputMessage(match.event);
					if (input === void 0) throw new Error("acp-activity-live requires a user message");
					const anchor = promptAnchorForInput(input, match.location, reader.previous("acp-prompt-anchor")?.state);
					const route = reader.previous("acp-effective-route")?.state;
					const provider = effectiveRouteForStep(route, match.location);
					return {
						ownerDshSessionId: "",
						promptAnchorMessageId: anchor.anchorMessageId,
						profileId: provider !== void 0 && ownsRoute(provider) ? provider : "",
						agentSessionId: "",
						committedActivitySeq: 0,
						seq: match.event.seq,
						location: match.location
					};
				},
				update: (context) => context.state,
				buildViewNode: (context) => {
					const state = context.state;
					if (state === void 0) return null;
					return {
						key: context.key,
						kind: "acp-activity",
						id: context.id,
						target: "chat",
						anchorSeq: state.seq + .1,
						location: state.location,
						visibility: state.profileId === "" ? "hidden" : "visible",
						groupTree: "process",
						data: activityNodeData(state)
					};
				}
			};
		}
		//#endregion
		//#region \0dsh-css:C:\Users\liaoz\Documents\interests\development\dsh-plugins\dsh-acp-adapter\src\client\ui\AcpActivityNode.module.css.mjs
		const css$9 = ".zWWl-W_flow{flex-direction:column;gap:16px;min-width:0;display:flex}.zWWl-W_row{min-width:0}.zWWl-W_nativeToolOwner{display:contents}.zWWl-W_nativeToolOwner.zWWl-W_hasSupplement{min-width:0;display:block}.zWWl-W_rowSummary{min-width:0}.zWWl-W_presentation{text-overflow:ellipsis;white-space:nowrap;flex:0 auto;min-width:0;overflow:hidden}.zWWl-W_status{min-width:0;color:var(--dsw-alias-label-tertiary);font-size:var(--dsh-content-font-size-secondary,13px);line-height:calc(24px + var(--dsh-content-font-delta,0px));flex:none;align-items:center;margin-left:8px;display:inline-flex}.zWWl-W_separator{corner-shape:round;background:var(--dsw-alias-label-caption);border-radius:50%;flex:none;width:2px;height:2px;margin-right:8px}.zWWl-W_body{gap:8px;min-width:0;margin:4px 0 6px 22px;display:grid}.zWWl-W_planList{gap:8px;margin:4px 0 6px 22px;padding:0;list-style:none;display:grid}.zWWl-W_planItem{min-width:0;color:var(--dsw-alias-label-secondary);font-size:var(--dsh-content-font-size-secondary,13px);line-height:calc(20px + var(--dsh-content-font-delta-secondary,0px));grid-template-columns:16px minmax(0,1fr);align-items:start;column-gap:10px;display:grid}.zWWl-W_planGlyph{width:16px;height:calc(20px + var(--dsh-content-font-delta-secondary,0px));place-items:center;display:grid}.zWWl-W_planContent{white-space:pre-wrap;overflow-wrap:anywhere;min-width:0}.zWWl-W_planStatus{color:var(--dsw-alias-label-caption);white-space:nowrap;margin-inline-start:8px;font-size:12px;display:inline-block}.zWWl-W_json{min-width:0;max-height:320px;overflow:auto}.zWWl-W_raw{white-space:pre-wrap;overflow-wrap:anywhere;min-width:0;max-height:320px;margin:0;overflow:auto}.zWWl-W_toolSupplement{font:var(--dsw-font-xs-13);color:var(--dsw-alias-label-tertiary);margin:4px 0 4px 4px}.zWWl-W_nativeBlock{min-width:0}.zWWl-W_externalRecord{gap:10px;min-width:0;padding:8px 0 2px;display:grid}.zWWl-W_externalSection{gap:3px;min-width:0;display:grid}.zWWl-W_externalLabel{color:var(--dsw-alias-label-tertiary);font-size:12px;font-weight:500}.zWWl-W_externalText{white-space:pre-wrap;overflow-wrap:anywhere;min-width:0;color:var(--dsw-alias-label-primary);margin:0}.zWWl-W_externalNote{color:var(--dsw-alias-label-tertiary);margin:0;font-size:12px}.zWWl-W_openRecord{justify-self:start}.zWWl-W_unavailable{min-height:24px;color:var(--dsw-alias-state-error-primary);font-size:var(--dsh-content-font-size-secondary,13px);align-items:center;gap:6px;display:flex}";
		const tagId$9 = "@zaimokuza/dsh-acp-adapter/AcpActivityNode.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$9) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@zaimokuza/dsh-acp-adapter";
			tag.dataset.pluginCss = tagId$9;
			tag.textContent = css$9;
			document.head.appendChild(tag);
		}
		var AcpActivityNode_module_css_default = {
			"body": "zWWl-W_body",
			"externalLabel": "zWWl-W_externalLabel",
			"externalNote": "zWWl-W_externalNote",
			"externalRecord": "zWWl-W_externalRecord",
			"externalSection": "zWWl-W_externalSection",
			"externalText": "zWWl-W_externalText",
			"flow": "zWWl-W_flow",
			"hasSupplement": "zWWl-W_hasSupplement",
			"json": "zWWl-W_json",
			"nativeBlock": "zWWl-W_nativeBlock",
			"nativeToolOwner": "zWWl-W_nativeToolOwner",
			"openRecord": "zWWl-W_openRecord",
			"planContent": "zWWl-W_planContent",
			"planGlyph": "zWWl-W_planGlyph",
			"planItem": "zWWl-W_planItem",
			"planList": "zWWl-W_planList",
			"planStatus": "zWWl-W_planStatus",
			"presentation": "zWWl-W_presentation",
			"raw": "zWWl-W_raw",
			"row": "zWWl-W_row",
			"rowSummary": "zWWl-W_rowSummary",
			"separator": "zWWl-W_separator",
			"status": "zWWl-W_status",
			"toolSupplement": "zWWl-W_toolSupplement",
			"unavailable": "zWWl-W_unavailable"
		};
		//#endregion
		//#region src/client/ui/native-tool-renderer.ts
		/** Copy for one ACP card whose result omitted output. Kept outside tool data
		* so native copy controls and persisted results retain their exact payload. */
		const NativeTerminalOutputNotice = (0, react.createContext)(void 0);
		function nativeOwner(props) {
			const { useDisclosure, useGroupAction, groupPart, cwd, openFile, inspectCall, forkAt, loadImage, turnProcess, node } = props;
			return {
				useDisclosure,
				useGroupAction,
				...groupPart === void 0 ? {} : { groupPart },
				cwd,
				openFile,
				inspectCall,
				forkAt,
				loadImage,
				turnProcess,
				node
			};
		}
		let generation = 0;
		/** Preserve pinned DSH's semantic DOM anchors while private slots keep their
		* registry identities. DSH currently derives data-slot from the dispatch key;
		* its public render options expose no separate DOM name. This adapter depends
		* on that renderer detail and never changes dispatch, declarations or owners.
		* @param document - document receiving this native composition.
		* @param aliases - private dispatch keys owned by one mount and their native names.
		* @returns layout flushing and lifetime cleanup for this mount's observer.
		*/
		function observeNativeSlotAnchors(document, aliases) {
			let disposed = false;
			let initialized = false;
			const correctElement = (element) => {
				const name = aliases.get(element.getAttribute("data-slot") ?? "");
				if (name !== void 0) element.setAttribute("data-slot", name);
			};
			const correctSubtree = (node) => {
				if (node.nodeType !== 1) return;
				const element = node;
				correctElement(element);
				for (const child of element.querySelectorAll("[data-slot]")) correctElement(child);
			};
			const correct = (records) => {
				if (disposed) return;
				for (const record of records) if (record.type === "attributes") correctElement(record.target);
				else for (const node of record.addedNodes) correctSubtree(node);
			};
			const observer = new MutationObserver(correct);
			observer.observe(document.documentElement, {
				childList: true,
				subtree: true,
				attributes: true,
				attributeFilter: ["data-slot"]
			});
			return {
				flush() {
					if (disposed) return;
					if (!initialized) {
						initialized = true;
						correctSubtree(document.documentElement);
					}
					correct(observer.takeRecords());
				},
				dispose() {
					disposed = true;
					observer.disconnect();
				}
			};
		}
		/** Compose a registered native component with its complete injection and child tree. */
		function mountNativeEntry(ctx, entry, destination, options = {}) {
			const register = ctx.slots.register.bind(ctx.slots);
			const factory = ctx.slots.registerFactory.bind(ctx.slots);
			const sourceEntries = (name) => ctx.slots.entriesOfSlot(name);
			const semanticAliases = /* @__PURE__ */ new Map();
			const anchors = typeof document === "undefined" ? void 0 : observeNativeSlotAnchors(document, semanticAliases);
			const mount = (entry, destination, root) => {
				const aliases = new Map(Object.keys(entry.children ?? {}).map((key) => [key, `acp.native.${++generation}.${key}`]));
				for (const [name, alias] of aliases) semanticAliases.set(alias, name);
				const Native = entry.component;
				const Component = (props) => {
					(0, react.useLayoutEffect)(() => anchors?.flush());
					const outputNotice = (0, react.useContext)(NativeTerminalOutputNotice);
					const sourceTranslate = props.t;
					const translate = (0, react.useMemo)(() => outputNotice !== void 0 && entry.locale === "conversation" && typeof sourceTranslate === "function" ? (key, ...args) => key === "terminal.noOutput" ? outputNotice : sourceTranslate(key, ...args) : sourceTranslate, [outputNotice, sourceTranslate]);
					const renderSlot = (0, react.useMemo)(() => props.renderSlot === void 0 ? void 0 : (key, owner, options) => props.renderSlot(aliases.get(key) ?? key, owner, options), [props.renderSlot]);
					const renderSlotChain = (0, react.useMemo)(() => props.renderSlotChain === void 0 ? void 0 : (key, owner, options) => props.renderSlotChain(aliases.get(key) ?? key, owner, options), [props.renderSlotChain]);
					return (root && options.wrap !== void 0 ? options.wrap : (component, value) => (0, react.createElement)(component, value))(Native, {
						...props,
						...translate === sourceTranslate ? {} : { t: translate },
						...renderSlot === void 0 ? {} : { renderSlot },
						...renderSlotChain === void 0 ? {} : { renderSlotChain }
					});
				};
				const registration = {
					name: destination,
					...root && options.factory ? { scope: "session" } : {
						...entry.options,
						...entry.select === void 0 ? {} : { select: entry.select }
					},
					...entry.inject === void 0 ? {} : { inject: entry.inject },
					...entry.store === void 0 ? {} : { store: entry.store },
					...entry.locale === void 0 ? {} : { locale: entry.locale },
					...entry.children === void 0 ? {} : { children: Object.fromEntries(Object.entries(entry.children).map(([key, spec]) => [aliases.get(key), spec])) }
				};
				const dispose = (root && options.factory ? factory : register)({
					...registration,
					...root ? options.registration : {}
				}, Component);
				const children = [...aliases].map(([source, target]) => {
					const mounted = /* @__PURE__ */ new Map();
					const sync = () => {
						const entries = sourceEntries(source);
						for (const [old, release] of mounted) if (!entries.includes(old)) {
							release();
							mounted.delete(old);
						}
						for (const next of entries) if (!mounted.has(next)) mounted.set(next, mount(next, target, false));
					};
					const unsubscribe = ctx.slots.subscribe(source, sync);
					sync();
					return () => {
						unsubscribe();
						for (const release of mounted.values()) release();
					};
				});
				return () => {
					anchors?.flush();
					children.forEach((release) => release());
					dispose();
					for (const alias of aliases.values()) semanticAliases.delete(alias);
				};
			};
			let release;
			try {
				release = mount(entry, destination, true);
			} catch (error) {
				anchors?.dispose();
				throw error;
			}
			return () => {
				anchors?.dispose();
				semanticAliases.clear();
				release();
			};
		}
		/** Reuse the registered native Tool tree including its injected hooks, stores,
		* locale and third-party child renderers. Factories cannot redeclare an existing
		* slot, so give this presentation-only occurrence its own declaration names.
		* No component, classifier, CSS, execution event or approval is copied.
		*/
		function installNativeToolRenderer(ctx) {
			ctx.slots.inject("conversation.chat.node", () => {
				let current;
				let release;
				const sync = () => {
					const next = ctx.slots.entries("conversation.chat.node").find((entry) => entry.options.key === "tool-call" && entry.registrant !== "acp-chat-normalization");
					if (next === current) return;
					release?.();
					release = void 0;
					current = next;
					if (next !== void 0) release = mountNativeEntry(ctx, next, "acp.native-tool", { factory: true });
				};
				const unsubscribe = ctx.slots.subscribe("conversation.chat.node", sync);
				sync();
				return () => {
					unsubscribe();
					release?.();
				};
			});
		}
		//#endregion
		//#region src/contract/redaction.ts
		/** Shared, dependency-free redaction for process diagnostics and ACP activity detail. */
		const JWT = /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{4,}/g;
		const GITHUB = /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{16,}|github_pat_[A-Za-z0-9_]{16,}/g;
		const OPENAI = /\bsk-[A-Za-z0-9_-]{16,}/g;
		const BEARER = /\bBearer[ \t]+[A-Za-z0-9._~+/=-]{8,}/gi;
		const BASIC = /\bBasic[ \t]+[A-Za-z0-9+/=]{4,}/gi;
		const AWS_ACCESS_KEY_ID = /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g;
		const SLACK = /\bxox[bparsce]-[A-Za-z0-9-]{16,}\b/g;
		const GOOGLE_API_KEY = /\bAIza[0-9A-Za-z_-]{35}\b/g;
		const GOOGLE_CLIENT_SECRET = /\bGOCSPX-[A-Za-z0-9_-]{20,}\b/g;
		const PEM_PRIVATE_KEY = /-----BEGIN ((?:RSA |EC |DSA |OPENSSH |ENCRYPTED )?PRIVATE KEY)-----[\s\S]*?-----END \1-----/g;
		const ASSIGNMENT = /\b([A-Za-z][A-Za-z0-9_-]*)\b(["']?\s*[=:]\s*["']?)([^\s"',}\{\[]+)/gi;
		const NUMERIC_USAGE_FIELDS = /* @__PURE__ */ new Set([
			"inputtokens",
			"outputtokens",
			"totaltokens",
			"cachereadtokens",
			"cachewritetokens"
		]);
		const SENSITIVE_FIELD = /(?:token|secret|password|passwd|authorization|api[_-]?key|cookie|credential|private[_-]?key)/i;
		function redactSecretText(value) {
			return value.replace(JWT, "<redacted-jwt>").replace(GITHUB, "<redacted-token>").replace(OPENAI, "<redacted-token>").replace(AWS_ACCESS_KEY_ID, "<redacted-aws-key>").replace(SLACK, "<redacted-slack-token>").replace(GOOGLE_API_KEY, "<redacted-google-key>").replace(GOOGLE_CLIENT_SECRET, "<redacted-google-secret>").replace(PEM_PRIVATE_KEY, "<redacted-private-key>").replace(BEARER, "Bearer <redacted>").replace(BASIC, "Basic <redacted>").replace(ASSIGNMENT, (match, key, separator, secret) => {
				if (NUMERIC_USAGE_FIELDS.has(key.toLowerCase()) && /^\d+$/.test(secret)) return match;
				return SENSITIVE_FIELD.test(key) ? `${key}${separator}<redacted>` : match;
			});
		}
		//#endregion
		//#region src/client/ui/activity-tool-output.ts
		/** ACP display content rendered as plain text in the native tool output surface. */
		function record$1(value) {
			return value !== null && typeof value === "object" && !Array.isArray(value);
		}
		function metadata(value) {
			if (typeof value !== "string") return void 0;
			const text = redactSecretText(value).replace(/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g, " ").replace(/\s+/g, " ").trim();
			return text === "" ? void 0 : text.length > 240 ? `${text.slice(0, 240)}…` : text;
		}
		/** Keep only inert, bounded location metadata; never expose payload URIs or credentials. */
		function resourceUri(value) {
			if (typeof value !== "string" || value.length > 2048 || /[\u0000-\u0020\u007f]/.test(value)) return void 0;
			try {
				const uri = new URL(value);
				if (![
					"https:",
					"http:",
					"file:"
				].includes(uri.protocol)) return void 0;
				uri.username = "";
				uri.password = "";
				uri.search = "";
				uri.hash = "";
				return metadata(uri.toString());
			} catch {
				return;
			}
		}
		function resourceMetadata(value) {
			return [
				metadata(value.title) ?? metadata(value.name),
				metadata(value.mimeType),
				resourceUri(value.uri)
			].filter((item) => item !== void 0).join(" · ");
		}
		function boundedText(value, t) {
			const clean = redactSecretText(value);
			return clean.length > 4096 ? `${clean.slice(0, 4096)}\n${t("activity.output.truncated")}` : clean;
		}
		function contentItems(value, t) {
			if (Array.isArray(value)) return value.flatMap((item) => contentItems(item, t));
			if (!record$1(value)) return [];
			if (value.type === "content") return contentItems(value.content, t);
			if (value.type === "text" && typeof value.text === "string") return [{
				kind: "text",
				text: value.text
			}];
			if (value.type === "image" || value.type === "audio") return [{
				kind: value.type,
				text: t(value.type === "image" ? "activity.output.image" : "activity.output.audio", { metadata: resourceMetadata(value) })
			}];
			if (value.type === "resource_link") return [{
				kind: "resource",
				text: t("activity.output.resource", { metadata: resourceMetadata(value) })
			}];
			if (value.type === "resource" && record$1(value.resource)) {
				const resource = value.resource;
				const description = resourceMetadata(resource);
				return [{
					kind: "resource",
					text: typeof resource.text === "string" ? `${t("activity.output.embeddedText", { metadata: description })}\n${boundedText(resource.text, t)}` : t("activity.output.binaryResource", { metadata: description })
				}];
			}
			if (value.type === "diff") return [{
				kind: "diff",
				text: t("activity.output.diff", { path: metadata(value.path) ?? "" })
			}];
			if (value.type === "terminal") return [{
				kind: "terminal",
				text: t("activity.output.terminal", { id: metadata(value.terminalId) ?? "" })
			}];
			if (typeof value.type === "string") return [{
				kind: "unknown",
				text: t("activity.output.unknown", { type: metadata(value.type) ?? "" })
			}];
			return [];
		}
		function mcpContent(value) {
			if (!record$1(value)) return false;
			switch (value.type) {
				case "text": return typeof value.text === "string";
				case "image":
				case "audio": return typeof value.mimeType === "string" && typeof value.data === "string";
				case "resource_link": return typeof value.name === "string" && typeof value.uri === "string";
				case "resource": return record$1(value.resource) && typeof value.resource.uri === "string" && (typeof value.resource.text === "string" || typeof value.resource.blob === "string");
				default: return false;
			}
		}
		/** Codex wraps MCP content in a transport result. Unwrap only its known shape:
		* unknown result fields and meaningful metadata/errors retain their raw view.
		* This is display decoding, never evidence of execution or a successful status.
		*/
		function mcpEnvelopeContent(value) {
			if (!record$1(value) || value.error !== null || Object.keys(value).some((key) => key !== "result" && key !== "error") || !record$1(value.result)) return void 0;
			const result = value.result;
			if (Object.keys(result).some((key) => ![
				"content",
				"structuredContent",
				"_meta",
				"isError"
			].includes(key)) || result.structuredContent != null || result._meta != null || result.isError !== void 0 && typeof result.isError !== "boolean" || !Array.isArray(result.content) || !result.content.every(mcpContent)) return void 0;
			return result.content;
		}
		function rawItems(value, t) {
			const envelope = mcpEnvelopeContent(value);
			if (envelope !== void 0) return contentItems(envelope, t);
			const items = contentItems(record$1(value) && Array.isArray(value.content) ? value.content : value, t);
			if (items.length > 0) return items;
			if (value === void 0 || value === null) return [];
			if (typeof value === "string") return value === "" ? [] : [{
				kind: "text",
				text: value
			}];
			if (Array.isArray(value) && value.length === 0 || record$1(value) && Object.keys(value).length === 0) return [];
			try {
				const text = JSON.stringify(value);
				return text === void 0 ? [] : [{
					kind: "text",
					text
				}];
			} catch {
				return [{
					kind: "unknown",
					text: t("activity.output.unknown", { type: "" })
				}];
			}
		}
		function joinActivityToolOutput(items) {
			let text = "";
			for (const item of items) {
				if (item.text === "") continue;
				if (text !== "" && !text.endsWith("\n") && !item.text.startsWith("\n")) text += "\n";
				text += item.text;
			}
			return text;
		}
		/** ACP text content is the user-facing representation. Raw output is its fallback,
		* not a second copy; resource-only content still retains the raw textual result.
		* MCP raw results may themselves carry a content array or a known Codex envelope.
		* A dedicated native card must additionally render the returned resource atoms
		* inside the same tool row, because its body bypasses generic output text.
		*/
		function activityToolOutput(rawOutput, content, t, terminal) {
			const display = contentItems(content, t).filter((item) => terminal?.exitCode === void 0 || terminal.exitCode === null || item.kind !== "text" || item.text.trim() !== `Exited with code ${terminal.exitCode}`);
			const hasDisplay = display.some((item) => item.text.trim() !== "");
			const hasText = display.some((item) => item.kind === "text" && item.text.trim() !== "");
			const raw = !hasDisplay || !hasText ? rawItems(rawOutput, t) : [];
			let items = !hasDisplay ? raw : hasText ? display : [...raw.filter((item) => item.kind === "text"), ...display];
			const stdout = terminal?.output;
			const textItems = items.filter((item) => item.kind === "text");
			if (stdout !== void 0 && stdout !== "" && !textItems.some((item) => item.text === stdout) && joinActivityToolOutput(textItems) !== stdout) items = [{
				kind: "text",
				text: stdout
			}, ...items];
			return {
				items,
				text: joinActivityToolOutput(items),
				hasUnrepresentedSupplement: items.some((item) => item.kind !== "text" && item.kind !== "diff")
			};
		}
		//#endregion
		//#region src/client/ui/AcpActivityNode.ts
		/**
		* Activity is owned by the DSH session that committed the ACP replay payload.
		* A DSH fork may display that payload from a child session, so the current
		* conversation session is not necessarily the journal source. The Host Remote
		* still applies its managed-session access check to this owner id.
		*/
		function activityJournalSessionId(data, currentSessionId) {
			return data.ownerDshSessionId === "" ? currentSessionId ?? "" : data.ownerDshSessionId;
		}
		function record(value) {
			return typeof value === "object" && value !== null && !Array.isArray(value);
		}
		function statusLabel(status, t) {
			return t({
				running: "activity.status.running",
				completed: "activity.status.completed",
				failed: "activity.status.failed",
				cancelled: "activity.status.cancelled",
				unfinished: "activity.status.unfinished"
			}[status]);
		}
		function detailValue(row) {
			if (row.rawDetail === void 0) return row.rawDetailRef;
			try {
				return JSON.parse(row.rawDetail);
			} catch {
				return row.rawDetail;
			}
		}
		function hasMeaningfulDetail(value) {
			if (value === void 0 || value === null) return false;
			if (typeof value === "string") return value.trim() !== "";
			if (Array.isArray(value)) return value.some(hasMeaningfulDetail);
			if (record(value)) return Object.values(value).some(hasMeaningfulDetail);
			return true;
		}
		function textContent(value) {
			if (Array.isArray(value)) return value.flatMap(textContent);
			if (!record(value)) return [];
			if (value.type === "text" && typeof value.text === "string") return [value.text];
			if (value.type === "content") return textContent(value.content);
			return [];
		}
		function joinTextContent(parts) {
			let result = "";
			for (const part of parts) {
				if (result !== "" && !result.endsWith("\n") && !part.startsWith("\n")) result += "\n";
				result += part;
			}
			return result === "" ? void 0 : result;
		}
		function integer(value) {
			return typeof value === "number" && Number.isSafeInteger(value) ? value : void 0;
		}
		/** The official Claude producer emits a display fence alongside raw output.
		* Only unwrap that proven pair, never a fence inferred from terminal text. */
		function toolDisplayContent(value, failed) {
			if (![
				"claude:Bash",
				"claude:Edit",
				"claude:Write"
			].includes(String(value.toolSource)) || typeof value.rawOutput !== "string" || !Array.isArray(value.content) || value.content.length !== 1) return value.content;
			const atom = value.content[0];
			if (!record(atom) || atom.type !== "content" || !record(atom.content) || atom.content.type !== "text") return value.content;
			const stdout = value.rawOutput;
			const wrapped = atom.content.text;
			const consoleWrapper = value.toolSource === "claude:Bash" && wrapped === `\`\`\`console\n${stdout.trimEnd()}\n\`\`\``;
			const errorWrapper = failed && wrapped === `\`\`\`\n${stdout}\n\`\`\``;
			if (!consoleWrapper && !errorWrapper) return value.content;
			return [{
				...atom,
				content: {
					...atom.content,
					text: stdout
				}
			}];
		}
		/**
		* Project the common ACP execute shapes onto DSH's native terminal surface.
		* Codex reports formatted_output; Devin reports standard ACP text blocks and
		* a standalone exit-status line nested under content[].content.
		*/
		function terminalDetail(row, value) {
			if (!record(value)) return void 0;
			const hostOutcome = activityHostTerminalOutcome(value, row.ownerDshSessionId);
			const rawInput = record(value.rawInput) ? value.rawInput : void 0;
			const rawOutput = record(value.rawOutput) ? value.rawOutput : void 0;
			const command = typeof rawInput?.command === "string" ? rawInput.command : void 0;
			const formatted = typeof value.formatted_output === "string" ? value.formatted_output : typeof rawOutput?.formatted_output === "string" ? rawOutput.formatted_output : void 0;
			let nestedExitCode;
			const nestedOutput = [];
			for (const part of textContent(toolDisplayContent(value, row.status === "failed" || row.status === "cancelled"))) {
				const exit = /^Exited with code (-?\d+)$/.exec(part.trim());
				if (exit?.[1] !== void 0) {
					const parsed = Number(exit[1]);
					if (Number.isSafeInteger(parsed)) nestedExitCode = parsed;
				} else nestedOutput.push(part);
			}
			if (value.toolKind !== "execute" && command === void 0 && formatted === void 0 && nestedExitCode === void 0) return void 0;
			if (nestedOutput.length === 0) nestedOutput.push(...textContent(value.rawOutput));
			const output = formatted ?? joinTextContent(nestedOutput) ?? (nestedOutput.length > 0 ? "" : typeof value.rawOutput === "string" ? value.rawOutput : void 0);
			const exitCode = hostOutcome === void 0 ? integer(value.exitCode) ?? integer(value.exit_code) ?? integer(rawOutput?.exitCode) ?? integer(rawOutput?.exit_code) ?? nestedExitCode : hostOutcome.exitCode ?? void 0;
			const signal = hostOutcome === void 0 ? typeof value.signal === "string" ? value.signal : typeof rawOutput?.signal === "string" ? rawOutput.signal : void 0 : hostOutcome.signal ?? void 0;
			return {
				command: command ?? row.presentation,
				...typeof rawInput?.cwd === "string" ? { cwd: rawInput.cwd } : {},
				...output === void 0 ? {} : { output },
				...exitCode === void 0 ? {} : { exitCode },
				...signal === void 0 ? {} : { signal },
				running: row.status === "running"
			};
		}
		function dotState(status) {
			if (status === "running") return "ongoing";
			if (status === "completed") return "done";
			if (status === "cancelled" || status === "unfinished") return "warning";
			return "error";
		}
		/** Legacy audit rows may be incomplete; never compare their truncated file sides. */
		function activityDiffs(row, detail) {
			if (row.display !== void 0) return [...row.display.diffs ?? []];
			if (/\[truncated\]|\[nested value omitted\]|\[redacted\]/.test(row.rawDetail ?? "")) return [];
			return activityDiffsOf(detail);
		}
		/** Use one recorded absolute location only when it identifies the tool's file target. */
		function operationFilePath(detail, target) {
			if (typeof target !== "string" || target === "" || !Array.isArray(detail.locations) || detail.locations.length !== 1) return void 0;
			const location = detail.locations[0];
			if (!record(location) || typeof location.path !== "string" || !isAbsoluteWorkspacePath(location.path)) return void 0;
			const windows = /^[A-Za-z]:[/\\]/.test(location.path) || location.path.startsWith("\\\\");
			const normalize = (path) => windows ? path.replaceAll("\\", "/") : path;
			const absolute = normalize(location.path);
			const file = normalize(target);
			if (isAbsoluteWorkspacePath(target)) return absolute === file ? location.path : void 0;
			const parts = file.split("/").filter((part) => part !== ".");
			if (parts.length === 0 || parts.some((part) => part === "" || part === ".." || /[*?\[\]]/.test(part))) return void 0;
			return absolute.endsWith(`/${parts.join("/")}`) ? location.path : void 0;
		}
		function diffLabels(t) {
			return {
				codeLabel: t("activity.code"),
				wrapLabel: t("activity.wrap"),
				unwrapLabel: t("activity.unwrap"),
				copy: t("activity.copy"),
				copied: t("activity.copied"),
				collapseAria: t("activity.collapse"),
				expandAria: (hidden) => t("activity.expandCount", { count: hidden }),
				collapse: t("activity.collapse"),
				expand: (hidden) => t("activity.expandCount", { count: hidden })
			};
		}
		function terminalLabels(t, outputNotProvided = false) {
			return {
				commandLine: (line) => t("activity.terminal.commandLine", { line }),
				signal: (signal) => t("activity.terminal.signal", { signal }),
				exitCode: (code) => t("activity.terminal.exitCode", { code }),
				noExitCode: t("activity.terminal.noExitCode"),
				running: t("activity.status.running"),
				failed: t("activity.status.failed"),
				done: t("activity.status.completed"),
				copy: t("activity.copy"),
				copied: t("activity.copied"),
				noOutput: t(outputNotProvided ? "activity.terminal.outputNotProvided" : "activity.terminal.noOutput"),
				collapseAria: t("activity.terminal.collapseAria"),
				collapse: t("activity.collapse"),
				expandAria: (hidden) => t("activity.terminal.expandAria", { count: hidden }),
				expand: (hidden) => t("activity.expandCount", { count: hidden })
			};
		}
		function projectionLinkOnly(value) {
			if (!record(value) || typeof value.projectedChildSessionId !== "string") return false;
			return Object.keys(value).every((key) => key === "projectedChildSessionId" || key === "resultCompleteness" || key === "sourceToolCallId");
		}
		function projectionMetadata(value) {
			if (!record(value)) return false;
			if (typeof value.projectedChildSessionId === "string") return true;
			return typeof value.sourceToolCallId === "string" && value.projection === "unavailable";
		}
		function completedProjectedChild(row) {
			if (row.status !== "completed") return void 0;
			const detail = detailValue(row);
			if (!record(detail)) return void 0;
			if (typeof detail.projectedChildSessionId === "string") return {
				parentSessionId: row.ownerDshSessionId,
				childSessionId: detail.projectedChildSessionId
			};
			if (typeof detail.childSessionId === "string" && typeof detail.parentDshSessionId === "string") return {
				parentSessionId: detail.parentDshSessionId,
				childSessionId: detail.childSessionId
			};
		}
		/** Unknown tool outcomes stay in the ACP activity surface; never fabricate a native result block. */
		function usesNativeActivityToolProjection(row) {
			return row.kind === "tool" && row.status !== "unfinished";
		}
		function sameActivityOwner(left, right) {
			return left.dshSessionId === right.dshSessionId && left.ownerDshSessionId === right.ownerDshSessionId && left.promptAnchorMessageId === right.promptAnchorMessageId;
		}
		function toolCallIdOfRoot(row) {
			const anchoredPrefix = `${row.promptAnchorMessageId}:tool:`;
			if (row.activityId.startsWith(anchoredPrefix)) return row.activityId.slice(anchoredPrefix.length);
			if (row.activityId.startsWith("tool:")) return row.activityId.slice(5);
		}
		function toolContentIdentity(row) {
			const anchoredPrefix = `${row.promptAnchorMessageId}:`;
			const relativeId = row.activityId.startsWith(anchoredPrefix) ? row.activityId.slice(anchoredPrefix.length) : row.activityId;
			const contentPrefix = relativeId.startsWith("part:") ? "part:" : relativeId.startsWith("tool:") ? "tool:" : void 0;
			if (contentPrefix === void 0) return void 0;
			const match = /^([\s\S]*):(0|[1-9]\d*):(diff|terminal|resource|content)$/.exec(relativeId.slice(contentPrefix.length));
			if (match === null) return void 0;
			const expectedKind = match[3] === "diff" ? "diff" : match[3] === "terminal" ? "terminal" : match[3] === "resource" ? "resource" : "other";
			return row.kind === expectedKind ? { toolCallId: match[1] } : void 0;
		}
		/**
		* A projected child is navigation metadata for its source Tool call, not a
		* second operation in the parent transcript. Keep the source call, suppress
		* the link-only sidecar row, and suppress the content children already folded
		* into the source call. This leaves exactly one visible row per ACP Tool call.
		*/
		function visibleActivityRows(rows) {
			const projectionRows = rows.filter((row) => projectionMetadata(detailValue(row)));
			const delegationWindows = projectionRows.flatMap((projectionRow) => {
				const detail = detailValue(projectionRow);
				if (!projectionMetadata(detail) || typeof detail.sourceToolCallId !== "string") return [];
				const anchoredRootId = `${projectionRow.promptAnchorMessageId}:tool:${detail.sourceToolCallId}`;
				const legacyRootId = `tool:${detail.sourceToolCallId}`;
				const root = rows.find((row) => row.kind === "tool" && sameActivityOwner(row, projectionRow) && (row.activityId === anchoredRootId || row.activityId === legacyRootId));
				return root === void 0 ? [] : [{
					root,
					projectionRow,
					toolCallId: detail.sourceToolCallId
				}];
			});
			const visibleToolRoots = rows.filter((row) => row.kind === "tool").flatMap((row) => {
				const toolCallId = toolCallIdOfRoot(row);
				return toolCallId === void 0 ? [] : [{
					row,
					toolCallId
				}];
			});
			return rows.filter((row) => {
				if (row.kind === "tool" && row.presentation === "Agent tool activity" && !hasMeaningfulDetail(detailValue(row))) return false;
				if (projectionRows.includes(row)) return false;
				if (delegationWindows.some(({ root }) => row === root && root.presentation === "Agent tool activity" && !hasMeaningfulDetail(detailValue(root)))) return false;
				const contentIdentity = row.kind === "tool" ? void 0 : toolContentIdentity(row);
				if (contentIdentity !== void 0 && visibleToolRoots.some((root) => sameActivityOwner(root.row, row) && root.toolCallId === contentIdentity.toolCallId)) return false;
				return true;
			}).map((row) => {
				const projection = delegationWindows.find((window) => window.root === row)?.projectionRow;
				const projectedChild = projection === void 0 ? void 0 : completedProjectedChild(projection);
				return projectedChild === void 0 ? row : {
					...row,
					projectedChild
				};
			});
		}
		function json(value) {
			if (typeof value === "string") return value;
			try {
				return JSON.stringify(value ?? {});
			} catch {
				return "{}";
			}
		}
		function contentText(value) {
			if (typeof value === "string") return value;
			return joinTextContent(textContent(value)) ?? (hasMeaningfulDetail(value) ? json(value) : "");
		}
		/** Compact summary with explicitly read-only, sidecar-redacted details. */
		function activityRowElement({ row, t, onOpenProjectedChild, jsonStringWrapping, open = false, onToggle = () => void 0 }) {
			const detail = detailValue(row);
			const external = record(detail) && detail.kind === "dsh-acp-external-subagent" ? detail : void 0;
			const projectedChildSessionId = record(detail) && typeof detail.projectedChildSessionId === "string" ? detail.projectedChildSessionId : void 0;
			const diffs = activityDiffs(row, detail);
			const terminal = terminalDetail(row, detail);
			const showRawDetail = hasMeaningfulDetail(detail) && external === void 0 && !projectionLinkOnly(detail) && diffs.length === 0 && terminal === void 0;
			const expandable = external !== void 0 || projectedChildSessionId !== void 0 || showRawDetail || diffs.length > 0 || terminal !== void 0 || row.display?.unavailable !== void 0;
			const body = (0, react.createElement)("div", { className: AcpActivityNode_module_css_default.body }, row.display?.unavailable === void 0 ? null : (0, react.createElement)("p", null, t(row.display?.unavailable === "invalid" ? "activity.detailInvalid" : "activity.detailTooLarge")), external === void 0 ? null : (0, react.createElement)("div", { className: AcpActivityNode_module_css_default.externalRecord }, (0, react.createElement)("div", { className: AcpActivityNode_module_css_default.externalSection }, (0, react.createElement)("span", { className: AcpActivityNode_module_css_default.externalLabel }, t("subagent.task")), (0, react.createElement)("p", { className: AcpActivityNode_module_css_default.externalText }, record(external.task) && typeof external.task.text === "string" ? external.task.text : t("subagent.unavailable"))), (0, react.createElement)("div", { className: AcpActivityNode_module_css_default.externalSection }, (0, react.createElement)("span", { className: AcpActivityNode_module_css_default.externalLabel }, record(external.result) && external.result.completeness === "summary" ? t("subagent.summary") : t("subagent.result")), (0, react.createElement)("p", { className: AcpActivityNode_module_css_default.externalText }, record(external.result) && typeof external.result.text === "string" ? external.result.text : t("subagent.unavailable"))), (0, react.createElement)("p", { className: AcpActivityNode_module_css_default.externalNote }, t("subagent.observedTiming"))), projectedChildSessionId === void 0 || onOpenProjectedChild === void 0 ? null : (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				variant: "outline",
				size: "sm",
				className: AcpActivityNode_module_css_default.openRecord,
				onClick: () => {
					onOpenProjectedChild(row.ownerDshSessionId, projectedChildSessionId);
				}
			}, t("subagent.openRecord")), diffs.length === 0 ? null : (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.DiffBlock, {
				diffs,
				labels: diffLabels(t),
				className: AcpActivityNode_module_css_default.nativeBlock
			}), terminal === void 0 ? null : (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.TerminalBlock, {
				...terminal,
				labels: terminalLabels(t, terminal.output === void 0 && !terminal.running),
				className: AcpActivityNode_module_css_default.nativeBlock
			}), !showRawDetail ? null : typeof detail === "object" && detail !== null ? (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.JsonTree, {
				data: detail,
				label: t(`activity.kind.${row.kind}`),
				labels: acpJsonTreeLabels(t),
				...jsonStringWrapping === void 0 ? {} : { stringWrapping: {
					...jsonStringWrapping,
					label: t("auditWrapLines")
				} },
				expandTopLevel: true,
				className: AcpActivityNode_module_css_default.json
			}) : (0, react.createElement)("pre", { className: AcpActivityNode_module_css_default.raw }, String(detail)));
			return (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.DisclosureRow, {
				className: AcpActivityNode_module_css_default.row,
				rowClassName: AcpActivityNode_module_css_default.rowSummary,
				titleClassName: AcpActivityNode_module_css_default.presentation,
				icon: (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: dotState(row.status) }),
				title: row.presentation,
				open,
				expandable,
				expandOnRowClick: true,
				keepContentWhenOpen: true,
				onToggle,
				collapsedContent: (0, react.createElement)("span", { className: AcpActivityNode_module_css_default.status }, (0, react.createElement)("span", {
					className: AcpActivityNode_module_css_default.separator,
					"aria-hidden": true
				}), statusLabel(row.status, t))
			}, body);
		}
		function ActivityRow(props) {
			const { expanded: open, setExpanded: setOpen, toggle } = props.useDisclosure();
			const [loaded, setLoaded] = (0, react.useState)(void 0);
			const [failed, setFailed] = (0, react.useState)(false);
			const [attempt, setAttempt] = (0, react.useState)(0);
			const row = props.row;
			const child = row.projectedChild;
			const onOpenChild = props.onOpenProjectedChild;
			const openChild = child !== void 0 && onOpenChild !== void 0 ? () => onOpenChild(child.parentSessionId, child.childSessionId) : void 0;
			const current = loaded?.revisionSeq === row.revisionSeq && loaded.activityId === row.activityId && loaded.dshSessionId === row.dshSessionId && loaded.ownerDshSessionId === row.ownerDshSessionId ? loaded : void 0;
			(0, react.useEffect)(() => {
				if (!open || row.detailDeferred !== true || current !== void 0) return;
				let active = true;
				setFailed(false);
				if (props.journalHub === void 0) {
					setFailed(true);
					return;
				}
				props.journalHub.detail(row).then((detail) => {
					if (active) setLoaded(detail);
				}, () => {
					if (active) setFailed(true);
				});
				return () => {
					active = false;
				};
			}, [
				open,
				row.dshSessionId,
				row.ownerDshSessionId,
				row.activityId,
				row.revisionSeq,
				row.detailDeferred,
				props.journalHub,
				current,
				attempt
			]);
			if (row.detailDeferred === true && current === void 0) {
				const pendingDetail = open ? (0, react.createElement)("div", {
					className: AcpActivityNode_module_css_default.body,
					role: "status"
				}, props.t(failed ? "activity.detailLoadFailed" : "activity.detailLoading"), failed ? (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "outline",
					size: "sm",
					onClick: () => {
						setAttempt((value) => value + 1);
					}
				}, props.t("activity.detailRetry")) : null) : null;
				if (usesNativeActivityToolProjection(row)) return (0, react.createElement)("div", { onClickCapture: () => setOpen(true) }, props.renderTool?.({
					...row,
					rawDetail: JSON.stringify({
						...row.detailPaths?.[0] === void 0 ? {} : {
							toolName: "edit",
							rawInput: { file_path: row.detailPaths[0] }
						},
						rawOutput: props.t(failed ? "activity.detailLoadFailed" : "activity.detailLoading")
					})
				}), failed ? (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "outline",
					size: "sm",
					onClick: () => {
						setAttempt((value) => value + 1);
					}
				}, props.t("activity.detailRetry")) : null);
				return (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.DisclosureRow, {
					className: AcpActivityNode_module_css_default.row,
					title: row.kind === "plan" ? props.t("activity.tool.plan") : row.presentation,
					icon: (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: dotState(row.status) }),
					open,
					expandable: true,
					expandOnRowClick: true,
					onToggle: toggle
				}, pendingDetail);
			}
			const full = current ?? row;
			if (full.kind === "plan") return planRowElement(full, props.t, open, toggle);
			if (usesNativeActivityToolProjection(full)) return (0, react.createElement)("div", null, props.renderTool?.(full), openChild === void 0 ? null : (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				variant: "outline",
				size: "sm",
				className: AcpActivityNode_module_css_default.openRecord,
				onClick: openChild
			}, props.t("subagent.openRecord")), full.display?.unavailable === void 0 ? null : (0, react.createElement)("p", { role: "status" }, props.t(full.display.unavailable === "invalid" ? "activity.detailInvalid" : "activity.detailTooLarge")));
			return activityRowElement({
				...props,
				row: full,
				open,
				onToggle: toggle
			});
		}
		/** Historical ACP plan snapshot. The current plan is also projected into DSH's native todo dock. */
		function planRowElement(row, t, open, onToggle) {
			const legacy = detailValue(row);
			const entries = row.display !== void 0 ? row.display.plan ?? [] : Array.isArray(legacy) ? legacy.filter((item) => record(item) && typeof item.content === "string" && [
				"pending",
				"in_progress",
				"completed"
			].includes(String(item.status))) : [];
			return (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.DisclosureRow, {
				title: t("activity.tool.plan"),
				icon: (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: dotState(row.status) }),
				expandable: entries.length > 0 || row.display?.unavailable !== void 0,
				open,
				onToggle
			}, row.display?.unavailable !== void 0 ? (0, react.createElement)("p", null, t(row.display?.unavailable === "invalid" ? "activity.detailInvalid" : "activity.detailTooLarge")) : (0, react.createElement)("ul", { className: AcpActivityNode_module_css_default.planList }, ...entries.map((entry, index) => (0, react.createElement)("li", {
				key: index,
				className: AcpActivityNode_module_css_default.planItem,
				"data-status": entry.status
			}, (0, react.createElement)("span", {
				className: AcpActivityNode_module_css_default.planGlyph,
				"aria-hidden": true
			}, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: entry.status === "completed" ? "done" : entry.status === "in_progress" ? "ongoing" : "idle" })), (0, react.createElement)("span", { className: AcpActivityNode_module_css_default.planContent }, (0, react.createElement)("span", null, entry.content), (0, react.createElement)("span", { className: AcpActivityNode_module_css_default.planStatus }, ` · ${t(entry.status === "completed" ? "activity.status.completed" : entry.status === "in_progress" ? "activity.status.running" : "activity.status.pending")}`))))));
		}
		const UNSETTLED_SOURCE = {
			getSnapshot: () => void 0,
			subscribe: () => () => {}
		};
		/** Subscribe to native Step facts: a final marker retires the live journal view. */
		function AcpActivityNode(props) {
			const location = props.node.location;
			const source = location.kind === "step" ? location.step.data.source("acp-activity") : UNSETTLED_SOURCE;
			const settled = (0, react.useSyncExternalStore)(source.subscribe, source.getSnapshot);
			if (props.node.data.settled !== true && settled !== void 0) return null;
			return (0, react.createElement)(AcpActivityContent, {
				...props,
				renderTool: (row) => renderNativeActivityTool(props, row, props.t)
			});
		}
		/** Additive ACP activity renderer. Agent-provided presentation is never translated. */
		function AcpActivityContent({ node, sessionId, journalHub, t, openFile, onOpenProjectedChild, jsonStringWrapping, renderTool, useDisclosure }) {
			const [rows, setRows] = (0, react.useState)([]);
			const [feedback, setFeedback] = (0, react.useState)("quiet");
			const [canRetry, setCanRetry] = (0, react.useState)(false);
			const [retrying, setRetrying] = (0, react.useState)(false);
			const retryRef = (0, react.useRef)(void 0);
			const data = node.data;
			(0, react.useEffect)(() => {
				let handle;
				const publish = () => {
					const next = visibleActivityRows(handle.snapshot());
					setRows(next);
					setRetrying(handle.retrying());
					setCanRetry(handle.canRetry());
					setFeedback(handle.feedback());
				};
				const ownerSessionId = activityJournalSessionId(data, sessionId);
				handle = journalHub.acquire(ownerSessionId, ownerSessionId, data.promptAnchorMessageId, publish);
				retryRef.current = handle.retry;
				publish();
				return () => {
					retryRef.current = void 0;
					handle.release();
				};
			}, [
				data.ownerDshSessionId,
				data.promptAnchorMessageId,
				sessionId,
				journalHub
			]);
			if (rows.length === 0 && feedback === "quiet") return null;
			return (0, react.createElement)("section", {
				className: AcpActivityNode_module_css_default.flow,
				"data-acp-activity": true
			}, ...rows.map((row) => (0, react.createElement)(ActivityRow, {
				key: `${row.activityId}:${row.activitySeq}`,
				row,
				t,
				openFile,
				journalHub,
				useDisclosure,
				...renderTool === void 0 ? {} : { renderTool },
				...jsonStringWrapping === void 0 ? {} : { jsonStringWrapping },
				...onOpenProjectedChild === void 0 ? {} : { onOpenProjectedChild }
			})), feedback === "reconnecting" || feedback === "initial-read-retrying" ? (0, react.createElement)("div", { className: AcpActivityNode_module_css_default.status }, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: "ongoing" }), (0, react.createElement)("span", null, t(feedback === "reconnecting" ? "activity.reconnecting" : "activity.initialReadRetrying"))) : feedback === "unavailable" ? (0, react.createElement)("div", { className: AcpActivityNode_module_css_default.unavailable }, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: "error" }), (0, react.createElement)("span", null, t("activity.unavailable")), canRetry || retrying ? (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				variant: "outline",
				size: "sm",
				disabled: retrying,
				onClick: () => {
					retryRef.current?.();
				}
			}, t("activity.retry")) : null) : null);
		}
		/** Presentation-only normalization. These blocks never enter the agent loop,
		* session event log, model context, tool execution or permission system. */
		function nativeActivityToolBlock(row, externalAgentLabel, externalAgentStatusLabel, translateOutput) {
			if (row.status === "unfinished") throw new Error("An ACP activity without a reported result cannot be projected as a native tool result");
			const value = detailValue(row);
			const detail = record(value) ? value : {};
			const externalDelegations = Array.isArray(detail.externalDelegations) ? detail.externalDelegations.flatMap((item) => record(item) && typeof item.label === "string" && item.label.length > 0 ? [{
				label: item.label,
				status: typeof item.status === "string" ? item.status : "unfinished"
			}] : []) : [];
			const raw = detail.rawInput;
			const mcp = record(raw) && typeof raw.tool === "string" && record(raw.arguments);
			let input = mcp ? raw.arguments : raw;
			let name = typeof detail.toolName === "string" ? detail.toolName : row.presentation;
			if (detail.toolSource === "claude:Edit") name = "edit";
			else if (detail.toolSource === "claude:Write") name = "write";
			if (mcp) name = String(raw.tool);
			name = name.replace(/^mcp__.+?__/, "").replace(/^[a-f0-9]{8,}_/, "");
			const command = record(input) ? input.command ?? input.cmd : void 0;
			const terminal = terminalDetail(row, value);
			const diffs = activityDiffs(row, value);
			const file = record(input) ? input.file_path ?? input.path : void 0;
			let meta;
			if (typeof command === "string" && (!mcp || /^(bash|pwsh|exec_command|shell)$/i.test(name))) {
				name = /^(pwsh|powershell)$/i.test(name) ? "pwsh" : "bash";
				input = {
					...record(input) ? input : {},
					command,
					...terminal?.cwd === void 0 ? {} : { workdir: terminal.cwd },
					...terminal?.exitCode === void 0 && terminal?.signal === void 0 ? {} : { description: row.presentation }
				};
			} else if (diffs.length > 0) {
				name = diffs.every((diff) => diff.oldText === null) ? "write" : "edit";
				const first = diffs[0];
				input = {
					...record(input) ? input : {},
					file_path: first.path,
					...name === "write" ? { content: first.newText } : {
						old_string: first.oldText ?? "",
						new_string: first.newText
					}
				};
				meta = { diffs };
			} else if (detail.toolKind === "read" && typeof file === "string" && record(input) && input.pattern === void 0 && input.query === void 0) {
				name = "read";
				input = {
					...record(input) ? input : {},
					file_path: file
				};
			}
			const target = record(input) ? input.file_path ?? input.path : void 0;
			const path = diffs.length <= 1 && (name === "read" || name === "write" || name === "edit") ? operationFilePath(detail, target) : void 0;
			if (path !== void 0) meta = {
				...record(meta) ? meta : {},
				path
			};
			if (externalAgentLabel !== void 0 && externalDelegations.length > 0) name = `${externalAgentLabel} · ${externalDelegations.map((item) => externalAgentStatusLabel === void 0 ? `${item.label} · ${item.status}` : `${item.label} · ${externalAgentStatusLabel(item.status)}`).join(", ")} · ${name}`;
			const callId = `acp:${row.ownerDshSessionId}:${row.promptAnchorMessageId}:${row.activityId}`;
			const argsRaw = input === void 0 ? "{}" : typeof input === "string" ? input : JSON.stringify(input);
			const args = PartialArguments.fromText(argsRaw);
			if (row.status === "running") return {
				callId,
				name,
				phase: "start",
				args,
				argsRaw,
				turn: 0,
				step: 0,
				time: row.time,
				subCalls: []
			};
			const shell = name === "bash" || name === "pwsh";
			const hostOutcome = shell ? activityHostTerminalOutcome(value, row.ownerDshSessionId) : void 0;
			const hostProcessFailed = hostOutcome !== void 0 && (hostOutcome.signal !== null || hostOutcome.exitCode !== null && hostOutcome.exitCode !== 0);
			let output = translateOutput === void 0 ? contentText(detail.rawOutput ?? detail.content) : activityToolOutput(shell ? terminal?.output ?? detail.rawOutput : detail.rawOutput, toolDisplayContent(detail, row.status === "failed" || row.status === "cancelled"), translateOutput, shell ? terminal : void 0).text;
			if ((name === "bash" || name === "pwsh") && terminal !== void 0) {
				if (translateOutput === void 0) output = terminal.output ?? output;
				if (terminal.signal !== void 0) output += `\n[killed by signal: ${terminal.signal}]`;
				else if (terminal.exitCode !== void 0) output += `\n[exit code: ${terminal.exitCode}]`;
			}
			return {
				kind: "tool-result",
				callId,
				name,
				args,
				seq: row.activitySeq,
				time: row.time,
				callTime: null,
				call: {
					name,
					argsRaw
				},
				content: output === "" ? [] : [{
					type: "text",
					text: output
				}],
				isError: row.status === "failed" || row.status === "cancelled" || hostProcessFailed,
				subCalls: [],
				...row.status === "cancelled" ? { error: {
					name: "Interrupted",
					code: "interrupted"
				} } : {},
				...meta === void 0 ? {} : { meta }
			};
		}
		function renderNativeActivityTool(props, row, t) {
			return (0, react.createElement)(NativeActivityTool, {
				owner: props,
				row,
				t
			});
		}
		function NativeActivityTool({ owner, row, t }) {
			const block = (0, react.useMemo)(() => nativeActivityToolBlock(row, t("activity.externalAgent"), (status) => {
				return t(`activity.externalAgentStatus.${status === "running" || status === "completed" || status === "failed" || status === "cancelled" ? status : "unfinished"}`);
			}, t), [row, t]);
			const props = {
				...nativeOwner(owner),
				inspectCall: void 0,
				node: {
					...owner.node,
					kind: "tool-call",
					data: { root: block }
				}
			};
			const supplement = (0, react.useMemo)(() => {
				if (!("kind" in block) || block.isError || block.name !== "write" && block.name !== "edit" || !record(block.meta) || !Array.isArray(block.meta.diffs) || block.meta.diffs.length === 0 || (block.args.text("file_path") ?? "").trim() === "" || block.name === "edit" && block.args.has("replace_all") && typeof block.args.value("replace_all") !== "boolean") return "";
				const detail = detailValue(row);
				if (!record(detail)) return "";
				const output = activityToolOutput(detail.rawOutput, detail.content, t);
				const hasDisplayCaption = textContent(detail.content).some((text) => text.trim() !== "");
				return output.hasUnrepresentedSupplement || hasDisplayCaption ? joinActivityToolOutput(output.items.filter((item) => item.kind !== "diff")) : "";
			}, [
				block,
				row,
				t
			]);
			const control = (0, react.useMemo)(() => {
				const detail = detailValue(row);
				return activityHostToolControlOutcome(detail, row) !== void 0 && record(detail) && !(Array.isArray(detail.content) && detail.content.length > 0);
			}, [row]) ? {
				title: t("activity.control.waitTitle"),
				status: t("activity.control.notExecuted"),
				explanation: t("activity.control.teamReplyQueued")
			} : void 0;
			if (block.subCalls.length === 0) {
				const card = (0, react.createElement)(NativeToolWithSupplement, {
					owner,
					props,
					supplement,
					control
				});
				const terminal = terminalDetail(row, detailValue(row));
				return (0, react.createElement)(NativeTerminalOutputNotice.Provider, { value: terminal !== void 0 && !terminal.running && terminal.output === void 0 ? t("activity.terminal.outputNotProvided") : void 0 }, card);
			}
			return owner.renderFactorySlot("acp.native-tool", props);
		}
		/** One disclosure invocation owns both the native row and its extra content.
		* Calling the bound hook twice creates independent states. This is confined to
		* an ACP root with no subcalls; ordinary native trees retain their own hooks. */
		function NativeToolWithSupplement({ owner, props, supplement, control }) {
			const disclosure = owner.useDisclosure();
			const useSharedDisclosure = (0, react.useCallback)(() => disclosure, [disclosure]);
			return (0, react.createElement)("div", {
				className: `${AcpActivityNode_module_css_default.nativeToolOwner}${supplement === "" ? "" : ` ${AcpActivityNode_module_css_default.hasSupplement}`}`,
				"data-acp-tool-supplement-owner": true
			}, control === void 0 ? owner.renderFactorySlot("acp.native-tool", {
				...props,
				useDisclosure: useSharedDisclosure
			}) : (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.DisclosureRow, {
				className: AcpActivityNode_module_css_default.row,
				rowClassName: AcpActivityNode_module_css_default.rowSummary,
				titleClassName: AcpActivityNode_module_css_default.presentation,
				title: control.title,
				icon: (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: "idle" }),
				open: disclosure.expanded,
				onToggle: disclosure.toggle,
				expandable: true,
				expandOnRowClick: true,
				keepContentWhenOpen: true,
				collapsedContent: (0, react.createElement)("span", { className: AcpActivityNode_module_css_default.status }, (0, react.createElement)("span", {
					className: AcpActivityNode_module_css_default.separator,
					"aria-hidden": true
				}), control.status)
			}, (0, react.createElement)("div", {
				className: AcpActivityNode_module_css_default.body,
				"data-acp-host-control": "deferred-team-message"
			}, (0, react.createElement)("p", { className: AcpActivityNode_module_css_default.externalText }, control.explanation))), disclosure.expanded && supplement !== "" ? (0, react.createElement)("pre", {
				className: `${AcpActivityNode_module_css_default.raw} ${AcpActivityNode_module_css_default.toolSupplement}`,
				"data-acp-tool-supplement": true
			}, supplement) : null);
		}
		//#endregion
		//#region src/client/ui/native-header-views.ts
		/** This public child declaration has exactly one owner. A replacement that
		* borrows its navigation face is not another source for native composition. */
		function ownsNativeHeaderViews(entry) {
			return entry.children?.["conversation.session.header.views.actions"] !== void 0 && entry.inject !== void 0;
		}
		/** The pinned shell lists raw view registrations; rendering elects one entry per id. */
		function uniqueViewTabs(tabs) {
			const unique = tabs.filter((tab, index) => tabs.findIndex((value) => value.id === tab.id) === index);
			return unique.length === tabs.length ? tabs : unique;
		}
		/** Adapt the source rather than a component Hook, so a replacement header can
		* borrow the same navigation face without losing deduplication. The cache belongs
		* to this one composition mount and keeps useSyncExternalStore snapshots stable. */
		function nativeHeaderViewRegistration(entry) {
			const inject = entry.inject;
			if (inject === void 0) return {};
			const sources = /* @__PURE__ */ new WeakMap();
			const deduplicated = (source) => {
				let mapped = sources.get(source);
				if (mapped === void 0) {
					let previous = source.getSnapshot();
					let snapshot = uniqueViewTabs(previous);
					mapped = {
						subscribe: (listener) => source.subscribe(listener),
						getSnapshot: () => {
							const next = source.getSnapshot();
							if (next !== previous) {
								previous = next;
								snapshot = uniqueViewTabs(next);
							}
							return snapshot;
						}
					};
					sources.set(source, mapped);
				}
				return mapped;
			};
			return { inject: (...args) => {
				const face = inject(...args);
				return {
					...face,
					hooks: {
						...face.hooks,
						conversationViews: deduplicated(face.hooks.conversationViews)
					}
				};
			} };
		}
		//#endregion
		//#region src/client/ui/activity-anchor-subscriptions.ts
		/** Retain unchanged per-anchor leases when the chat gains or loses markers. */
		var ActivityAnchorSubscriptions = class {
			hub;
			sessionId;
			scope;
			leases = /* @__PURE__ */ new Map();
			onChange;
			reconcile(hub, sessionId, scope, desired, onChange) {
				this.onChange = onChange;
				if (this.hub !== hub || this.sessionId !== sessionId || this.scope !== scope) {
					this.releaseAll();
					this.hub = hub;
					this.sessionId = sessionId;
					this.scope = scope;
				}
				const next = new Map(desired.map((item) => [item.key, item]));
				for (const [key, lease] of this.leases) {
					const item = next.get(key);
					if (item !== void 0 && item.ownerDshSessionId === lease.ownerDshSessionId && item.promptAnchorMessageId === lease.promptAnchorMessageId) continue;
					this.leases.delete(key);
					lease.handle?.release();
				}
				for (const item of desired) {
					if (this.leases.has(item.key)) continue;
					const lease = {
						ownerDshSessionId: item.ownerDshSessionId,
						promptAnchorMessageId: item.promptAnchorMessageId
					};
					this.leases.set(item.key, lease);
					const notify = () => {
						if (this.leases.get(item.key) !== lease || lease.handle === void 0) return;
						this.onChange?.(item.key, lease.handle);
					};
					try {
						lease.handle = hub.acquire(item.ownerDshSessionId, item.ownerDshSessionId, item.promptAnchorMessageId, notify);
					} catch (error) {
						if (this.leases.get(item.key) === lease) this.leases.delete(item.key);
						throw error;
					}
					notify();
				}
			}
			dispose() {
				this.releaseAll();
				this.hub = void 0;
				this.sessionId = void 0;
				this.scope = void 0;
				this.onChange = void 0;
			}
			releaseAll() {
				const leases = [...this.leases.values()];
				this.leases.clear();
				for (const lease of leases) lease.handle?.release();
			}
		};
		//#endregion
		//#region src/client/ui/acp-chat-normalization.ts
		function activityWindowKey(data, fallbackSessionId) {
			return JSON.stringify([data.ownerDshSessionId || fallbackSessionId || "", data.promptAnchorMessageId]);
		}
		function activityData(node) {
			if (node.kind === "acp-activity") return node.visibility === "hidden" ? void 0 : node.data;
			if (node.location.kind !== "step") return void 0;
			return node.location.step.data.get("acp-activity") ?? node.location.step.data.get("acp-activity-live");
		}
		function stepKey(node) {
			return node.location.kind === "step" ? `${node.location.turn.turn}:${node.location.step.step}` : void 0;
		}
		function stepActivityData(node, liveMarkersByStep) {
			const locationData = node.location.kind === "step" ? node.location.step.data.get("acp-activity") ?? node.location.step.data.get("acp-activity-live") : void 0;
			if (locationData !== void 0) return locationData;
			if (node.kind !== "assistant-step") return void 0;
			const live = liveMarkersByStep.get(stepKey(node) ?? "") ?? [];
			return live.length === 1 ? live[0].data : void 0;
		}
		function activityBoundaries(rows, count, settled = false) {
			const boundaries = /* @__PURE__ */ new Map();
			for (const row of rows) {
				if (row.contentIndex === void 0 || !settled && row.contentIndex > count) continue;
				const index = Math.min(row.contentIndex, count);
				const group = boundaries.get(index) ?? [];
				group.push(row);
				boundaries.set(index, group);
			}
			return boundaries;
		}
		function finalAnswerStart(blocks, boundaries) {
			let start = blocks.findLastIndex((block) => block.kind === "text" && block.text.trim() !== "" || block.kind === "image");
			if (start < 0) return blocks.length;
			while (start > 0 && !boundaries.has(start)) {
				const previous = blocks[start - 1];
				if (previous.kind !== "text" && previous.kind !== "image") break;
				start--;
			}
			return start;
		}
		function sameBlock(left, right) {
			if (left === right) return true;
			if (left.kind !== right.kind) return false;
			if (left.kind === "text" || left.kind === "reasoning") return right.kind === left.kind && left.text === right.text;
			if (left.kind === "image") return right.kind === "image" && left.attachment === right.attachment;
			if (left.kind === "tool-call") return right.kind === "tool-call" && left.callId === right.callId && left.name === right.name && left.argsRaw === right.argsRaw;
			return right.kind === "other" && left.block === right.block;
		}
		/** Retain a projected node when its public Chat fields are unchanged. */
		function reuseProjectedNode(node, previous) {
			const old = previous?.get(node.key);
			if (old === void 0 || old.kind !== node.kind || old.id !== node.id || old.target !== node.target || old.visibility !== node.visibility || old.groupTree !== node.groupTree || old.anchorSeq !== node.anchorSeq || old.location !== node.location) return node;
			if (node.kind === "assistant-step" && old.kind === "assistant-step") {
				const before = old.data;
				const after = node.data;
				return before.blocks.length === after.blocks.length && before.blocks.every((block, index) => sameBlock(block, after.blocks[index])) && before.status === after.status && before.turn === after.turn && before.step === after.step && before.time === after.time && before.usage === after.usage && before.finalNode === after.finalNode ? old : node;
			}
			if (node.kind === "tool-call" && old.kind === "tool-call") {
				const before = old.data;
				const after = node.data;
				return before.acpActivity === after.acpActivity ? old : node;
			}
			if (node.kind === "acp-inline-activity" && old.kind === "acp-inline-activity") return old.data === node.data ? old : node;
			if (node.kind === "turn-process" && old.kind === "turn-process") {
				const before = old.data;
				const after = node.data;
				const keys = Object.keys(before);
				return keys.length === Object.keys(after).length && keys.every((key) => before[key] === after[key]) ? old : node;
			}
			return old.data === node.data ? old : node;
		}
		function projectActivityRow(owner, row, windowKey) {
			const key = JSON.stringify([
				"acp-activity",
				windowKey,
				row.activityId
			]);
			const nativeTool = usesNativeActivityToolProjection(row);
			return {
				...owner,
				key,
				id: key,
				kind: nativeTool ? "tool-call" : "acp-inline-activity",
				data: nativeTool ? {
					root: nativeActivityToolBlock(row),
					acpActivity: row
				} : row,
				...row.kind === "tool" && row.status === "unfinished" ? { groupTree: "process" } : {}
			};
		}
		function normalizeAcpChatNodes(nodes, windows, cache, previous, fallbackSessionId) {
			const replaced = /* @__PURE__ */ new Map();
			const owned = /* @__PURE__ */ new Set();
			const owners = /* @__PURE__ */ new Map();
			const markersByWindow = /* @__PURE__ */ new Map();
			for (const node of nodes) if (node.kind === "acp-activity") {
				const data = node.data;
				const key = activityWindowKey(data, fallbackSessionId);
				const group = markersByWindow.get(key) ?? [];
				group.push(node);
				markersByWindow.set(key, group);
			}
			const duplicateMarkers = /* @__PURE__ */ new Set();
			for (const markers of markersByWindow.values()) {
				const settled = markers.find((node) => node.visibility !== "hidden" && node.data.settled === true);
				if (settled !== void 0) {
					for (const marker of markers) if (marker !== settled) duplicateMarkers.add(marker.key);
					continue;
				}
				const live = markers.find((node) => node.id.startsWith("input:") && node.visibility !== "hidden");
				if (live !== void 0) {
					for (const marker of markers) if (marker !== live) duplicateMarkers.add(marker.key);
					continue;
				}
				if (markers.some((node) => node.id.startsWith("input:") && node.visibility === "hidden")) {
					for (const marker of markers) duplicateMarkers.add(marker.key);
					continue;
				}
				const fallback = markers.find((node) => node.visibility !== "hidden");
				if (fallback !== void 0) {
					for (const marker of markers) if (marker !== fallback) duplicateMarkers.add(marker.key);
				}
			}
			const liveMarkersByStep = /* @__PURE__ */ new Map();
			for (const markers of markersByWindow.values()) for (const marker of markers) {
				if (!marker.id.startsWith("input:") || duplicateMarkers.has(marker.key) || marker.visibility === "hidden") continue;
				const data = marker.data;
				if ((windows.get(activityWindowKey(data, fallbackSessionId))?.rows.length ?? 0) === 0) continue;
				const key = stepKey(marker);
				if (key === void 0) continue;
				const group = liveMarkersByStep.get(key) ?? [];
				group.push(marker);
				liveMarkersByStep.set(key, group);
			}
			for (const node of nodes) {
				if (node.kind !== "assistant-step") continue;
				const data = stepActivityData(node, liveMarkersByStep);
				if (data === void 0) continue;
				const key = activityWindowKey(data, fallbackSessionId);
				owners.set(key, (owners.get(key) ?? 0) + 1);
			}
			const turns = /* @__PURE__ */ new Map();
			const earlyCandidates = /* @__PURE__ */ new Map();
			const earlySteps = /* @__PURE__ */ new Map();
			for (const [windowKey, markers] of markersByWindow) {
				if (owners.has(windowKey)) continue;
				const window = windows.get(windowKey);
				if (window === void 0 || window.unavailable || window.rows.length === 0 || window.rows.some((row) => row.contentIndex !== 0)) continue;
				if (!markers.some((marker) => marker.visibility !== "hidden" && !duplicateMarkers.has(marker.key))) continue;
				const requests = markers.filter((marker) => marker.visibility !== "hidden" && marker.id.startsWith("request:") && marker.location.kind === "step");
				if (requests.length !== 1) continue;
				const marker = requests[0];
				const step = stepKey(marker);
				earlyCandidates.set(windowKey, {
					marker,
					window
				});
				earlySteps.set(step, (earlySteps.get(step) ?? 0) + 1);
			}
			for (const [windowKey, { marker, window }] of earlyCandidates) {
				if (earlySteps.get(stepKey(marker)) !== 1 || marker.location.kind !== "step") continue;
				const { groupTree: _markerPosition, ...owner } = marker;
				const placed = window.rows.map((row, index) => reuseProjectedNode({
					...projectActivityRow(owner, row, windowKey),
					anchorSeq: marker.anchorSeq + index / (window.rows.length + 1)
				}, previous));
				replaced.set(marker.key, placed);
				owned.add(windowKey);
				const turn = marker.location.turn.turn;
				const old = turns.get(turn);
				turns.set(turn, {
					tools: (old?.tools ?? 0) + placed.filter((node) => node.kind === "tool-call").length,
					answer: old?.answer ?? null,
					step: marker.location.step.step
				});
			}
			const seenCache = /* @__PURE__ */ new Set();
			for (const base of nodes) {
				if (base.kind !== "assistant-step") continue;
				const data = stepActivityData(base, liveMarkersByStep);
				if (data === void 0) continue;
				const node = base;
				const windowKey = activityWindowKey(data, fallbackSessionId);
				const window = owners.get(windowKey) === 1 ? windows.get(windowKey) : void 0;
				const journalReady = window !== void 0 && !window.unavailable;
				const committedReply = data.settled === true && node.data.finalNode?.messageId !== void 0;
				if (!journalReady && !committedReply) {
					cache?.delete(node.key);
					continue;
				}
				if (journalReady) {
					owned.add(windowKey);
					seenCache.add(node.key);
				} else cache?.delete(node.key);
				const cached = cache?.get(node.key);
				if (journalReady && cached?.source === base && cached.window === window) {
					replaced.set(node.key, cached.nodes);
					const old = turns.get(cached.contribution.turn);
					turns.set(cached.contribution.turn, {
						tools: (old?.tools ?? 0) + cached.contribution.tools,
						answer: cached.contribution.answer ?? old?.answer ?? null,
						step: cached.contribution.step
					});
					continue;
				}
				const blocks = node.data.blocks.map((block) => block.kind === "reasoning" ? {
					...block,
					text: block.text.replace(/^\s*\n/, "")
				} : block);
				const rows = journalReady ? window.rows : [];
				const boundaries = activityBoundaries(rows, blocks.length, node.data.status !== "running");
				const answer = finalAnswerStart(blocks, boundaries);
				const firstVisibleBlock = blocks.findIndex((block) => block.kind === "text" && block.text.trim() !== "" || block.kind === "image");
				const stableAnchorIndex = answer < blocks.length ? answer : firstVisibleBlock;
				const segments = [];
				let hasAnchor = false;
				const emitRow = (row) => {
					segments.push(reuseProjectedNode(projectActivityRow(node, row, windowKey), previous));
				};
				for (let index = 0; index <= blocks.length; index++) {
					for (const row of boundaries.get(index) ?? []) emitRow(row);
					if (index === blocks.length) break;
					const start = index;
					const group = [blocks[index]];
					while (index + 1 < blocks.length && !boundaries.has(index + 1) && index + 1 !== answer && blocks[index].kind === "reasoning" === (blocks[index + 1].kind === "reasoning") && !(start === answer && blocks[index + 1].kind !== "text" && blocks[index + 1].kind !== "image")) group.push(blocks[++index]);
					const ownsAnchor = stableAnchorIndex >= start && stableAnchorIndex <= index || stableAnchorIndex < 0 && !hasAnchor;
					const key = ownsAnchor && stableAnchorIndex >= 0 ? node.key : `${node.key}:content:${start}`;
					hasAnchor ||= ownsAnchor;
					const { finalNode, ...message } = node.data;
					segments.push({
						...node,
						key,
						id: key,
						...committedReply && start === answer ? { groupTree: "turn" } : {},
						data: {
							...message,
							blocks: group,
							...ownsAnchor && finalNode !== void 0 ? { finalNode } : {},
							status: node.data.status === "interrupted" ? ownsAnchor ? "interrupted" : "settled" : index === blocks.length - 1 ? node.data.status : "settled"
						}
					});
				}
				for (const row of rows) if (row.contentIndex === void 0) emitRow(row);
				if (blocks.length === 0) segments.push(node);
				const placed = segments.map((segment, index) => reuseProjectedNode({
					...segment,
					anchorSeq: node.anchorSeq + index / (segments.length + 1)
				}, previous));
				replaced.set(node.key, placed);
				const final = placed.findLast((segment) => segment.kind === "assistant-step" && segment.data.blocks.some((block) => block.kind === "text" && block.text.trim() !== "" || block.kind === "image"));
				const old = turns.get(node.data.turn);
				turns.set(node.data.turn, {
					tools: (old?.tools ?? 0) + placed.filter((segment) => segment.kind === "tool-call").length,
					answer: final?.anchorSeq ?? old?.answer ?? null,
					step: node.data.step
				});
				if (journalReady) cache?.set(node.key, {
					source: base,
					window,
					nodes: placed,
					contribution: {
						turn: node.data.turn,
						tools: placed.filter((segment) => segment.kind === "tool-call").length,
						answer: final?.anchorSeq ?? null,
						step: node.data.step
					}
				});
			}
			if (cache !== void 0) {
				for (const key of cache.keys()) if (!seenCache.has(key)) cache.delete(key);
			}
			return nodes.flatMap((node) => {
				const replacement = replaced.get(node.key);
				if (replacement !== void 0) return replacement;
				if (node.kind === "acp-activity" && (owned.has(activityWindowKey(node.data, fallbackSessionId)) || duplicateMarkers.has(node.key))) return [];
				if (node.kind === "turn-process") {
					const process = node;
					const turn = turns.get(process.data.turn);
					if (turn !== void 0) return [reuseProjectedNode({
						...process,
						data: {
							...process.data,
							toolCallCount: process.data.toolCallCount + turn.tools,
							...process.data.answerStep === turn.step ? { answerAnchorSeq: turn.answer } : {}
						}
					}, previous)];
				}
				return [node];
			});
		}
		//#endregion
		//#region src/client/ui/AcpAssistantStream.ts
		var SnapshotSource = class {
			value;
			listeners = /* @__PURE__ */ new Set();
			constructor(value) {
				this.value = value;
			}
			getSnapshot = () => this.value;
			subscribe = (listener) => {
				this.listeners.add(listener);
				return () => this.listeners.delete(listener);
			};
			set(value) {
				if (Object.is(this.value, value)) return false;
				this.value = value;
				return true;
			}
			publish() {
				for (const listener of this.listeners) listener();
			}
		};
		function groupSource(projection, key) {
			let source = projection.groupSources.get(key);
			if (source === void 0) {
				source = new SnapshotSource(projection.snapshots.get(key));
				projection.groupSources.set(key, source);
			}
			return source;
		}
		const emptyChatSource = new SnapshotSource(null);
		const emptyNodeSource = new SnapshotSource(void 0);
		const emptyProcessSource = new SnapshotSource(void 0);
		const emptyBottomSource = new SnapshotSource(false);
		const emptyGroupSource = new SnapshotSource(void 0);
		const emptyGroupRevisionSource = new SnapshotSource(0);
		const ProjectionContext = (0, react.createContext)(void 0);
		const emptyProjectionBinding = {
			projectionRef: { current: void 0 },
			projectionModeSource: emptyGroupRevisionSource
		};
		function createChatProjection(view, group) {
			const typedView = view;
			const builder = typedView.create();
			const projection = {
				view: typedView,
				group,
				builder,
				chatSource: new SnapshotSource(builder.empty),
				groupRevision: new SnapshotSource(0),
				snapshots: /* @__PURE__ */ new Map(),
				groupSources: /* @__PURE__ */ new Map(),
				groupedView: void 0,
				initial: true,
				groupState: group?.create(),
				groupedEntries: void 0,
				nodes: /* @__PURE__ */ new Map(),
				timeline: void 0,
				dirtySources: /* @__PURE__ */ new Set(),
				normalizationCache: /* @__PURE__ */ new Map()
			};
			projection.groupedView = {
				get entries() {
					return projection.groupedEntries ?? [];
				},
				groupSource: (key) => groupSource(projection, key)
			};
			return projection;
		}
		/** Render-phase work is pure; builder and group mutation happens after commit. */
		function stageChatProjection(projection, original, windows, fallbackSessionId) {
			const normalizationCache = new Map(projection.normalizationCache);
			const nodes = [...normalizeAcpChatNodes(original.nodes.values(), windows, normalizationCache, projection.nodes, fallbackSessionId)];
			const nextNodes = new Map(nodes.map((node) => [node.key, node]));
			const upserts = nodes.filter((node) => projection.nodes.get(node.key) !== node);
			const removed = [...projection.nodes.keys()].some((key) => !nextNodes.has(key));
			return {
				nodes,
				upserts,
				replace: projection.initial || removed,
				changed: projection.initial || removed || upserts.length > 0 || projection.timeline !== original.timeline,
				timeline: original.timeline,
				normalizationCache
			};
		}
		function commitChatProjection(projection, change) {
			projection.normalizationCache = change.normalizationCache;
			if (!change.changed) return;
			let chat;
			if (change.replace) chat = projection.builder.replace({
				nodes: change.nodes,
				timeline: change.timeline
			});
			else if (change.upserts.length > 0 || projection.timeline !== change.timeline) chat = projection.builder.apply({
				upserts: change.upserts,
				timeline: change.timeline
			});
			else chat = projection.chatSource.getSnapshot();
			projection.initial = false;
			projection.nodes = new Map(change.nodes.map((node) => [node.key, node]));
			projection.timeline = change.timeline;
			const dirty = projection.chatSource.set(chat);
			let groupsChanged = false;
			const removedSourceKeys = [];
			const input = projection.builder.groupInput?.();
			const state = projection.groupState;
			const updatedState = projection.group !== void 0 && input !== void 0 ? projection.group.update({ state }, input) : state;
			if (projection.group !== void 0 && input !== void 0) {
				projection.groupState = updatedState;
				const update = projection.group.buildGroups({ state: updatedState });
				if (update !== null && update !== void 0) {
					groupsChanged = true;
					if (update.groups.kind === "replace") {
						for (const key of projection.snapshots.keys()) projection.snapshots.delete(key);
						for (const snapshot of update.groups.snapshots) projection.snapshots.set(snapshot.key, snapshot);
					} else {
						for (const key of update.groups.removes) projection.snapshots.delete(key);
						for (const snapshot of update.groups.upserts) projection.snapshots.set(snapshot.key, snapshot);
					}
					if (update.entries !== void 0) projection.groupedEntries = update.entries;
					for (const [key, source] of projection.groupSources) {
						if (source.set(projection.snapshots.get(key))) projection.dirtySources.add(source);
						if (!projection.snapshots.has(key)) removedSourceKeys.push(key);
					}
					for (const key of projection.snapshots.keys()) groupSource(projection, key);
				}
			}
			projection.builder.publish?.();
			if (dirty) projection.chatSource.publish();
			for (const source of projection.dirtySources) source.publish();
			projection.dirtySources.clear();
			for (const key of removedSourceKeys) projection.groupSources.delete(key);
			if (groupsChanged) {
				projection.groupRevision.set(projection.groupRevision.getSnapshot() + 1);
				projection.groupRevision.publish();
			}
		}
		function NormalizedChat({ Native, props, ctx, dependencies }) {
			const selectedChat = props.useChat((value) => ({
				nodes: value.nodes.values(),
				timeline: value.timeline
			}), (left, right) => left.nodes === right.nodes && left.timeline === right.timeline);
			const original = (0, react.useMemo)(() => ({
				nodes: { values: () => selectedChat.nodes },
				timeline: selectedChat.timeline
			}), [selectedChat.nodes, selectedChat.timeline]);
			const [windows, setWindows] = (0, react.useState)(/* @__PURE__ */ new Map());
			const projectionRef = (0, react.useRef)(void 0);
			const projectionModeRef = (0, react.useRef)(void 0);
			if (projectionModeRef.current === void 0) projectionModeRef.current = new SnapshotSource(0);
			const projectionModeSource = projectionModeRef.current;
			const subscriptionsRef = (0, react.useRef)(void 0);
			if (subscriptionsRef.current === void 0) subscriptionsRef.current = new ActivityAnchorSubscriptions();
			const subscriptions = subscriptionsRef.current;
			const anchors = new Map(original.nodes.values().flatMap((node) => {
				const data = activityData(node);
				return data === void 0 ? [] : [[activityWindowKey(data, props.sessionId), data]];
			}));
			const signature = JSON.stringify([...anchors].map(([key, data]) => [
				key,
				data.ownerDshSessionId,
				data.promptAnchorMessageId
			]));
			(0, react.useEffect)(() => {
				const activeKeys = new Set(anchors.keys());
				setWindows((current) => {
					const next = new Map([...current].filter(([key]) => activeKeys.has(key)));
					return next.size === current.size ? current : next;
				});
				subscriptions.reconcile(dependencies.journalHub, props.sessionId, dependencies, [...anchors].map(([key, data]) => ({
					key,
					ownerDshSessionId: activityJournalSessionId(data, props.sessionId),
					promptAnchorMessageId: data.promptAnchorMessageId
				})), (key, handle) => {
					const rows = handle.snapshot();
					setWindows((current) => {
						const nextWindow = {
							rows: visibleActivityRows(rows),
							unavailable: !handle.ready() || handle.error() !== void 0
						};
						const previous = current.get(key);
						if (previous !== void 0 && previous.unavailable === nextWindow.unavailable && previous.rows.length === nextWindow.rows.length && previous.rows.every((row, index) => row === nextWindow.rows[index])) return current;
						const next = new Map([...current].filter(([activeKey]) => activeKeys.has(activeKey)));
						next.set(key, nextWindow);
						return next;
					});
				});
			}, [
				signature,
				props.sessionId,
				dependencies,
				subscriptions
			]);
			(0, react.useEffect)(() => () => subscriptions.dispose(), [subscriptions]);
			const visibleWindows = (0, react.useMemo)(() => new Map([...windows].filter(([key]) => anchors.has(key))), [windows, signature]);
			const view = ctx.uiConversation.views.entries().find((value) => value.target === "chat");
			const group = ctx.uiConversation.groups.forTarget("chat");
			const hasAcp = anchors.size > 0 && view !== void 0;
			const committedProjection = projectionRef.current;
			const projection = !hasAcp ? void 0 : committedProjection?.view === view && committedProjection.group === group ? committedProjection : createChatProjection(view, group);
			const change = (0, react.useMemo)(() => projection === void 0 ? void 0 : stageChatProjection(projection, original, visibleWindows, props.sessionId), [
				projection,
				original,
				visibleWindows,
				props.sessionId
			]);
			(0, react.useLayoutEffect)(() => {
				if (projection !== void 0 && change !== void 0) commitChatProjection(projection, change);
				if (projectionRef.current !== projection) {
					projectionRef.current = projection;
					projectionModeSource.set(projectionModeSource.getSnapshot() + 1);
					projectionModeSource.publish();
				}
			}, [
				projection,
				change,
				props
			]);
			const binding = (0, react.useMemo)(() => ({
				projectionRef,
				projectionModeSource
			}), []);
			const adapters = useProjectedChatHooks(props, binding);
			return (0, react.createElement)(ProjectionContext.Provider, { value: binding }, (0, react.createElement)(Native, {
				...props,
				...adapters
			}));
		}
		/** Replace only Session data hooks; native viewport behavior stays on the flow. */
		function useProjectedChatHooks(props, { projectionRef, projectionModeSource }) {
			const nativePropsRef = (0, react.useRef)(props);
			(0, react.useLayoutEffect)(() => {
				nativePropsRef.current = props;
			}, [props]);
			return (0, react.useMemo)(() => {
				const useChat = (selector, equal) => {
					const native = nativePropsRef.current.useChat((snapshot) => selector(projectionRef.current?.chatSource.getSnapshot() ?? snapshot), equal);
					(0, react.useSyncExternalStore)(projectionModeSource.subscribe, projectionModeSource.getSnapshot);
					const current = projectionRef.current;
					const source = current?.chatSource ?? emptyChatSource;
					const snapshot = (0, react.useSyncExternalStore)(source.subscribe, source.getSnapshot);
					return current === void 0 ? native : selector(snapshot);
				};
				const useConversation = (selector, equal) => {
					const base = nativePropsRef.current.useConversation((snapshot) => snapshot);
					(0, react.useSyncExternalStore)(projectionModeSource.subscribe, projectionModeSource.getSnapshot);
					const current = projectionRef.current;
					const chatSource = current?.chatSource ?? emptyChatSource;
					const chatSnapshot = (0, react.useSyncExternalStore)(chatSource.subscribe, chatSource.getSnapshot);
					const groupRevision = current?.groupRevision ?? emptyGroupRevisionSource;
					const groupsSnapshot = (0, react.useSyncExternalStore)(groupRevision.subscribe, groupRevision.getSnapshot);
					const conversation = (0, react.useMemo)(() => {
						const active = current;
						const conversation = base;
						if (active === void 0 || base == null) return base;
						return {
							...conversation,
							views: {
								...conversation.views,
								get: (target) => target === "chat" ? active.chatSource.getSnapshot() : conversation.views.get(target),
								grouped: (target) => target === "chat" ? active.group === void 0 ? void 0 : active.groupedView : conversation.views.grouped(target)
							}
						};
					}, [
						base,
						current,
						chatSnapshot,
						groupsSnapshot
					]);
					return conversation == null ? conversation : selector(conversation);
				};
				const useChatNode = (key, selector) => {
					const nativeSelector = selector === void 0 ? void 0 : (node) => {
						const current = projectionRef.current;
						return selector(current === void 0 ? node : current.chatSource.getSnapshot().nodes.get(key));
					};
					const native = nativePropsRef.current.useChatNode(key, nativeSelector);
					(0, react.useSyncExternalStore)(projectionModeSource.subscribe, projectionModeSource.getSnapshot);
					const current = projectionRef.current;
					const source = current?.chatSource.getSnapshot().nodes.source(key) ?? emptyNodeSource;
					const value = (0, react.useSyncExternalStore)(source.subscribe, source.getSnapshot);
					return current === void 0 ? native : selector === void 0 ? value : selector(value);
				};
				const useChatNodeProcess = (key, selector) => {
					const nativeSelector = selector === void 0 ? void 0 : (value) => {
						const current = projectionRef.current;
						return selector(current === void 0 ? value : current.chatSource.getSnapshot().nodes.processSource(key).getSnapshot());
					};
					const native = nativePropsRef.current.useChatNodeProcess(key, nativeSelector);
					(0, react.useSyncExternalStore)(projectionModeSource.subscribe, projectionModeSource.getSnapshot);
					const current = projectionRef.current;
					const source = current?.chatSource.getSnapshot().nodes.processSource(key) ?? emptyProcessSource;
					const value = (0, react.useSyncExternalStore)(source.subscribe, source.getSnapshot);
					return current === void 0 ? native : selector === void 0 ? value : selector(value);
				};
				const useChatGroup = (key, selector) => {
					const nativeSelector = selector === void 0 ? void 0 : (value) => {
						const current = projectionRef.current;
						return selector(current === void 0 ? value : current.groupedView.groupSource(key).getSnapshot());
					};
					const native = nativePropsRef.current.useChatGroup(key, nativeSelector);
					(0, react.useSyncExternalStore)(projectionModeSource.subscribe, projectionModeSource.getSnapshot);
					const source = projectionRef.current?.groupedView.groupSource(key) ?? emptyGroupSource;
					const value = (0, react.useSyncExternalStore)(source.subscribe, source.getSnapshot);
					return projectionRef.current === void 0 ? native : selector === void 0 ? value : selector(value);
				};
				const useChatNodeBottom = (key) => {
					const native = nativePropsRef.current.useChatNodeBottom(key);
					(0, react.useSyncExternalStore)(projectionModeSource.subscribe, projectionModeSource.getSnapshot);
					const source = projectionRef.current?.chatSource.getSnapshot().nodes.bottomSource(key) ?? emptyBottomSource;
					const value = (0, react.useSyncExternalStore)(source.subscribe, source.getSnapshot);
					return projectionRef.current === void 0 ? native : value;
				};
				return {
					useChat,
					useConversation,
					useChatNode,
					useChatNodeBottom,
					useChatNodeProcess,
					useChatGroup
				};
			}, [projectionRef, projectionModeSource]);
		}
		function NormalizedChatFlow({ Native, props }) {
			const binding = (0, react.useContext)(ProjectionContext) ?? emptyProjectionBinding;
			(0, react.useSyncExternalStore)(binding.projectionModeSource.subscribe, binding.projectionModeSource.getSnapshot);
			const adapters = useProjectedChatHooks(props, binding);
			return (0, react.createElement)(Native, {
				...props,
				...adapters
			});
		}
		/** Shadow a native entry through the public slot API, preserving its full tree. */
		function composeSlot(ctx, name, select, wrap, registration) {
			ctx.slots.inject(name, () => {
				let current;
				let release;
				const sync = () => {
					const next = ctx.slots.entries(name).find((entry) => entry.registrant !== "acp-chat-normalization" && select(entry));
					if (next === current) return;
					const oldRelease = release;
					release = void 0;
					current = next;
					oldRelease?.();
					if (next !== void 0) release = mountNativeEntry(ctx, next, name, {
						registration: {
							priority: (next.options.priority ?? 0) - 1,
							registrant: "acp-chat-normalization",
							...registration?.(next)
						},
						wrap
					});
				};
				const unsubscribe = ctx.slots.subscribe(name, sync);
				sync();
				return () => {
					unsubscribe();
					release?.();
				};
			});
		}
		function installAcpAssistantStream(ctx, dependencies) {
			composeSlot(ctx, "conversation.view", (entry) => entry.options.id === "chat", (Native, props) => (0, react.createElement)(NormalizedChat, {
				key: props.sessionId,
				Native,
				props,
				ctx,
				dependencies
			}));
			composeSlot(ctx, "conversation.chat.flow", () => true, (Native, props) => (0, react.createElement)(NormalizedChatFlow, {
				Native,
				props
			}));
			composeSlot(ctx, "conversation.session.header", ownsNativeHeaderViews, (Native, props) => (0, react.createElement)(Native, props), nativeHeaderViewRegistration);
			composeSlot(ctx, "conversation.chat.node", (entry) => entry.options.key === "tool-call", (Native, props) => {
				const owner = props;
				const row = owner.node.data.acpActivity;
				return row === void 0 ? (0, react.createElement)(Native, props) : (0, react.createElement)(ActivityRow, {
					...dependencies,
					row,
					openFile: owner.openFile,
					useDisclosure: owner.useDisclosure,
					renderTool: (full) => renderNativeActivityTool(owner, full, dependencies.t)
				});
			});
			ctx.slots.inject("conversation.chat.node", () => ctx.slots.register({
				name: "conversation.chat.node",
				key: "acp-inline-activity",
				locale: "acpActivity"
			}, (props) => (0, react.createElement)(ActivityRow, {
				...dependencies,
				row: props.node.data,
				openFile: props.openFile,
				useDisclosure: props.useDisclosure
			})));
		}
		//#endregion
		//#region src/client/data/activity-journal.ts
		var ActivityJournalProtocolError = class extends Error {
			code = "gateway/internal";
		};
		/** Client-side projection of the unfiltered, contiguous host journal. */
		var AcpActivityJournalStore = class {
			rows = /* @__PURE__ */ new Map();
			rowsByAnchor = /* @__PURE__ */ new Map();
			cursor = 0;
			replace(head, activities) {
				this.rows.clear();
				this.rowsByAnchor.clear();
				this.cursor = head;
				for (const row of activities) this.insert(row);
			}
			append(activity) {
				if (activity.revisionSeq <= this.cursor) return;
				if (activity.revisionSeq !== this.cursor + 1) throw new ActivityJournalProtocolError(`ACP activity journal gap: expected ${this.cursor + 1}, received ${activity.revisionSeq}`);
				this.cursor = activity.revisionSeq;
				const previous = this.rows.get(activity.activityId);
				if (previous !== void 0 && (previous.ownerDshSessionId !== activity.ownerDshSessionId || previous.promptAnchorMessageId !== activity.promptAnchorMessageId)) this.rowsByAnchor.get(this.anchorKey(previous.ownerDshSessionId, previous.promptAnchorMessageId))?.delete(previous.activityId);
				this.insert(activity);
			}
			values(ownerDshSessionId, promptAnchorMessageId) {
				const rows = this.rowsByAnchor.get(this.anchorKey(ownerDshSessionId, promptAnchorMessageId));
				return rows === void 0 ? [] : [...rows.values()].sort((left, right) => left.activitySeq - right.activitySeq);
			}
			anchorKey(ownerDshSessionId, promptAnchorMessageId) {
				return `${ownerDshSessionId}\u0000${promptAnchorMessageId}`;
			}
			insert(row) {
				this.rows.set(row.activityId, row);
				const key = this.anchorKey(row.ownerDshSessionId, row.promptAnchorMessageId);
				const rows = this.rowsByAnchor.get(key) ?? /* @__PURE__ */ new Map();
				rows.set(row.activityId, row);
				this.rowsByAnchor.set(key, rows);
			}
		};
		function snapshotBatch(head, activities) {
			return head === 0 ? [] : [{
				firstRevision: 1,
				lastRevision: head,
				activities
			}];
		}
		/**
		* The host owns reconnect and gap repair. One current-state snapshot covers
		* all revisions through its head; live batches still cover exactly one revision.
		*/
		var AcpActivityRemoteJournal = class extends _deepseek_ai_dsh_api_gateway_client.RemoteJournalStream {
			remote;
			sessionId;
			onHealthyRead;
			constructor(streamFactory, remote, sessionId, publish, carrierFailed, failed, onHealthyRead) {
				super(streamFactory, {
					name: "dsh-acp activity journal",
					emptyCursor: 0,
					entries: (page) => page.batches,
					hasMore: () => false,
					first: (batch) => batch.firstRevision,
					last: (batch) => batch.lastRevision,
					compare: (left, right) => left - right,
					follows: (left, right) => right === left + 1,
					publish,
					carrierFailed,
					failed
				});
				this.remote = remote;
				this.sessionId = sessionId;
				this.onHealthyRead = onHealthyRead;
			}
			async *follow(request, signal) {
				for await (const frame of this.remote.activityFollow(this.sessionId, { limit: request.limit }, signal)) if (frame.type === "opened") yield {
					type: "opened",
					cursor: frame.cursor,
					page: {
						head: frame.cursor,
						batches: snapshotBatch(frame.cursor, frame.activities)
					}
				};
				else yield {
					type: "entry",
					entry: {
						firstRevision: frame.activity.revisionSeq,
						lastRevision: frame.activity.revisionSeq,
						activities: [frame.activity]
					}
				};
			}
			async readPage(request, through, signal) {
				const current = /* @__PURE__ */ new Map();
				let cursor = 0;
				while (cursor < through) {
					signal.throwIfAborted();
					const result = await this.remote.activityPage(this.sessionId, {
						afterRevision: cursor,
						limit: request.limit
					}, signal);
					if (!result.ok) throw result.error;
					const before = cursor;
					for (const activity of result.value.activities) {
						if (activity.revisionSeq > through) break;
						if (activity.revisionSeq !== cursor + 1) throw new ActivityJournalProtocolError(`ACP activity repair page skipped revision ${String(cursor + 1)}`);
						current.set(activity.activityId, activity);
						cursor = activity.revisionSeq;
					}
					if (cursor === before) throw new ActivityJournalProtocolError(`ACP activity repair ended before revision ${String(through)}`);
				}
				const activities = [...current.values()].sort((left, right) => left.activitySeq - right.activitySeq);
				this.onHealthyRead();
				return {
					head: through,
					batches: snapshotBatch(through, activities)
				};
			}
			repairRequest(initial) {
				return initial;
			}
		};
		/** Only a recognized first-binding wait is silent; other read failures remain visible. */
		function activityJournalFeedback(input) {
			if (input.error === void 0 || input.retrying) return "quiet";
			if (input.stableFailure) return "unavailable";
			if (!input.ready && typeof input.error === "object" && input.error !== null && "code" in input.error && input.error.code === "dsh-acp/activity-binding-pending") return "quiet";
			return input.ready ? "reconnecting" : "initial-read-retrying";
		}
		const INITIAL_OPEN_RETRY_BASE_MS = 100;
		const INITIAL_OPEN_RETRY_MAX_MS = 8e3;
		function waitForRetry(entry, delay) {
			return new Promise((resolve) => {
				const timer = setTimeout(() => {
					delete entry.cancelRetry;
					resolve(true);
				}, delay);
				entry.cancelRetry = () => {
					clearTimeout(timer);
					delete entry.cancelRetry;
					resolve(false);
				};
			});
		}
		/** One live ACP journal per DSH session. Nodes only subscribe to projections. */
		var AcpActivityJournalHub = class {
			remote;
			streamFactory;
			entries = /* @__PURE__ */ new Map();
			constructor(remote, streamFactory) {
				this.remote = remote;
				this.streamFactory = streamFactory;
			}
			/** In-flight deduplication only; full details live with the expanded component. */
			detailRequests = /* @__PURE__ */ new Map();
			detail(row) {
				const key = JSON.stringify([
					row.dshSessionId,
					row.ownerDshSessionId,
					row.activityId,
					row.revisionSeq
				]);
				const pending = this.detailRequests.get(key);
				if (pending !== void 0) return pending;
				const request = this.remote.activityDetail(row.dshSessionId, {
					activityId: row.activityId,
					revisionSeq: row.revisionSeq,
					ownerDshSessionId: row.ownerDshSessionId
				}).then((result) => {
					if (!result.ok) throw result.error;
					const detail = result.value;
					if (detail.dshSessionId !== row.dshSessionId || detail.ownerDshSessionId !== row.ownerDshSessionId || detail.activityId !== row.activityId || detail.revisionSeq !== row.revisionSeq) throw new Error("ACP activity detail identity mismatch");
					return detail;
				}).finally(() => {
					this.detailRequests.delete(key);
				});
				this.detailRequests.set(key, request);
				return request;
			}
			acquire(sessionId, ownerDshSessionId, promptAnchorMessageId, listener) {
				let entry = this.entries.get(sessionId);
				if (entry === void 0) entry = this.createEntry(sessionId);
				entry.refs += 1;
				const anchorKey = this.anchorKey(ownerDshSessionId, promptAnchorMessageId);
				const anchorListeners = entry.listenersByAnchor.get(anchorKey) ?? /* @__PURE__ */ new Set();
				anchorListeners.add(listener);
				entry.listenersByAnchor.set(anchorKey, anchorListeners);
				this.startEntry(sessionId, entry);
				let released = false;
				return {
					snapshot: () => entry.store.values(ownerDshSessionId, promptAnchorMessageId),
					ready: () => entry.ready,
					error: () => entry.error,
					canRetry: () => entry.retryExhausted,
					retrying: () => entry.retrying,
					loading: () => entry.initialLoading,
					feedback: () => activityJournalFeedback({
						ready: entry.ready,
						error: entry.error,
						stableFailure: entry.retryExhausted,
						retrying: entry.retrying
					}),
					retry: () => {
						if (this.entries.get(sessionId) !== entry || entry.refs === 0 || !entry.retryExhausted || entry.opening !== void 0 || entry.journal !== void 0 || entry.retiring !== void 0 || entry.cancelRetry !== void 0) return;
						entry.retryExhausted = false;
						entry.retrying = true;
						entry.initialLoading = true;
						entry.error = void 0;
						entry.retryAttempts = 0;
						this.notifyAll(entry);
						this.startEntry(sessionId, entry);
					},
					release: () => {
						if (released) return;
						released = true;
						const listeners = entry.listenersByAnchor.get(anchorKey);
						listeners?.delete(listener);
						if (listeners?.size === 0) entry.listenersByAnchor.delete(anchorKey);
						entry.refs -= 1;
						if (entry.refs === 0) {
							this.entries.delete(sessionId);
							entry.cancelRetry?.();
							entry.journal?.dispose();
						}
					}
				};
			}
			createEntry(sessionId) {
				const entry = {
					store: new AcpActivityJournalStore(),
					listenersByAnchor: /* @__PURE__ */ new Map(),
					refs: 0,
					ready: false,
					retryExhausted: false,
					retrying: false,
					retryAttempts: 0,
					initialLoading: true
				};
				this.entries.set(sessionId, entry);
				return entry;
			}
			/**
			* The conversation node can mount before the Agent startup commits its
			* durable ACP binding. Retry transient open and terminal read failures for
			* as long as a node subscribes; the delay is bounded, the retry count is not.
			* Carrier reconnect remains owned by DSH's RemoteJournalStream.
			*/
			startEntry(sessionId, entry) {
				if (entry.retryExhausted || entry.opening !== void 0 || entry.journal !== void 0 || entry.retiring !== void 0 || entry.cancelRetry !== void 0) return;
				entry.opening = (async () => {
					while (this.entries.get(sessionId) === entry && entry.refs > 0) {
						let opened = false;
						let journal;
						journal = new AcpActivityRemoteJournal(this.streamFactory, this.remote, sessionId, (change) => {
							if (this.entries.get(sessionId) !== entry || entry.journal !== journal) return;
							opened = true;
							if (change.type === "append") {
								for (const activity of change.entry.activities) entry.store.append(activity);
								entry.error = void 0;
								entry.retryAttempts = 0;
								this.notifyActivities(entry, change.entry.activities);
								return;
							}
							if (change.type === "prepend") return;
							const wasReady = entry.ready;
							const [baseline, ...tail] = change.entries;
							entry.store.replace(baseline?.lastRevision ?? 0, baseline?.activities ?? []);
							for (const batch of tail) for (const activity of batch.activities) entry.store.append(activity);
							entry.ready = true;
							entry.initialLoading = false;
							entry.error = void 0;
							entry.retrying = false;
							if (!wasReady) entry.retryAttempts = 0;
							this.notifyAll(entry);
						}, (error) => {
							if (!opened || this.entries.get(sessionId) !== entry || entry.journal !== journal) return;
							entry.error = error;
							this.notifyAll(entry);
						}, (error) => {
							if (!opened) return;
							this.terminalFailure(sessionId, entry, journal, error);
						}, () => {
							if (this.entries.get(sessionId) === entry && entry.journal === journal) entry.retryAttempts = 0;
						});
						entry.journal = journal;
						try {
							await journal.open({ limit: 200 });
							return;
						} catch (error) {
							if (entry.journal === journal) delete entry.journal;
							await journal.dispose();
							if (this.entries.get(sessionId) !== entry || entry.refs === 0) return;
							if (!this.noteFailure(entry, error)) return;
							if (!await waitForRetry(entry, nextRetryDelay(entry))) return;
						}
					}
				})().finally(() => {
					if (this.entries.get(sessionId) === entry) {
						delete entry.opening;
						if (entry.retryExhausted) this.notifyAll(entry);
					}
				});
			}
			noteFailure(entry, error) {
				entry.error = error;
				entry.retrying = false;
				if (isStableActivityFailure(error)) {
					entry.retryExhausted = true;
					entry.initialLoading = false;
					this.notifyAll(entry);
					return false;
				}
				this.notifyAll(entry);
				return true;
			}
			terminalFailure(sessionId, entry, journal, error) {
				if (this.entries.get(sessionId) !== entry || entry.journal !== journal) return;
				delete entry.journal;
				entry.error = error;
				entry.retrying = false;
				this.notifyAll(entry);
				const retiring = journal.dispose();
				entry.retiring = retiring;
				const afterRetire = () => {
					if (entry.retiring !== retiring) return;
					delete entry.retiring;
					if (this.entries.get(sessionId) !== entry || entry.refs === 0) return;
					if (!this.noteFailure(entry, error)) return;
					waitForRetry(entry, nextRetryDelay(entry)).then((retry) => {
						if (retry && this.entries.get(sessionId) === entry && entry.refs > 0) this.startEntry(sessionId, entry);
					});
				};
				retiring.then(afterRetire, afterRetire);
			}
			notifyActivities(entry, activities) {
				const keys = new Set(activities.map((activity) => this.anchorKey(activity.ownerDshSessionId, activity.promptAnchorMessageId)));
				for (const key of keys) {
					const listeners = entry.listenersByAnchor.get(key);
					if (listeners !== void 0) for (const listener of listeners) listener();
				}
			}
			notifyAll(entry) {
				for (const listeners of entry.listenersByAnchor.values()) for (const notify of listeners) notify();
			}
			anchorKey(ownerDshSessionId, promptAnchorMessageId) {
				return `${ownerDshSessionId}\u0000${promptAnchorMessageId}`;
			}
		};
		function nextRetryDelay(entry) {
			entry.retryAttempts += 1;
			const exponent = Math.min(entry.retryAttempts - 1, 10);
			return Math.min(INITIAL_OPEN_RETRY_BASE_MS * 2 ** exponent, INITIAL_OPEN_RETRY_MAX_MS);
		}
		/** Known authorization, configuration, validation, and protocol failures are not transient reads. */
		function isStableActivityFailure(error) {
			if (error instanceof ActivityJournalProtocolError) return true;
			if (typeof error !== "object" || error === null || !("code" in error)) return false;
			const code = error.code;
			return code === "gateway/bad-request" || code === "dsh-acp/user-rejected" || code === "dsh-acp/auth-required" || code === "dsh-acp/not-installed" || code === "dsh-acp/protocol-incompatible" || code === "dsh-acp/protocol-error" || code === "dsh-acp/config";
		}
		//#endregion
		//#region src/client/data/feedback.ts
		/** One app-scoped outcome store read by the shell overlay and written by ACP surfaces. */
		var AcpUiFeedback = class {
			snapshot = null;
			sequence = 0;
			listeners = /* @__PURE__ */ new Set();
			getSnapshot = () => this.snapshot;
			subscribe = (listener) => {
				this.listeners.add(listener);
				return () => this.listeners.delete(listener);
			};
			report = (outcome, sourceSession) => {
				this.snapshot = {
					outcome,
					sequence: ++this.sequence,
					...sourceSession === void 0 ? {} : { sourceSession }
				};
				for (const listener of [...this.listeners]) listener();
			};
			/** Preserve the Host-localized limitation without recreating an approval. */
			reportQuestionLimitation = (message, sourceSession) => {
				this.snapshot = {
					outcome: "delegated-question-unavailable",
					message,
					sourceSession,
					sequence: ++this.sequence
				};
				for (const listener of [...this.listeners]) listener();
			};
			dismiss = (sequence) => {
				if (this.snapshot?.sequence !== sequence) return;
				this.snapshot = null;
				for (const listener of [...this.listeners]) listener();
			};
		};
		/** Follow only the adapter's stable permission/question failure markers. */
		function followAcpQuestionLimitations(subscribe, feedback, titleOf) {
			const suffixes = [" (ACP_DELEGATED_QUESTION_UNAVAILABLE)", " (ACP_PERMISSION_POLICY_UNAVAILABLE)"];
			return subscribe((sessionId, error) => {
				const suffix = suffixes.find((value) => error.endsWith(value));
				if (sessionId === "" || suffix === void 0) return;
				const message = error.slice(0, -suffix.length).trim();
				if (message === "") return;
				feedback.reportQuestionLimitation(message, {
					id: sessionId,
					title: titleOf(sessionId)
				});
			});
		}
		//#endregion
		//#region src/client/data/cross-backend-controller.ts
		function messageOf(message, fallback) {
			return typeof message === "string" && message.length > 0 ? message : fallback;
		}
		/**
		* Resolves the only locations that are truthful for a new session.  Workspace
		* membership wins over cwd because it preserves DSH's grouping semantics.
		*/
		function resolveCrossBackendLocation(sessionId, workspaces, cwd) {
			const workspace = workspaces.find((candidate) => candidate.sessionIds.includes(sessionId));
			if (workspace !== void 0) return { workspaceId: workspace.workspaceId };
			if (typeof cwd === "string" && cwd.length > 0) return { cwd };
		}
		/**
		* Small stateful coordinator.  A ticket key identifies one user decision;
		* retries reuse its preallocated destination id and skip completed phases.
		* No phase after destination selection writes a separate default: the official
		* destination `selectModel` call is the sole default-producing operation.
		*/
		var CrossBackendTransactionController = class {
			states = /* @__PURE__ */ new Map();
			stateFor(ticket) {
				const existing = this.states.get(ticket.key);
				if (existing !== void 0) return existing;
				const state = {
					destinationSessionId: `session-${globalThis.crypto.randomUUID()}`,
					sourceRestored: ticket.sourceAlreadyRestored === true,
					destinationCreated: false,
					destinationSelected: false,
					opened: false
				};
				this.states.set(ticket.key, state);
				return state;
			}
			async confirm(ticket, operations) {
				const state = this.stateFor(ticket);
				if (!state.sourceRestored && ticket.sourceSelection !== void 0) {
					const restored = await operations.restoreSource(ticket.sourceSelection);
					if (!restored.ok) return {
						ok: false,
						failure: {
							phase: "restore-source",
							message: messageOf(restored.message, "source model restore failed"),
							destinationSessionId: state.destinationSessionId
						}
					};
					state.sourceRestored = true;
				}
				if (ticket.sourceSelection === void 0) state.sourceRestored = true;
				if (!state.destinationCreated) {
					let created = { published: false };
					try {
						created = await operations.createDestination({
							sessionId: state.destinationSessionId,
							location: ticket.location
						});
					} catch (error) {
						return {
							ok: false,
							failure: {
								phase: "create-destination",
								message: messageOf(error instanceof Error ? error.message : void 0, "destination creation failed"),
								destinationSessionId: state.destinationSessionId
							}
						};
					}
					if (!created.published) return {
						ok: false,
						failure: {
							phase: "create-destination",
							message: messageOf(created.message, "destination creation failed"),
							destinationSessionId: state.destinationSessionId
						}
					};
					state.destinationCreated = true;
				}
				if (!state.destinationSelected) {
					const selected = await operations.selectDestination(state.destinationSessionId, ticket.targetSelection);
					if (!selected.ok) return {
						ok: false,
						failure: {
							phase: "select-destination",
							message: messageOf(selected.message, "destination model selection failed"),
							destinationSessionId: state.destinationSessionId
						}
					};
					state.destinationSelected = true;
				}
				if (!state.opened) {
					const opened = await operations.openDestination(state.destinationSessionId);
					if (!opened.ok) return {
						ok: false,
						failure: {
							phase: "open-destination",
							message: messageOf(opened.message, "opening destination failed"),
							destinationSessionId: state.destinationSessionId
						}
					};
					state.opened = true;
				}
				return {
					ok: true,
					destinationSessionId: state.destinationSessionId
				};
			}
			/** Cancel restores the source only; it never creates or opens a destination. */
			async cancel(ticket, operations) {
				if (ticket.sourceAlreadyRestored === true) {
					this.states.delete(ticket.key);
					return {
						ok: true,
						destinationSessionId: ""
					};
				}
				if (ticket.sourceSelection === void 0) {
					this.states.delete(ticket.key);
					return {
						ok: true,
						destinationSessionId: ""
					};
				}
				const restored = await operations.restoreSource(ticket.sourceSelection);
				if (!restored.ok) return {
					ok: false,
					failure: {
						phase: "restore-source",
						message: messageOf(restored.message, "source model restore failed")
					}
				};
				this.states.delete(ticket.key);
				return {
					ok: true,
					destinationSessionId: ""
				};
			}
			/** Explicitly discard a completed/failed transaction after the UI is done. */
			forget(key) {
				this.states.delete(key);
			}
		};
		//#endregion
		//#region src/client/coordinator/cross-backend-coordinator.ts
		function isAcpRoute(provider, ownsRoute) {
			return provider !== void 0 && ownsRoute(provider);
		}
		function sameSelection(left, right) {
			return left?.provider === right?.provider && left?.model === right?.model && left?.reasoningEffort === right?.reasoningEffort;
		}
		/** Pure observation decision, independent of React and side effects. */
		function shouldConfirmBackendTransition(input, ownsRoute) {
			if (input.next === null || sameSelection(input.lastUsed, input.next)) return false;
			const fromAcp = isAcpRoute(input.lastUsed?.provider, ownsRoute);
			const toAcp = isAcpRoute(input.next.provider, ownsRoute);
			if (!fromAcp && !toAcp) return false;
			if (input.blank && input.lastUsed === null && toAcp) return false;
			if (fromAcp && toAcp && input.lastUsed?.provider === input.next.provider) return false;
			return true;
		}
		var CrossBackendCoordinator = class {
			ctx;
			ownsRoute;
			tx = new CrossBackendTransactionController();
			listeners = /* @__PURE__ */ new Set();
			unsubscribers = [];
			observed = /* @__PURE__ */ new Map();
			queued = [];
			pending = null;
			snapshot = { pending: null };
			disposed = false;
			constructor(ctx, ownsRoute) {
				this.ctx = ctx;
				this.ownsRoute = ownsRoute;
			}
			start() {
				const sessions = this.ctx.get("sessions");
				if (sessions === void 0 || typeof sessions.list?.subscribe !== "function") return () => this.dispose();
				const syncBindings = () => {
					if (this.disposed) return;
					const rows = sessions.list.getSnapshot().byId;
					for (const [id, observed] of this.observed) if (sessions.binding(id) !== observed.binding || rows[id] === void 0) {
						observed.unsubscribe();
						this.observed.delete(id);
					}
					for (const row of Object.values(rows)) {
						if (this.observed.has(row.id)) continue;
						const binding = sessions.binding(row.id);
						const projection = binding?.session.projections.faceOf("modelSelection");
						if (binding === void 0 || projection === void 0) continue;
						const observed = {
							binding,
							unsubscribe: () => {},
							lastProjection: void 0,
							suppressed: void 0,
							staging: false
						};
						this.observed.set(row.id, observed);
						observed.unsubscribe = projection.subscribe(() => {
							this.observe(row.id, observed);
						});
						this.observe(row.id, observed);
					}
				};
				this.unsubscribers.push(sessions.list.subscribe(syncBindings));
				syncBindings();
				return () => this.dispose();
			}
			subscribe(listener) {
				this.listeners.add(listener);
				return () => {
					this.listeners.delete(listener);
				};
			}
			getSnapshot() {
				return this.snapshot;
			}
			async confirm() {
				const pending = this.pending;
				if (pending === null || this.disposed || !pending.confirmable || pending.busy) return;
				this.pending = {
					...pending,
					busy: true,
					failure: null
				};
				this.suppressSelection(pending.ticket.sourceSessionId, pending.ticket.sourceSelection);
				this.emit();
				const result = await this.tx.confirm(pending.ticket, this.operationsFor(pending.ticket));
				if (result.ok) this.tx.forget(pending.ticket.key);
				if (this.disposed) return;
				if (result.ok) this.pending = this.queued.shift() ?? null;
				else this.pending = {
					...pending,
					busy: false,
					failure: result.failure
				};
				this.emit();
			}
			async cancel() {
				const pending = this.pending;
				if (pending === null || this.disposed || pending.busy) return;
				const source = pending.ticket.sourceSelection;
				if (source === void 0) {
					this.tx.forget(pending.ticket.key);
					this.pending = this.queued.shift() ?? null;
					this.emit();
					return;
				}
				this.pending = {
					...pending,
					busy: true,
					failure: null
				};
				this.suppressSelection(pending.ticket.sourceSessionId, source);
				this.emit();
				const result = await this.tx.cancel(pending.ticket, this.operationsFor(pending.ticket));
				if (this.disposed) return;
				if (result.ok) this.pending = this.queued.shift() ?? null;
				else this.pending = {
					...pending,
					busy: false,
					failure: result.failure
				};
				this.emit();
			}
			observe(sessionId, observed) {
				if (this.disposed || this.observed.get(sessionId) !== observed) return;
				const sessions = this.ctx.get("sessions");
				const projection = sessions.binding(sessionId)?.session.projections.faceOf("modelSelection").getSnapshot();
				if (projection === void 0 || sameSelection(observed.lastProjection?.next, projection.next)) return;
				const sourceSelection = observed.lastProjection?.next ?? projection.lastUsed;
				observed.lastProjection = projection;
				if (sameSelection(observed.suppressed, projection.next) && observed.suppressed !== void 0) {
					observed.suppressed = void 0;
					return;
				}
				if (observed.staging || this.pending?.ticket.sourceSessionId === sessionId || this.queued.some((item) => item.ticket.sourceSessionId === sessionId)) return;
				const row = sessions.list.getSnapshot().byId[sessionId];
				if (!shouldConfirmBackendTransition({
					lastUsed: projection.lastUsed,
					next: projection.next,
					blank: row?.blank === true
				}, this.ownsRoute)) return;
				const location = resolveCrossBackendLocation(sessionId, this.ctx.get("workspaces").list.getSnapshot().items, row?.cwd);
				if (location === void 0) {
					const ticket = {
						key: `${sessionId}\u0000${Date.now()}`,
						sourceSessionId: sessionId,
						sourceSelection: sourceSelection ?? void 0,
						targetSelection: projection.next,
						location: {}
					};
					this.stagePending(ticket, observed, "no-location");
					return;
				}
				const ticket = {
					key: `${sessionId}\u0000${Date.now()}\u0000${projection.next.provider}\u0000${projection.next.model}`,
					sourceSessionId: sessionId,
					sourceSelection: sourceSelection ?? void 0,
					targetSelection: projection.next,
					location
				};
				this.stagePending(ticket, observed);
			}
			async stagePending(ticket, observed, blockingReason) {
				if (observed.staging || this.disposed) return;
				const source = ticket.sourceSelection;
				observed.staging = true;
				if (source !== void 0) this.suppressSelection(ticket.sourceSessionId, source);
				const restored = source === void 0 ? { ok: true } : await this.operationsFor(ticket).restoreSource(source);
				observed.staging = false;
				if (this.disposed || this.observed.get(ticket.sourceSessionId) !== observed) return;
				const pending = restored.ok ? {
					ticket: {
						...ticket,
						...source === void 0 ? {} : { sourceAlreadyRestored: true }
					},
					failure: null,
					...blockingReason === void 0 ? {} : { blockingReason },
					confirmable: blockingReason === void 0,
					busy: false
				} : {
					ticket,
					failure: {
						phase: "restore-source",
						message: restored.message ?? "source model restore failed"
					},
					confirmable: false,
					busy: false
				};
				if (this.pending === null) this.pending = pending;
				else this.queued.push(pending);
				this.emit();
			}
			operationsFor(ticket) {
				const remote = this.ctx.remote;
				const sessions = this.ctx.get("sessions");
				return {
					restoreSource: async (selection) => {
						try {
							const result = await remote.session.selectModel({
								sessionId: ticket.sourceSessionId,
								...selection
							});
							return result.ok ? { ok: true } : {
								ok: false,
								message: result.error.message
							};
						} catch (error) {
							return {
								ok: false,
								message: error instanceof Error ? error.message : String(error)
							};
						}
					},
					createDestination: async ({ sessionId, location }) => {
						try {
							await sessions.create({
								sessionId,
								...location.cwd === void 0 ? {} : { cwd: location.cwd },
								...location.workspaceId === void 0 ? {} : { workspaceId: location.workspaceId }
							});
							return { published: true };
						} catch (error) {
							if (sessions.list.getSnapshot().byId[sessionId] !== void 0) return { published: true };
							return {
								published: false,
								message: error instanceof Error ? error.message : String(error)
							};
						}
					},
					selectDestination: async (sessionId, selection) => {
						try {
							const result = await remote.session.selectModel({
								sessionId,
								...selection
							});
							return result.ok ? { ok: true } : {
								ok: false,
								message: result.error.message
							};
						} catch (error) {
							return {
								ok: false,
								message: error instanceof Error ? error.message : String(error)
							};
						}
					},
					openDestination: async (sessionId) => {
						try {
							this.ctx.uiWorkspace.openSession(sessionId);
							return { ok: true };
						} catch (error) {
							return {
								ok: false,
								message: error instanceof Error ? error.message : String(error)
							};
						}
					}
				};
			}
			emit() {
				this.snapshot = { pending: this.pending };
				for (const listener of [...this.listeners]) listener();
			}
			suppressSelection(sessionId, selection) {
				if (selection === void 0) return;
				const observed = this.observed.get(sessionId);
				if (observed !== void 0) observed.suppressed = selection;
			}
			dispose() {
				if (this.disposed) return;
				this.disposed = true;
				for (const observed of this.observed.values()) observed.unsubscribe();
				this.observed.clear();
				this.queued.length = 0;
				for (const unsubscribe of this.unsubscribers.splice(0)) unsubscribe();
				this.listeners.clear();
			}
		};
		//#endregion
		//#region \0dsh-css:C:\Users\liaoz\Documents\interests\development\dsh-plugins\dsh-acp-adapter\src\client\ui\CrossBackendModal.module.css.mjs
		const css$8 = ".M61l6G_content{overflow-wrap:anywhere;min-width:0;max-height:min(70vh,560px);overflow-y:auto}.M61l6G_dialog{pointer-events:auto;max-width:min(560px,100vw - 32px)}.M61l6G_error{white-space:pre-wrap;overflow-wrap:anywhere;color:var(--dsw-alias-state-error-primary);margin:0;font-size:14px;font-weight:400;line-height:22px}.M61l6G_diagnostic{overflow-wrap:anywhere;white-space:pre-wrap;max-height:180px;color:var(--dsw-alias-label-secondary);margin:0;font-size:12px;line-height:18px;overflow:auto}.M61l6G_footer{pointer-events:auto;justify-content:flex-end;gap:8px;display:flex}";
		const tagId$8 = "@zaimokuza/dsh-acp-adapter/CrossBackendModal.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$8) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@zaimokuza/dsh-acp-adapter";
			tag.dataset.pluginCss = tagId$8;
			tag.textContent = css$8;
			document.head.appendChild(tag);
		}
		var CrossBackendModal_module_css_default = {
			"content": "M61l6G_content",
			"diagnostic": "M61l6G_diagnostic",
			"dialog": "M61l6G_dialog",
			"error": "M61l6G_error",
			"footer": "M61l6G_footer"
		};
		//#endregion
		//#region src/client/ui/CrossBackendModal.ts
		function CrossBackendModal({ coordinator, t }) {
			const [diagnosticsOpen, setDiagnosticsOpen] = (0, react.useState)(false);
			const pending = (0, react.useSyncExternalStore)((listener) => coordinator.subscribe(listener), () => coordinator.getSnapshot(), () => coordinator.getSnapshot()).pending;
			(0, react.useEffect)(() => {
				setDiagnosticsOpen(false);
			}, [pending?.ticket.key]);
			if (pending === null) return null;
			const source = pending.ticket.sourceSelection;
			const target = pending.ticket.targetSelection;
			const description = source === void 0 ? t("crossBackendExistingHistory") : `${t("crossBackendFromTo", {
				source: `${source.provider} · ${source.model}`,
				target: `${target.provider} · ${target.model}`
			})} ${t("crossBackendDescription")}`;
			const error = pending.failure !== null ? t({
				"restore-source": "crossBackendFailureRestore",
				"create-destination": "crossBackendFailureCreate",
				"select-destination": "crossBackendFailureSelect",
				"open-destination": "crossBackendFailureOpen",
				completed: "crossBackendFailureUnknown"
			}[pending.failure.phase]) : pending.blockingReason === "no-location" ? t("crossBackendNoLocation") : null;
			return (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open: true,
				onClose: () => {
					coordinator.cancel();
				},
				title: t("crossBackendTitle"),
				description,
				closeLabel: t("crossBackendCancel"),
				backdropBlur: false,
				...CrossBackendModal_module_css_default.dialog === void 0 ? {} : { className: CrossBackendModal_module_css_default.dialog },
				...CrossBackendModal_module_css_default.content === void 0 ? {} : { contentClassName: CrossBackendModal_module_css_default.content },
				footer: (0, react.createElement)("div", { className: CrossBackendModal_module_css_default.footer }, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "outline",
					disabled: pending.busy,
					onClick: () => {
						coordinator.cancel();
					}
				}, t("crossBackendCancel")), (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "primary",
					disabled: pending.busy || !pending.confirmable,
					onClick: () => {
						coordinator.confirm();
					}
				}, pending.busy ? t("crossBackendWorking") : t("crossBackendContinue")))
			}, error === null ? null : (0, react.createElement)("div", null, (0, react.createElement)("p", {
				className: CrossBackendModal_module_css_default.error,
				role: "alert"
			}, error), pending.failure === null ? null : (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.DisclosureRow, {
				icon: (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.IconInfoOutlineMedium),
				title: t("crossBackendDiagnostics"),
				open: diagnosticsOpen,
				expandable: true,
				onToggle: () => setDiagnosticsOpen((value) => !value)
			}, (0, react.createElement)("pre", { className: CrossBackendModal_module_css_default.diagnostic }, `${pending.failure.phase}\n${pending.failure.message}`))));
		}
		//#endregion
		//#region \0dsh-css:C:\Users\liaoz\Documents\interests\development\dsh-plugins\dsh-acp-adapter\src\client\ui\AcpOutcomeToast.module.css.mjs
		const css$7 = "[role=alert]:has(.LatiWa_sourceSessionToast){overflow-wrap:anywhere}";
		const tagId$7 = "@zaimokuza/dsh-acp-adapter/AcpOutcomeToast.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$7) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@zaimokuza/dsh-acp-adapter";
			tag.dataset.pluginCss = tagId$7;
			tag.textContent = css$7;
			document.head.appendChild(tag);
		}
		var AcpOutcomeToast_module_css_default = { "sourceSessionToast": "LatiWa_sourceSessionToast" };
		//#endregion
		//#region src/client/ui/AcpOutcomeToast.ts
		const copy = {
			saved: "toastProfileSaved",
			"save-failed": "toastProfileSaveFailed",
			deleted: "toastProfileDeleted",
			"delete-failed": "toastProfileDeleteFailed",
			"session-option-failed": "actionSaveFailed",
			"tool-approval-failed": "toolApprovalChangeFailed"
		};
		function AcpOutcomeToast({ feedback, t }) {
			const snapshot = (0, react.useSyncExternalStore)(feedback.subscribe, feedback.getSnapshot, feedback.getSnapshot);
			if (snapshot === null) return null;
			const success = snapshot.outcome === "saved" || snapshot.outcome === "deleted";
			const message = snapshot.outcome === "delegated-question-unavailable" ? snapshot.message : t(copy[snapshot.outcome], snapshot.outcome === "session-option-failed" ? { reference: "" } : void 0);
			const source = snapshot.sourceSession;
			const sourceLabel = source?.title ?? source?.id;
			const sessionLabel = snapshot.outcome === "delegated-question-unavailable" && source?.title != null && source.title !== source.id ? `${source.title} (${source.id})` : sourceLabel;
			return (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Toast, {
				key: `acp-outcome-${snapshot.sequence}`,
				text: snapshot.sourceSession === void 0 ? message : t("toastSessionOutcome", {
					message,
					session: sessionLabel
				}),
				...success ? { tone: "success" } : { icon: (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.IconWarningOutlineRegular, { className: snapshot.sourceSession === void 0 ? void 0 : AcpOutcomeToast_module_css_default.sourceSessionToast }) },
				onDone: () => feedback.dismiss(snapshot.sequence)
			});
		}
		//#endregion
		//#region src/client/data/recovery-stream.ts
		/** Current recovery facts; reconnect replaces the baseline rather than replaying history. */
		function recoveryStream(remote, factory, sessionId, changed, failed) {
			return new _deepseek_ai_dsh_api_gateway_client.RemoteSnapshotStream(factory.$stream({
				name: "ACP recovery facts",
				open: (signal) => remote.recoveryFollow(sessionId, signal),
				ended: () => /* @__PURE__ */ new Error("ACP recovery stream ended"),
				carrierFailed: (error) => failed(error, "carrier")
			}), {
				name: "ACP recovery facts",
				isSnapshot: (frame) => frame.type === "opened",
				replace: (frame) => changed(frame.snapshot),
				update: (frame) => changed(frame.snapshot),
				failed: (error) => failed(error, "terminal")
			});
		}
		const recoveryRetryDelays = [
			250,
			500,
			1e3,
			2e3,
			4e3,
			8e3
		];
		const recoveryHealthyResetMs = 3e4;
		const stableRecoveryErrorCodes = /* @__PURE__ */ new Set([
			"dsh-acp/config",
			"dsh-acp/not-installed",
			"dsh-acp/auth-required",
			"dsh-acp/protocol-incompatible",
			"dsh-acp/user-rejected",
			"gateway/bad-request"
		]);
		function isStableRecoveryError(error) {
			return typeof error === "object" && error !== null && "code" in error && typeof error.code === "string" && stableRecoveryErrorCodes.has(error.code);
		}
		/** Reopen terminally failed consumers only after the prior snapshot stream is quiescent. */
		function recoveringRecoveryStream(remote, factory, sessionId, changed, stateChanged) {
			let stopped = false;
			let started = false;
			let current;
			let retryTimer;
			let retiring = Promise.resolve();
			let attempt = 0;
			let connectedAt;
			const startNext = () => {
				if (stopped) return;
				connectedAt = void 0;
				let stream;
				stream = recoveryStream(remote, factory, sessionId, (snapshot) => {
					if (stopped || current !== stream) return;
					connectedAt ??= Date.now();
					stateChanged("connected");
					changed(snapshot);
				}, (error, source) => {
					if (stopped || current !== stream) return;
					const stable = isStableRecoveryError(error);
					if (source === "carrier" && !stable) {
						stateChanged("reconnecting", error);
						return;
					}
					current = void 0;
					stateChanged(stable ? "unavailable" : "reconnecting", error);
					const close = stream.dispose().catch(() => {});
					retiring = close;
					close.then(() => {
						if (stopped) return;
						if (stable) {
							stateChanged("unavailable", error, true);
							return;
						}
						if (connectedAt !== void 0 && Date.now() - connectedAt >= recoveryHealthyResetMs) attempt = 0;
						const delay = recoveryRetryDelays[Math.min(attempt, recoveryRetryDelays.length - 1)];
						attempt++;
						retryTimer = setTimeout(() => {
							retryTimer = void 0;
							startNext();
						}, delay);
					});
				});
				current = stream;
				stream.start();
			};
			return {
				start() {
					if (started || stopped) return;
					started = true;
					startNext();
				},
				async dispose() {
					if (stopped) return;
					stopped = true;
					if (retryTimer !== void 0) {
						clearTimeout(retryTimer);
						retryTimer = void 0;
					}
					const stream = current;
					current = void 0;
					if (stream !== void 0) await stream.dispose();
					await retiring;
				}
			};
		}
		//#endregion
		//#region \0dsh-css:C:\Users\liaoz\Documents\interests\development\dsh-plugins\dsh-acp-adapter\src\client\ui\AcpRecoveryDock.module.css.mjs
		const css$6 = ".nOktLG_dock{box-sizing:border-box;width:calc(100% - var(--dsh-composer-side-clearance) - var(--dsh-composer-side-clearance) - var(--dsh-composer-dock-inset) - var(--dsh-composer-dock-inset) - var(--dsh-composer-dock-inset) - var(--dsh-composer-dock-inset));max-width:calc(var(--dsh-composer-card-max-width) - var(--dsh-composer-dock-inset) - var(--dsh-composer-dock-inset) - var(--dsh-composer-dock-inset) - var(--dsh-composer-dock-inset));flex:none;min-width:0;margin:0 auto 8px}.nOktLG_surface{--dsw-elevation-stroke-color:var(--dsw-alias-state-warn-secondary);border-radius:var(--dsw-radius-lg);background:var(--dsw-specific-input-major);min-width:0;color:var(--dsw-alias-label-primary);box-shadow:var(--dsw-elevation-soft);border:0;align-items:center;gap:10px;padding:9px 12px;display:flex}.nOktLG_summaryIcon{width:18px;height:18px;color:var(--dsw-alias-state-warn-primary);flex:none;place-items:center;display:grid}.nOktLG_summaryText{overflow-wrap:anywhere;flex:1;min-width:0;font-size:13px;line-height:18px}.nOktLG_localStatus{color:var(--dsw-alias-label-secondary);box-shadow:none;background:0 0;justify-content:center;padding:4px 0;font-size:12px;line-height:18px}.nOktLG_dialog{width:min(560px,100%);max-height:100%}.nOktLG_content{overflow-wrap:anywhere;min-height:0;overflow-y:auto}.nOktLG_reason,.nOktLG_preserved{margin:0;font-size:13px;line-height:20px}.nOktLG_reason{color:var(--dsw-alias-label-primary)}.nOktLG_preserved{color:var(--dsw-alias-label-secondary);margin-top:8px}.nOktLG_choices{flex-direction:column;gap:12px;margin-top:16px;display:flex}.nOktLG_choice{border-top:.5px solid var(--dsw-alias-border-l1);justify-content:space-between;align-items:center;gap:12px;min-width:0;padding-top:10px;display:flex}.nOktLG_choiceCopy{flex:1;min-width:0}.nOktLG_choiceLabel,.nOktLG_choiceExplanation{overflow-wrap:anywhere;margin:0}.nOktLG_choiceLabel{color:var(--dsw-alias-label-primary);font-size:13px;font-weight:500;line-height:18px}.nOktLG_choiceExplanation{color:var(--dsw-alias-label-secondary);margin-top:2px;font-size:12px;line-height:18px}.nOktLG_footer{pointer-events:auto;justify-content:flex-end;gap:8px;display:flex}.nOktLG_diagnostics{margin-top:12px}.nOktLG_raw{overflow-wrap:anywhere;white-space:pre-wrap;word-break:break-word;border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-layer-1);max-height:180px;color:var(--dsw-alias-label-secondary);padding:10px;font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;overflow:auto}.nOktLG_error{color:var(--dsw-alias-state-error-primary);overflow-wrap:anywhere;margin:8px 0 0}@media (width<=480px){.nOktLG_surface{align-items:flex-start}.nOktLG_choice{flex-direction:column;align-items:flex-start}}";
		const tagId$6 = "@zaimokuza/dsh-acp-adapter/AcpRecoveryDock.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$6) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@zaimokuza/dsh-acp-adapter";
			tag.dataset.pluginCss = tagId$6;
			tag.textContent = css$6;
			document.head.appendChild(tag);
		}
		var AcpRecoveryDock_module_css_default = {
			"choice": "nOktLG_choice",
			"choiceCopy": "nOktLG_choiceCopy",
			"choiceExplanation": "nOktLG_choiceExplanation",
			"choiceLabel": "nOktLG_choiceLabel",
			"choices": "nOktLG_choices",
			"content": "nOktLG_content",
			"diagnostics": "nOktLG_diagnostics",
			"dialog": "nOktLG_dialog",
			"dock": "nOktLG_dock",
			"error": "nOktLG_error",
			"footer": "nOktLG_footer",
			"localStatus": "nOktLG_localStatus",
			"preserved": "nOktLG_preserved",
			"raw": "nOktLG_raw",
			"reason": "nOktLG_reason",
			"summaryIcon": "nOktLG_summaryIcon",
			"summaryText": "nOktLG_summaryText",
			"surface": "nOktLG_surface"
		};
		//#endregion
		//#region src/client/ui/AcpRecoveryDock.ts
		function providerOf$1(selection) {
			return typeof selection?.provider === "string" ? selection.provider : void 0;
		}
		/** The stock modelSelection projection is deliberately read-only here. */
		function projectionIsAcp(value, ownsRoute) {
			if (typeof value !== "object" || value === null) return false;
			const record = value;
			return ownsRoute(providerOf$1(record.lastUsed)) || ownsRoute(providerOf$1(record.next));
		}
		function recoveryText(t, recovery) {
			return t({
				healthy: "recoveryGeneric",
				"reconnect-required": "recoveryReconnectRequired",
				"outcome-unknown": "recoveryOutcomeUnknown",
				"reconciliation-required": "recoveryHistoryMismatch",
				"session-lost": "recoverySessionLost",
				"local-history-damaged": "recoveryHistoryDamaged",
				"resumed-unverified": "recoveryReconnectRequired"
			}[recovery.kind]);
		}
		/** Temporary settlement is shown only while the durable recovery outcome is healthy. */
		function localSettlementText(t, recovery) {
			if (recovery.kind !== "healthy" || recovery.localStatus === void 0) return null;
			return t({
				"finishing-tools": "recoveryFinishingTools",
				"saving-results": "recoverySavingResults",
				"storage-error": "recoveryStorageError"
			}[recovery.localStatus]);
		}
		function visibleRecovery(view) {
			return view.kind === "healthy" && view.localStatus === void 0 ? null : view;
		}
		/** Publish the recovery view returned by the completed action without a second snapshot read. */
		function publishRecoveryActionResult(result, isCurrent, publish) {
			if (result === void 0 || !isCurrent()) return false;
			publish(result);
			return true;
		}
		function recoveryChoice(action, variant, label, explanation, busyLabel, busy, busyAction, run) {
			return (0, react.createElement)("div", { className: AcpRecoveryDock_module_css_default.choice }, (0, react.createElement)("div", { className: AcpRecoveryDock_module_css_default.choiceCopy }, (0, react.createElement)("p", { className: AcpRecoveryDock_module_css_default.choiceLabel }, label), (0, react.createElement)("p", { className: AcpRecoveryDock_module_css_default.choiceExplanation }, explanation)), (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				variant,
				disabled: busy,
				onClick: run
			}, busyAction === action ? busyLabel : label));
		}
		function AcpRecoveryDock({ sessionId, useSession, useProjection, useAccess, useSessions, useWorkspaces, useRemoteAccess, useWorkspaceAccess, t, remote, streamFactory, createNewSession, ownsRoute, sessionAccessSource }) {
			const reconnectAllowed = useAccess("dshAcp/retryOriginal");
			const rebindAllowed = useAccess("dshAcp/rebindRecoveryBlank");
			const destination = resolveCrossBackendLocation(sessionId, useWorkspaces((snapshot) => snapshot.items), useSessions((snapshot) => snapshot.byId[sessionId]?.cwd));
			const globalCreateAllowed = useRemoteAccess("session/create");
			const workspaceCreateAllowed = useWorkspaceAccess(destination?.workspaceId ?? "", "session/create");
			const createAllowed = destination !== void 0 && (destination.workspaceId === void 0 ? globalCreateAllowed : workspaceCreateAllowed);
			const creationAccess = (0, react.useRef)(createAllowed);
			creationAccess.current = createAllowed;
			const lifecycleKey = useSession((snapshot) => [
				snapshot.openState,
				snapshot.running,
				snapshot.promptAttempted,
				snapshot.lastAgentError ?? ""
			].join("|"));
			const projection = useProjection("modelSelection");
			const projectionRecord = typeof projection === "object" && projection !== null ? projection : void 0;
			const projectionProviderKey = `${providerOf$1(projectionRecord?.lastUsed) ?? ""}|${providerOf$1(projectionRecord?.next) ?? ""}`;
			const [recovery, setRecovery] = (0, react.useState)(null);
			const [open, setOpen] = (0, react.useState)(false);
			const [busyAction, setBusyAction] = (0, react.useState)(null);
			const [actionError, setActionError] = (0, react.useState)(null);
			const [diagnosticsOpen, setDiagnosticsOpen] = (0, react.useState)(false);
			const [unavailable, setUnavailable] = (0, react.useState)(false);
			const [reconnecting, setReconnecting] = (0, react.useState)(false);
			const [recoveryRefreshReady, setRecoveryRefreshReady] = (0, react.useState)(false);
			const [retry, setRetry] = (0, react.useState)(0);
			const epoch = (0, react.useRef)(0);
			const inFlight = (0, react.useRef)(null);
			const activeSession = (0, react.useRef)(sessionId);
			activeSession.current = sessionId;
			(0, react.useEffect)(() => {
				const currentEpoch = ++epoch.current;
				let cancelled = false;
				setOpen(false);
				if (inFlight.current?.sessionId === sessionId) setBusyAction(inFlight.current.action);
				else setBusyAction(null);
				setActionError(null);
				setDiagnosticsOpen(false);
				setUnavailable(false);
				setReconnecting(false);
				setRecoveryRefreshReady(false);
				setRecovery(null);
				if (!projectionIsAcp(projection, ownsRoute)) return () => {
					cancelled = true;
				};
				const isCurrent = () => !cancelled && activeSession.current === sessionId && currentEpoch === epoch.current;
				const stream = recoveringRecoveryStream(remote, streamFactory, sessionId, (snapshot) => {
					if (!isCurrent()) return;
					setRecovery(visibleRecovery(snapshot));
				}, (state, _error, refreshReady) => {
					if (!isCurrent()) return;
					setReconnecting(state === "reconnecting");
					setUnavailable(state === "unavailable");
					setRecoveryRefreshReady(refreshReady === true);
					if (state !== "connected") setRecovery(null);
				});
				stream.start();
				return () => {
					cancelled = true;
					++epoch.current;
					stream.dispose();
				};
			}, [
				lifecycleKey,
				ownsRoute,
				projectionProviderKey,
				remote,
				sessionId,
				streamFactory,
				retry
			]);
			if (!projectionIsAcp(projection, ownsRoute)) return null;
			if (unavailable) return (0, react.createElement)("div", {
				className: AcpRecoveryDock_module_css_default.dock,
				role: "status"
			}, (0, react.createElement)("div", { className: AcpRecoveryDock_module_css_default.surface }, (0, react.createElement)("span", {
				className: AcpRecoveryDock_module_css_default.summaryIcon,
				"aria-hidden": true
			}, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.IconWarningTriangleOutlineRegular)), (0, react.createElement)("span", { className: AcpRecoveryDock_module_css_default.summaryText }, t("recoveryUnavailable")), (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				variant: "outline",
				disabled: !recoveryRefreshReady,
				onClick: () => setRetry((value) => value + 1)
			}, t("activity.detailRetry"))));
			if (reconnecting) return (0, react.createElement)("div", {
				className: AcpRecoveryDock_module_css_default.dock,
				role: "status"
			}, (0, react.createElement)("div", { className: AcpRecoveryDock_module_css_default.surface }, (0, react.createElement)("span", {
				className: AcpRecoveryDock_module_css_default.summaryIcon,
				"aria-hidden": true
			}, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.IconWarningTriangleOutlineRegular)), (0, react.createElement)("span", { className: AcpRecoveryDock_module_css_default.summaryText }, t("recoveryReconnecting"))));
			if (recovery === null) return null;
			const localStatus = localSettlementText(t, recovery);
			if (localStatus !== null) return (0, react.createElement)("div", {
				className: AcpRecoveryDock_module_css_default.dock,
				role: "status"
			}, (0, react.createElement)("div", { className: `${AcpRecoveryDock_module_css_default.surface} ${AcpRecoveryDock_module_css_default.localStatus}` }, localStatus));
			const busy = busyAction !== null;
			const run = async (actionName, action) => {
				if (inFlight.current?.sessionId === sessionId || activeSession.current !== sessionId) return;
				if (actionName === "new-session" && !creationAccess.current) return;
				const endpoint = actionName === "reconnect" ? "dshAcp/retryOriginal" : actionName === "rebind" ? "dshAcp/rebindRecoveryBlank" : null;
				if (endpoint !== null && sessionAccessSource(sessionId, endpoint)?.getSnapshot() !== true) return;
				const operation = {
					sessionId,
					action: actionName,
					token: Symbol(actionName)
				};
				const actionEpoch = epoch.current;
				inFlight.current = operation;
				setBusyAction(actionName);
				setActionError(null);
				try {
					publishRecoveryActionResult(await action(), () => inFlight.current?.token === operation.token && activeSession.current === sessionId && actionEpoch === epoch.current, (snapshot) => {
						setUnavailable(false);
						setRecovery(visibleRecovery(snapshot));
					});
				} catch (error) {
					if (inFlight.current?.token === operation.token && activeSession.current === sessionId) setActionError(error instanceof Error ? error.message : String(error));
				} finally {
					if (inFlight.current?.token === operation.token) {
						inFlight.current = null;
						if (activeSession.current === sessionId) setBusyAction(null);
					}
				}
			};
			const detail = [
				recovery.kind,
				recovery.cause,
				recovery.detail,
				actionError
			].filter((part) => typeof part === "string" && part.length > 0).join("\n\n");
			return (0, react.createElement)("div", {
				className: AcpRecoveryDock_module_css_default.dock,
				role: "status"
			}, (0, react.createElement)("div", { className: AcpRecoveryDock_module_css_default.surface }, (0, react.createElement)("span", {
				className: AcpRecoveryDock_module_css_default.summaryIcon,
				"aria-hidden": true
			}, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.IconWarningTriangleOutlineRegular)), (0, react.createElement)("span", { className: AcpRecoveryDock_module_css_default.summaryText }, recoveryText(t, recovery)), (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				variant: "outline",
				disabled: busy,
				onClick: () => {
					setDiagnosticsOpen(false);
					setOpen(true);
				}
			}, t("recoveryDetails"))), (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Modal, {
				open,
				onClose: () => {
					if (!busy && inFlight.current?.sessionId !== sessionId) {
						setOpen(false);
						setDiagnosticsOpen(false);
					}
				},
				title: t("recoveryTitle"),
				description: t("recoveryChoiceHelp"),
				closeLabel: t("recoveryClose"),
				backdropBlur: false,
				...AcpRecoveryDock_module_css_default.dialog === void 0 ? {} : { className: AcpRecoveryDock_module_css_default.dialog },
				...AcpRecoveryDock_module_css_default.content === void 0 ? {} : { contentClassName: AcpRecoveryDock_module_css_default.content },
				footer: (0, react.createElement)("div", { className: AcpRecoveryDock_module_css_default.footer }, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "outline",
					disabled: busy,
					onClick: () => {
						if (inFlight.current?.sessionId === sessionId) return;
						setOpen(false);
						setDiagnosticsOpen(false);
					}
				}, t("recoveryClose")))
			}, (0, react.createElement)("p", { className: AcpRecoveryDock_module_css_default.reason }, recoveryText(t, recovery)), (0, react.createElement)("p", { className: AcpRecoveryDock_module_css_default.preserved }, t("recoveryHistoryPreserved")), (0, react.createElement)("div", { className: AcpRecoveryDock_module_css_default.choices }, recoveryChoice("reconnect", "outline", t("recoveryReconnect"), t("recoveryReconnectExplanation"), t("recoveryBusy"), busy || !reconnectAllowed, busyAction, () => {
				run("reconnect", async () => {
					const result = await remote.retryOriginal(sessionId);
					if (!result.ok) throw new Error(result.error.message);
					return result.value;
				});
			}), recoveryChoice("rebind", "outline", t("recoveryRebind"), t("recoveryRebindExplanation"), t("recoveryBusy"), busy || !rebindAllowed, busyAction, () => {
				run("rebind", async () => {
					const result = await remote.rebindRecoveryBlank(sessionId);
					if (!result.ok) throw new Error(result.error.message);
					return result.value;
				});
			}), recoveryChoice("new-session", "primary", t("recoveryNew"), t("recoveryNewExplanation"), t("recoveryBusy"), busy || !createAllowed, busyAction, () => {
				run("new-session", () => createNewSession(sessionId));
			})), (0, react.createElement)("div", { className: AcpRecoveryDock_module_css_default.diagnostics }, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.DisclosureRow, {
				icon: (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.IconWarningTriangleOutlineRegular),
				title: t("recoveryDiagnostics"),
				open: diagnosticsOpen,
				expandable: detail !== "",
				onToggle: () => setDiagnosticsOpen((value) => !value)
			}, detail === "" ? null : (0, react.createElement)("pre", { className: AcpRecoveryDock_module_css_default.raw }, detail))), actionError === null ? null : (0, react.createElement)("p", {
				className: AcpRecoveryDock_module_css_default.error,
				role: "alert"
			}, t("recoveryActionFailed"))));
		}
		//#endregion
		//#region \0dsh-css:C:\Users\liaoz\Documents\interests\development\dsh-plugins\dsh-acp-adapter\src\client\ui\AcpAgentControl.module.css.mjs
		const css$5 = ".dALlEa_trigger{border-radius:var(--dsw-radius-xl);corner-shape:round;min-width:0;max-width:220px;height:28px;color:var(--dsw-alias-label-secondary);font:inherit;cursor:pointer;background:0 0;border:none;outline:none;align-items:center;gap:4px;padding:0 4px 0 8px;font-size:13px;font-weight:500;line-height:20px;display:inline-flex}.dALlEa_retryTrigger{white-space:normal;overflow-wrap:anywhere;text-align:left;width:fit-content;max-width:min(320px,100vw - 24px);height:auto;min-height:28px;padding:4px 8px}.dALlEa_trigger:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}.dALlEa_trigger:focus-visible{box-shadow:0 0 0 2px var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary))}.dALlEa_trigger:disabled{color:var(--dsw-alias-label-dimmed);cursor:default}.dALlEa_triggerLabel{text-overflow:ellipsis;white-space:nowrap;min-width:0;overflow:hidden}.dALlEa_chevron{color:var(--dsw-alias-label-caption);transition:transform var(--ds-transition-duration-fast) var(--ds-ease-in-out);flex:none}.dALlEa_chevronOpen{transform:rotate(180deg)}@media (prefers-reduced-motion:reduce){.dALlEa_chevron{transition:none}}.dALlEa_settingRow{align-items:center;gap:12px;width:100%;display:flex}.dALlEa_settingName,.dALlEa_currentValue{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.dALlEa_settingName{flex:1}.dALlEa_currentValue{max-width:50%;color:var(--dsw-alias-label-caption)}.dALlEa_settingRow>svg{flex-shrink:0}.dALlEa_menuList{width:min(348px,65vw)}.dALlEa_menuAnchor{min-width:0;max-width:100%;display:inline-flex}.dALlEa_choice{white-space:normal;flex-direction:column;display:flex}.dALlEa_choiceDescription{color:var(--dsw-alias-label-caption);font-size:12px}";
		const tagId$5 = "@zaimokuza/dsh-acp-adapter/AcpAgentControl.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$5) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@zaimokuza/dsh-acp-adapter";
			tag.dataset.pluginCss = tagId$5;
			tag.textContent = css$5;
			document.head.appendChild(tag);
		}
		var AcpAgentControl_module_css_default = {
			"chevron": "dALlEa_chevron",
			"chevronOpen": "dALlEa_chevronOpen",
			"choice": "dALlEa_choice",
			"choiceDescription": "dALlEa_choiceDescription",
			"currentValue": "dALlEa_currentValue",
			"menuAnchor": "dALlEa_menuAnchor",
			"menuList": "dALlEa_menuList",
			"retryTrigger": "dALlEa_retryTrigger",
			"settingName": "dALlEa_settingName",
			"settingRow": "dALlEa_settingRow",
			"trigger": "dALlEa_trigger",
			"triggerLabel": "dALlEa_triggerLabel"
		};
		//#endregion
		//#region src/client/ui/AgentSessionMenu.ts
		/** One native menu for main sessions, member modes and batch modes.
		* Callers supply visible choices and write permissions; presentation never
		* derives authority from whether the menu is shown in a team or composer.
		*/
		function AgentSessionMenu({ groups, footer, label, t, open, disabled, side = "top", align = "start", onOpenChange, onSelect }) {
			const [pane, setPane] = (0, react.useState)(null);
			const anchor = (0, react.useRef)(null);
			const firstContent = (0, react.useRef)(null);
			const group = groups.find((candidate) => candidate.id === pane);
			(0, react.useEffect)(() => {
				if (!open) setPane(null);
			}, [open]);
			(0, react.useLayoutEffect)(() => {
				if (!open) return;
				const first = firstContent.current?.closest("[role=menu]")?.querySelector("[role=menuitem]:not(:disabled)");
				if (first !== null && first !== void 0) (0, _deepseek_ai_dsh_client_ui_primitives.focusWithoutRing)(first);
			}, [open, group?.id]);
			const items = group === void 0 ? groups.map((item, index) => ({
				id: item.id,
				label: (0, react.createElement)("span", {
					className: AcpAgentControl_module_css_default.settingRow,
					ref: index === 0 ? firstContent : void 0,
					title: item.description ?? void 0
				}, (0, react.createElement)("span", { className: AcpAgentControl_module_css_default.settingName }, item.name), (0, react.createElement)("span", {
					className: AcpAgentControl_module_css_default.currentValue,
					title: item.current
				}, item.current), (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.IconChevronRightOutlineMedium, null)),
				disabled: item.choices.length === 0
			})) : [
				{
					id: "back",
					label: (0, react.createElement)("span", { ref: firstContent }, t("agentControlBack")),
					icon: (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.IconChevronLeftOutlineMedium, null)
				},
				{
					type: "label",
					id: "setting-title",
					text: group.name
				},
				...group.description ? [{
					type: "label",
					id: "setting-description",
					text: group.description
				}] : [],
				...group.choices.flatMap((choice, index) => [...choice.group !== void 0 && choice.group !== group.choices[index - 1]?.group ? [{
					type: "label",
					id: `group:${index}`,
					text: choice.group
				}] : [], {
					id: choice.id,
					disabled: choice.disabled,
					label: (0, react.createElement)("span", { className: AcpAgentControl_module_css_default.choice }, choice.label, choice.description ? (0, react.createElement)("span", { className: AcpAgentControl_module_css_default.choiceDescription }, choice.description) : null)
				}])
			];
			if (items.length === 0) items.push({
				id: "unavailable",
				label: (0, react.createElement)("span", null, t("agentControlUnavailable")),
				disabled: true
			});
			return (0, react.createElement)("span", {
				ref: anchor,
				className: AcpAgentControl_module_css_default.menuAnchor
			}, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
				open,
				portal: true,
				autoFocus: true,
				side,
				align,
				items,
				listClassName: AcpAgentControl_module_css_default.menuList,
				selectedId: group?.choices.find((choice) => choice.current)?.id,
				onClose: () => onOpenChange(false),
				onSelect: (id) => {
					if (id === "back") {
						setPane(null);
						return;
					}
					if (group === void 0) {
						if (groups.some((candidate) => candidate.id === id)) setPane(id);
						return;
					}
					const choice = group.choices.find((candidate) => candidate.id === id);
					if (choice === void 0 || choice.disabled || disabled) return;
					onOpenChange(false);
					onSelect(choice);
				},
				anchor: (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
					label: t("agentControlTooltip"),
					portal: true,
					side: "top",
					disabled: open,
					children: (0, react.createElement)("button", {
						type: "button",
						className: AcpAgentControl_module_css_default.trigger,
						disabled,
						"aria-haspopup": "menu",
						"aria-expanded": open,
						onClick: () => {
							setPane(null);
							onOpenChange(!open);
						}
					}, (0, react.createElement)("span", { className: AcpAgentControl_module_css_default.triggerLabel }, label), (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutlineMedium, { className: `${AcpAgentControl_module_css_default.chevron}${open ? ` ${AcpAgentControl_module_css_default.chevronOpen}` : ""}` }))
				}),
				...footer === void 0 || footer.length === 0 ? {} : { footer }
			}));
		}
		//#endregion
		//#region src/contract/config-options.ts
		/** Normalize ACP identifiers without changing the original value shown to users. */
		function normalizeAcpConfigOptionKey(value) {
			return value.trim().toLowerCase().replaceAll("-", "_");
		}
		/**
		* Model and reasoning controls remain owned by the stock DSH model picker.
		* ACP agents may spell their category/id with different casing or separators;
		* classification is normalized while the Agent-provided labels stay untouched.
		*/
		function isAcpModelOrReasoningOption(option) {
			const id = normalizeAcpConfigOptionKey(option.id);
			const category = option.category === void 0 || option.category === null ? "" : normalizeAcpConfigOptionKey(option.category);
			return category === "model" || id === "model" || category === "thought_level" || category === "reasoning_effort" || id === "thought_level" || id === "reasoning_effort";
		}
		//#endregion
		//#region src/contract/session-modes.ts
		function teamModeChoices(snapshot) {
			const option = snapshot.configOptions?.find((option) => normalizeAcpConfigOptionKey(option.id) === "mode" || normalizeAcpConfigOptionKey(option.category ?? "") === "mode");
			if (option !== void 0) {
				if (option.type !== "select") return [];
				return option.options.flatMap((entry) => "options" in entry ? entry.options : [entry]).map((value) => ({
					id: value.value,
					name: value.name,
					label: `${option.name}: ${value.name}`,
					current: value.value === option.currentValue,
					write: {
						kind: "config",
						id: option.id,
						value: value.value
					}
				}));
			}
			return (snapshot.modes ?? []).map((mode) => ({
				id: mode.id,
				name: mode.name,
				label: mode.name,
				current: mode.id === snapshot.currentModeId,
				write: {
					kind: "mode",
					id: mode.id
				}
			}));
		}
		/** Display the effective ACP mode, including an uncommitted next-run choice. */
		function teamModeLabel(snapshot, fallback) {
			const choices = teamModeChoices(snapshot);
			const selected = (snapshot.pendingModeId === void 0 || snapshot.pendingModeId === null ? void 0 : choices.find((choice) => choice.id === snapshot.pendingModeId)) ?? choices.find((choice) => choice.current);
			if (selected !== void 0) return selected.name;
			const modeOption = snapshot.configOptions?.find((option) => normalizeAcpConfigOptionKey(option.id) === "mode" || normalizeAcpConfigOptionKey(option.category ?? "") === "mode");
			if (modeOption?.type === "select" && modeOption.currentValue !== "") return modeOption.currentValue;
			return snapshot.currentModeId ?? fallback;
		}
		//#endregion
		//#region src/client/ui/agent-session-controls.ts
		function isModeConfigOption(option) {
			const id = option.id.trim().toLowerCase().replaceAll("-", "_");
			const category = option.category?.trim().toLowerCase().replaceAll("-", "_") ?? "";
			return id === "mode" || category === "mode";
		}
		/** Normalize ACP settings once; native Menu owns selection styling and keyboard navigation. */
		function agentControlMenuGroups(snapshot, t) {
			const groups = [];
			const disabled = !snapshot.editable || snapshot.freshness !== "live";
			if (!(snapshot.configOptions ?? []).some(isModeConfigOption) && (snapshot.modes?.length ?? 0) > 0) groups.push({
				kind: "mode",
				id: "mode",
				name: t("agentControlMode"),
				current: teamModeLabel(snapshot, t("agentControlDefault")),
				choices: (snapshot.modes ?? []).map((mode) => ({
					id: `mode:${mode.id}`,
					label: mode.name,
					current: mode.id === (snapshot.pendingModeId ?? snapshot.currentModeId),
					write: {
						kind: "mode",
						id: mode.id
					},
					disabled
				}))
			});
			for (const option of snapshot.configOptions ?? []) {
				if (isAcpModelOrReasoningOption(option)) continue;
				const choices = option.type === "boolean" ? [false, true].map((value) => ({
					id: `config:${option.id}:${value}`,
					label: t(value ? "agentControlOn" : "agentControlOff"),
					current: value === option.currentValue,
					write: {
						kind: "config",
						id: option.id,
						value
					},
					disabled
				})) : option.options.flatMap((entry) => ("value" in entry ? [entry] : entry.options).map((value) => ({
					id: `config:${option.id}:${value.value}`,
					label: value.name,
					...value.description == null ? {} : { description: value.description },
					..."group" in entry ? { group: entry.name } : {},
					current: value.value === (isModeConfigOption(option) ? snapshot.pendingModeId ?? option.currentValue : option.currentValue),
					write: {
						kind: "config",
						id: option.id,
						value: value.value
					},
					disabled
				})));
				groups.push({
					kind: isModeConfigOption(option) ? "mode" : "config",
					id: `config:${option.id}`,
					name: option.name,
					current: choices.find((choice) => choice.current)?.label ?? String(option.currentValue),
					...option.description == null ? {} : { description: option.description },
					choices
				});
			}
			return groups;
		}
		function toolApprovalPolicyGroup(snapshot, t) {
			const disabled = !snapshot.editable;
			const choices = ["auto", "ask"].map((policy) => ({
				id: `tool-approval:${policy}`,
				label: t(policy === "auto" ? "toolApprovalAuto" : "toolApprovalAsk"),
				current: snapshot.policy === policy,
				description: t(policy === "auto" ? "toolApprovalAutoDescription" : "toolApprovalAskDescription"),
				write: {
					kind: "tool-approval-policy",
					policy
				},
				disabled
			}));
			return {
				kind: "policy",
				id: "tool-approval-policy",
				name: t("toolApprovalSession"),
				current: t(snapshot.policy === "auto" ? "toolApprovalAuto" : "toolApprovalAsk"),
				description: snapshot.source === "lead" ? t("toolApprovalInherited") : t("toolApprovalScope"),
				choices
			};
		}
		function agentControlLabel(snapshot, t) {
			return `${t("agentControlTitle")} · ${teamModeLabel(snapshot, t("agentControlDefault"))}`;
		}
		/** Compact ACP token counts without falling back to an unqualified raw count. */
		function formatContextTokenCount(value) {
			const unit = value >= 1e6 ? "m" : "k";
			const scaled = value / (unit === "m" ? 1e6 : 1e3);
			const factor = 10 ** (scaled < 1 ? 3 : scaled < 100 ? 1 : 0);
			return `${String(Math.round(scaled * factor) / factor)}${unit}`;
		}
		function agentControlFooter(snapshot, t) {
			const footer = [];
			if (snapshot.contextUsage !== null) {
				footer.push({
					type: "label",
					id: "context-usage",
					text: t("agentContextUsage", {
						used: formatContextTokenCount(snapshot.contextUsage.used),
						size: formatContextTokenCount(snapshot.contextUsage.size),
						percent: snapshot.contextUsage.percent
					})
				});
				if (snapshot.contextUsage.cost !== null) footer.push({
					type: "label",
					id: "session-cost",
					text: t("agentSessionCost", {
						amount: snapshot.contextUsage.cost.amount,
						currency: snapshot.contextUsage.cost.currency
					})
				});
			}
			if (snapshot.freshness === "stale") footer.push({
				type: "label",
				id: "stale",
				text: t("agentStateStale")
			});
			return footer;
		}
		//#endregion
		//#region src/client/data/agent-session-stream.ts
		/** A current-state subscription; reconnection replaces the baseline rather than replaying history. */
		function agentSessionStream(remote, factory, sessionId, changed, unavailable) {
			return new _deepseek_ai_dsh_api_gateway_client.RemoteSnapshotStream(factory.$stream({
				name: "ACP Agent controls",
				open: (signal) => remote.agentSessionFollow(sessionId, signal),
				ended: () => /* @__PURE__ */ new Error("ACP Agent controls stream ended"),
				carrierFailed: unavailable
			}), {
				name: "ACP Agent controls",
				isSnapshot: (frame) => frame.type === "opened",
				replace: (frame) => changed(frame.snapshot),
				update: (frame) => changed(frame.snapshot),
				failed: unavailable
			});
		}
		//#endregion
		//#region src/client/data/tool-approval-policy-stream.ts
		/** Current policy subscription, including host-owned fresh ACP sessions. */
		function toolApprovalPolicyStream(remote, factory, sessionId, changed, unavailable) {
			return new _deepseek_ai_dsh_api_gateway_client.RemoteSnapshotStream(factory.$stream({
				name: "DSH tool approval policy",
				open: (signal) => remote.toolApprovalPolicyFollow(sessionId, signal),
				ended: () => /* @__PURE__ */ new Error("DSH tool approval policy stream ended"),
				carrierFailed: unavailable
			}), {
				name: "DSH tool approval policy",
				isSnapshot: (frame) => frame.type === "opened",
				replace: (frame) => changed(frame.snapshot),
				update: (frame) => changed(frame.snapshot),
				failed: unavailable
			});
		}
		//#endregion
		//#region src/client/ui/AcpAgentControl.ts
		function providerOf(value) {
			if (typeof value !== "object" || value === null) return void 0;
			const provider = value.provider;
			return typeof provider === "string" ? provider : void 0;
		}
		function snapshotIsAcp(value, ownsRoute, fallbackProvider) {
			if (typeof value !== "object" || value === null) return ownsRoute(fallbackProvider);
			const selection = value;
			const current = selection.next === void 0 ? selection.lastUsed : selection.next;
			return ownsRoute(current === null || current === void 0 ? selection.lastUsed == null ? fallbackProvider : void 0 : providerOf(current));
		}
		/** Small ACP-only control in DSH's native input-left extension point. */
		function AcpAgentControl({ sessionId, useProjection, useSession, useSessions, useAccess, t, remote, streamFactory, ownsRoute, getDefaultProvider, watchDefaultProvider, feedback, sessionAccessSource }) {
			const projection = useProjection("modelSelection");
			const sessionTitle = useSessions((sessions) => sessionId === void 0 ? void 0 : sessions.byId[sessionId]?.title);
			const running = useSession((state) => state.running);
			const optionWriteAllowed = useAccess("dshAcp/setAgentSessionOption");
			const policyWriteAllowed = useAccess("dshAcp/setToolApprovalPolicy");
			const [defaultProvider, setDefaultProvider] = (0, react.useState)();
			const [defaultGeneration, setDefaultGeneration] = (0, react.useState)(0);
			(0, react.useEffect)(() => watchDefaultProvider(() => {
				setDefaultProvider(void 0);
				setDefaultGeneration((value) => value + 1);
			}), [watchDefaultProvider]);
			(0, react.useEffect)(() => {
				let active = true;
				getDefaultProvider().then((provider) => {
					if (active) setDefaultProvider(provider);
				}).catch(() => {
					if (active) setDefaultProvider(void 0);
				});
				return () => {
					active = false;
				};
			}, [getDefaultProvider, defaultGeneration]);
			const isAcp = snapshotIsAcp(projection, ownsRoute, defaultProvider);
			const [snapshot, setSnapshot] = (0, react.useState)(null);
			const [policySnapshot, setPolicySnapshot] = (0, react.useState)(null);
			const [policyError, setPolicyError] = (0, react.useState)(null);
			const [policyStale, setPolicyStale] = (0, react.useState)(false);
			const [policyReadFailed, setPolicyReadFailed] = (0, react.useState)(false);
			const [open, setOpen] = (0, react.useState)(false);
			const [busy, setBusy] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)(null);
			const [readFailed, setReadFailed] = (0, react.useState)(false);
			const epoch = (0, react.useRef)(0);
			const [retry, setRetry] = (0, react.useState)(0);
			(0, react.useEffect)(() => {
				const current = ++epoch.current;
				setOpen(false);
				setBusy(false);
				setError(null);
				setReadFailed(false);
				setSnapshot(null);
				setPolicySnapshot(null);
				setPolicyError(null);
				setPolicyStale(false);
				setPolicyReadFailed(false);
				if (!isAcp || sessionId === void 0) return;
				const stream = agentSessionStream(remote, streamFactory, sessionId, (value) => {
					if (current !== epoch.current) return;
					setSnapshot(value);
					setError(null);
					setReadFailed(false);
				}, () => {
					if (current !== epoch.current) return;
					setSnapshot((value) => value === null ? null : {
						...value,
						editable: false,
						freshness: "stale"
					});
					setError(t("agentControlUnavailable"));
					setReadFailed(true);
				});
				stream.start();
				return () => {
					++epoch.current;
					stream.dispose();
				};
			}, [
				epoch,
				isAcp,
				remote,
				streamFactory,
				sessionId,
				t,
				retry
			]);
			const policyEpoch = (0, react.useRef)(0);
			(0, react.useEffect)(() => {
				const current = ++policyEpoch.current;
				if (!isAcp || sessionId === void 0) {
					setPolicySnapshot(null);
					setPolicyError(null);
					setPolicyStale(false);
					setPolicyReadFailed(false);
					return;
				}
				setPolicySnapshot(null);
				setPolicyError(null);
				setPolicyStale(false);
				setPolicyReadFailed(false);
				const stream = toolApprovalPolicyStream(remote, streamFactory, sessionId, (value) => {
					if (current !== policyEpoch.current || value.sessionId !== sessionId) return;
					setPolicySnapshot(value);
					setPolicyError(null);
					setPolicyStale(false);
					setPolicyReadFailed(false);
				}, () => {
					if (current !== policyEpoch.current) return;
					setPolicyError(t("toolApprovalUnavailable"));
					setPolicyStale(true);
					setPolicyReadFailed(true);
				});
				stream.start();
				return () => {
					++policyEpoch.current;
					stream.dispose();
				};
			}, [
				isAcp,
				remote,
				streamFactory,
				sessionId,
				t,
				retry
			]);
			if (!isAcp || snapshot !== null && snapshot.sessionId !== sessionId || policySnapshot !== null && policySnapshot.sessionId !== sessionId) return null;
			if (snapshot === null && policySnapshot === null) {
				if (policyError === null && error === null) return null;
				return (0, react.createElement)("button", {
					type: "button",
					className: `${AcpAgentControl_module_css_default.trigger} ${AcpAgentControl_module_css_default.retryTrigger}`,
					onClick: () => setRetry((value) => value + 1),
					title: t(policyError !== null ? "toolApprovalRetry" : "agentControlRetry")
				}, policyError ?? error);
			}
			const visibleSnapshot = snapshot === null ? null : {
				...snapshot,
				editable: snapshot.editable && !running && optionWriteAllowed
			};
			const label = snapshot === null ? t("toolApprovalSession") : agentControlLabel(snapshot, t);
			const groups = [...policySnapshot === null || policyStale ? [] : [toolApprovalPolicyGroup({
				...policySnapshot,
				editable: policySnapshot.editable && policyWriteAllowed
			}, t)], ...visibleSnapshot === null ? [] : agentControlMenuGroups(visibleSnapshot, t)];
			const footer = [...snapshot === null ? [] : agentControlFooter(snapshot, t)];
			if (groups.length === 0 && footer.length === 0 && snapshot?.note == null && error === null && policyError === null) return null;
			if (snapshot !== null && (running || !visibleSnapshot?.editable && snapshot.freshness === "live")) footer.push({
				type: "label",
				id: "read-only",
				text: t(running ? "agentControlRunning" : "agentControlReadOnly")
			});
			if (error !== null) footer.push({
				type: "label",
				id: "error",
				text: error
			});
			if (policyError !== null) footer.push({
				type: "label",
				id: "policy-error",
				text: policyError
			});
			const select = (item) => {
				if (sessionId === void 0) return;
				const current = epoch.current;
				const sourceSession = {
					id: sessionId,
					title: sessionTitle ?? null
				};
				setOpen(false);
				setBusy(true);
				if (item.write.kind === "tool-approval-policy") {
					if (policySnapshot === null || policyStale || !policySnapshot.editable || !policyWriteAllowed || sessionAccessSource(sessionId, "dshAcp/setToolApprovalPolicy")?.getSnapshot() !== true) {
						setBusy(false);
						return;
					}
					setPolicyError(null);
					remote.setToolApprovalPolicy(sessionId, { policy: item.write.policy }).then((result) => {
						if (result.ok) return;
						feedback.report("tool-approval-failed", current === epoch.current ? void 0 : sourceSession);
						if (current === epoch.current) setPolicyError(t("toolApprovalChangeFailed"));
					}).catch(() => {
						feedback.report("tool-approval-failed", current === epoch.current ? void 0 : sourceSession);
						if (current === epoch.current) setPolicyError(t("toolApprovalChangeFailed"));
					}).finally(() => {
						if (current === epoch.current) setBusy(false);
					});
					return;
				}
				if (snapshot === null || visibleSnapshot === null || !visibleSnapshot.editable || snapshot.freshness !== "live" || !optionWriteAllowed || sessionAccessSource(sessionId, "dshAcp/setAgentSessionOption")?.getSnapshot() !== true) {
					setBusy(false);
					return;
				}
				setError(null);
				remote.setAgentSessionOption(sessionId, item.write).then((result) => {
					if (result.ok) return;
					feedback.report("session-option-failed", current === epoch.current ? void 0 : sourceSession);
					if (current === epoch.current) setError(result.error.message);
				}).catch((reason) => {
					feedback.report("session-option-failed", current === epoch.current ? void 0 : sourceSession);
					if (current === epoch.current) setError(reason instanceof Error ? reason.message : String(reason));
				}).finally(() => {
					if (current === epoch.current) setBusy(false);
				});
			};
			return (0, react.createElement)(AgentSessionMenu, {
				groups,
				footer,
				label,
				t,
				open,
				disabled: busy,
				side: "top",
				onOpenChange: (value) => {
					if (value && (readFailed || policyReadFailed)) setRetry((current) => current + 1);
					setOpen(value);
				},
				onSelect: select
			});
		}
		//#endregion
		//#region \0dsh-css:C:\Users\liaoz\Documents\interests\development\dsh-plugins\dsh-acp-adapter\src\client\ui\AcpExternalSubagentComposer.module.css.mjs
		const css$4 = ".n561Za_frame{border:.5px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-lg);background:var(--dsw-alias-bg-layer-1);min-height:54px;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;flex-wrap:wrap;justify-content:center;align-items:center;gap:8px;margin:0 24px 20px;padding:10px 16px;font-size:13px;line-height:20px;display:flex}.n561Za_frame strong{color:var(--dsw-alias-label-primary);font-weight:500}";
		const tagId$4 = "@zaimokuza/dsh-acp-adapter/AcpExternalSubagentComposer.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$4) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@zaimokuza/dsh-acp-adapter";
			tag.dataset.pluginCss = tagId$4;
			tag.textContent = css$4;
			document.head.appendChild(tag);
		}
		var AcpExternalSubagentComposer_module_css_default = { "frame": "n561Za_frame" };
		//#endregion
		//#region src/client/ui/AcpExternalSubagentComposer.ts
		function selectExternalSubagentRecord(owner, records) {
			return owner.sessionId !== void 0 && owner.session?.subagent?.address.mode === "one-shot" && records.has(owner.sessionId) ? true : null;
		}
		/** Refresh only the narrow claim when native, Host-pushed ownership facts change. */
		function followExternalSubagentRecords(source, mount) {
			let key = "";
			let stopped = false;
			let unmount;
			const reconcile = () => {
				if (stopped) return;
				const ids = Object.entries(source.getSnapshot().projectionsBySession).filter(([, projection]) => projection.values.acpExecution?.externalSubagent === true).map(([id]) => id).sort();
				const next = JSON.stringify(ids);
				if (next === key) return;
				key = next;
				const previous = unmount;
				unmount = void 0;
				previous?.();
				unmount = ids.length === 0 ? void 0 : mount(new Set(ids));
			};
			const unsubscribe = source.subscribe(reconcile);
			try {
				reconcile();
			} catch (error) {
				stopped = true;
				unsubscribe();
				throw error;
			}
			return () => {
				if (stopped) return;
				stopped = true;
				unsubscribe();
				unmount?.();
				unmount = void 0;
			};
		}
		/** The external Agent owns its private history; this local record cannot accept input. */
		function AcpExternalSubagentComposer({ t }) {
			return (0, react.createElement)("div", {
				className: AcpExternalSubagentComposer_module_css_default.frame,
				role: "status",
				"data-acp-external-record-notice": ""
			}, (0, react.createElement)("strong", null, t("subagent.readOnlyTitle")), (0, react.createElement)("span", null, t("subagent.readOnlyBody")));
		}
		//#endregion
		//#region \0dsh-css:C:\Users\liaoz\Documents\interests\development\dsh-plugins\dsh-acp-adapter\src\client\ui\AcpTeamApprovals.module.css.mjs
		const css$3 = ".Dih1pa_card{box-sizing:border-box;width:min(var(--dsh-chat-content-width,960px), calc(100% - 24px));border:1px solid var(--dsw-alias-state-warn-secondary);border-radius:var(--dsw-radius-xl);background:var(--dsw-specific-input-major);min-width:0;color:var(--dsw-alias-label-primary);box-shadow:var(--dsw-shadow-lv2);--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2);margin:0 auto 8px;overflow:hidden}.Dih1pa_header{background:var(--dsw-alias-state-warn-tertiary);flex-wrap:wrap;align-items:center;gap:8px;padding:10px 16px;font-size:13px;line-height:18px;display:flex}.Dih1pa_header strong{overflow-wrap:anywhere;flex:1;min-width:100px;font-weight:500}.Dih1pa_icon{corner-shape:round;width:18px;height:18px;color:var(--dsw-alias-state-warn-primary);border:1px solid;border-radius:50%;place-items:center;display:grid}.Dih1pa_body{box-sizing:border-box;max-height:min(360px,40dvh);padding:0 16px 12px;overflow-y:auto}.Dih1pa_hint,.Dih1pa_status{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}.Dih1pa_members{margin:0;padding:0;list-style:none}.Dih1pa_member{border-top:.5px solid var(--dsw-alias-border-l1);min-width:0;padding:12px 0}.Dih1pa_memberHeader{flex-wrap:wrap;align-items:center;gap:8px;margin-bottom:6px;display:flex}.Dih1pa_name{overflow-wrap:anywhere;flex:1;min-width:80px;font-size:15px;font-weight:500;line-height:24px}.Dih1pa_actions{flex-wrap:wrap;justify-content:flex-end;align-items:center;gap:8px;display:flex}.Dih1pa_error{color:var(--dsw-alias-state-error-primary);margin:8px 16px}.Dih1pa_reason{white-space:pre-wrap;overflow-wrap:anywhere;color:var(--dsw-alias-label-primary);margin:0;font-family:inherit;font-size:15px;font-weight:500;line-height:24px}";
		const tagId$3 = "@zaimokuza/dsh-acp-adapter/AcpTeamApprovals.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$3) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@zaimokuza/dsh-acp-adapter";
			tag.dataset.pluginCss = tagId$3;
			tag.textContent = css$3;
			document.head.appendChild(tag);
		}
		var AcpTeamApprovals_module_css_default = {
			"actions": "Dih1pa_actions",
			"body": "Dih1pa_body",
			"card": "Dih1pa_card",
			"error": "Dih1pa_error",
			"header": "Dih1pa_header",
			"hint": "Dih1pa_hint",
			"icon": "Dih1pa_icon",
			"member": "Dih1pa_member",
			"memberHeader": "Dih1pa_memberHeader",
			"members": "Dih1pa_members",
			"name": "Dih1pa_name",
			"reason": "Dih1pa_reason",
			"status": "Dih1pa_status"
		};
		//#endregion
		//#region src/client/ui/team-approval-actions.ts
		/** Cached lineage only selects candidates; Host runtime ownership still authorizes every action. */
		function pendingChildCandidates(parent, summaries, snapshot, readOnly = /* @__PURE__ */ new Set()) {
			return [...snapshot].flatMap(([id, status]) => {
				if (id === parent || status.pendingInteraction === void 0 || readOnly.has(id)) return [];
				const visited = /* @__PURE__ */ new Set();
				let current = id;
				while (current !== void 0 && current !== parent) {
					if (visited.has(current) || readOnly.has(current)) return [];
					visited.add(current);
					const row = summaries[current];
					if (row?.origin !== "subagent") return [];
					current = row.parentId;
				}
				return current === parent ? [id] : [];
			});
		}
		const memberReadRetryDelays = [
			500,
			1e3,
			2e3,
			4e3,
			8e3
		];
		const stableMemberReadErrorCodes = /* @__PURE__ */ new Set([
			"dsh-acp/config",
			"dsh-acp/not-installed",
			"dsh-acp/auth-required",
			"dsh-acp/protocol-incompatible",
			"dsh-acp/user-rejected",
			"gateway/bad-request",
			"remote-access/denied"
		]);
		function isStableTeamMemberReadError(error) {
			return typeof error === "object" && error !== null && "code" in error && typeof error.code === "string" && stableMemberReadErrorCodes.has(error.code);
		}
		async function waitForMemberReadRetry(delayMs, signal) {
			if (signal?.aborted) return;
			await new Promise((resolve) => {
				let timer;
				const finish = () => {
					if (timer !== void 0) clearTimeout(timer);
					signal?.removeEventListener("abort", finish);
					resolve();
				};
				timer = setTimeout(finish, delayMs);
				signal?.addEventListener("abort", finish, { once: true });
				if (signal?.aborted) finish();
			});
		}
		/** Retry only the read while its captured session/request remains live. */
		async function readTeamMembersUntilAvailable(sessionId, loadMembers, active, options = {}) {
			let attempt = 0;
			while (!options.signal?.aborted && active()) {
				options.onAttempt?.();
				try {
					const members = await loadMembers(sessionId);
					return !options.signal?.aborted && active() ? members : void 0;
				} catch (error) {
					if (options.signal?.aborted || !active()) return void 0;
					if (isStableTeamMemberReadError(error)) throw error;
					options.onFailure?.();
					const delay = memberReadRetryDelays[Math.min(attempt, memberReadRetryDelays.length - 1)];
					attempt++;
					await waitForMemberReadRetry(delay, options.signal);
				}
			}
		}
		function teamApproval(value) {
			return value.kind === "approval" && "answer" in value && typeof value.answer === "function" && "toolName" in value && typeof value.toolName === "string" ? value : void 0;
		}
		/** Settle only the captured, still-current requests. New arrivals never join a batch. */
		async function answerTeamRequests(requests, current, allowedMembers, active, inFlight) {
			return (await Promise.allSettled(requests.map(async (request) => {
				const pending = request.pending;
				if (!active() || !allowedMembers.has(pending.sessionId) || current().get(pending.sessionId)?.pendingInteraction !== pending || "answerable" in pending && pending.answerable === false || inFlight.has(pending)) return;
				inFlight.add(pending);
				try {
					await request.answer();
				} finally {
					inFlight.delete(pending);
				}
			}))).filter((outcome) => outcome.status === "rejected").length;
		}
		//#endregion
		//#region src/client/ui/AcpTeamApprovals.ts
		function shortSessionId(id, ids) {
			let length = Math.min(8, id.length);
			while (length < id.length && ids.some((other) => other !== id && other.startsWith(id.slice(0, length)))) length++;
			return id.slice(0, length);
		}
		/** Present and answer the original member-owned carriers without changing the active conversation. */
		function AcpTeamApprovals({ sessionId, useSessions, t, status, loadChildren, openMember, isCurrent, resolveReason }) {
			const inFlight = (0, react.useRef)(/* @__PURE__ */ new Set());
			const epoch = (0, react.useRef)(0);
			const runController = (0, react.useRef)(void 0);
			const requestIdentity = (0, react.useRef)(void 0);
			if (requestIdentity.current === void 0) requestIdentity.current = {
				ids: /* @__PURE__ */ new WeakMap(),
				next: 0
			};
			const [busy, setBusy] = (0, react.useState)(false);
			(0, react.useEffect)(() => {
				++epoch.current;
				runController.current?.abort();
				runController.current = void 0;
				setBusy(false);
				setActionError(void 0);
				return () => {
					++epoch.current;
				};
			}, [sessionId]);
			const [expanded, setExpanded] = (0, react.useState)(true);
			const seen = (0, react.useRef)(/* @__PURE__ */ new Set());
			const snapshot = (0, react.useSyncExternalStore)(status.subscribe, status.getSnapshot);
			const summaries = useSessions((sessions) => sessions.byId);
			const projections = useSessions((sessions) => sessions.projectionsBySession);
			const readOnly = new Set(Object.entries(projections).filter(([, projection]) => projection.values.acpExecution?.externalSubagent === true).map(([id]) => id));
			const enabled = isCurrent(sessionId) && !readOnly.has(sessionId);
			const candidates = pendingChildCandidates(sessionId, summaries, snapshot, readOnly);
			const revision = JSON.stringify(candidates.map((id) => [id, summaries[id]?.parentId]));
			const [actionError, setActionError] = (0, react.useState)(void 0);
			const pendingCarriers = candidates.map((id) => ({
				sessionId: id,
				pending: snapshot.get(id).pendingInteraction
			}));
			const pendingKeys = pendingCarriers.map(({ sessionId: memberId, pending }) => {
				const identity = requestIdentity.current;
				let id = identity.ids.get(pending);
				if (id === void 0) {
					id = ++identity.next;
					identity.ids.set(pending, id);
				}
				return JSON.stringify([
					memberId,
					pending.key,
					id
				]);
			}).join("\n");
			const [eligible, setEligible] = (0, react.useState)(void 0);
			(0, react.useEffect)(() => {
				let cancelled = false;
				setActionError(void 0);
				if (!enabled || pendingKeys === "") {
					setEligible(void 0);
					return () => {
						cancelled = true;
					};
				}
				const controller = new AbortController();
				const currentEpoch = epoch.current;
				const capturedPendingIsCurrent = () => pendingCarriers.every(({ sessionId: memberId, pending }) => status.getSnapshot().get(memberId)?.pendingInteraction === pending);
				const active = () => !cancelled && !controller.signal.aborted && epoch.current === currentEpoch && isCurrent(sessionId) && capturedPendingIsCurrent();
				setEligible({
					sessionId,
					revision,
					pendingKeys,
					loading: true
				});
				readTeamMembersUntilAvailable(sessionId, loadChildren, active, { signal: controller.signal }).then((members) => {
					if (!active()) return;
					if (members === void 0) {
						setEligible(void 0);
						return;
					}
					setEligible({
						sessionId,
						revision,
						pendingKeys,
						children: members
					});
				}).catch((error) => {
					if (!active() || !isStableTeamMemberReadError(error)) return;
					setEligible({
						sessionId,
						revision,
						pendingKeys,
						failed: true
					});
					setActionError(t("teamApprovalLoadFailed"));
				});
				return () => {
					cancelled = true;
					controller.abort();
				};
			}, [
				enabled,
				pendingKeys,
				sessionId,
				revision,
				loadChildren,
				isCurrent,
				status
			]);
			const eligibleMatches = eligible !== void 0 && eligible.sessionId === sessionId && eligible.revision === revision && eligible.pendingKeys === pendingKeys;
			const children = eligibleMatches && eligible !== void 0 && "children" in eligible ? eligible.children : void 0;
			const sessionIds = Object.keys(summaries);
			const waiting = (children ?? []).filter((member) => member.sessionId !== sessionId && candidates.includes(member.sessionId) && snapshot.get(member.sessionId)?.pendingInteraction !== void 0);
			const keys = waiting.map((member) => snapshot.get(member.sessionId).pendingInteraction.key);
			(0, react.useEffect)(() => {
				if (keys.some((key) => !seen.current.has(key))) setExpanded(true);
				seen.current = new Set(keys);
			}, [keys.join("|")]);
			const approvals = waiting.flatMap((member) => {
				const value = teamApproval(snapshot.get(member.sessionId).pendingInteraction);
				return value === void 0 ? [] : [value];
			});
			const run = async (requests) => {
				if (busy || runController.current !== void 0 || !isCurrent(sessionId)) return;
				const currentEpoch = epoch.current;
				const controller = new AbortController();
				runController.current = controller;
				let settling = false;
				const active = () => !controller.signal.aborted && epoch.current === currentEpoch && isCurrent(sessionId);
				const requestSetIsCurrent = () => requests.every((request) => status.getSnapshot().get(request.pending.sessionId)?.pendingInteraction === request.pending);
				const unsubscribe = status.subscribe(() => {
					if (!settling && !requestSetIsCurrent()) controller.abort();
				});
				setBusy(true);
				setActionError(void 0);
				try {
					const members = await readTeamMembersUntilAvailable(sessionId, loadChildren, () => active() && requestSetIsCurrent(), {
						onFailure: () => {
							if (active() && requestSetIsCurrent()) setActionError(t("teamApprovalRechecking"));
						},
						signal: controller.signal
					});
					if (!active()) return;
					if (members === void 0 || !requestSetIsCurrent()) {
						setActionError(void 0);
						return;
					}
					setActionError(void 0);
					const allowed = new Set(members.filter((member) => member.sessionId !== sessionId).map((member) => member.sessionId));
					settling = true;
					const failures = await answerTeamRequests(requests, status.getSnapshot, allowed, active, inFlight.current);
					if (active() && failures > 0) setActionError(t("teamAnswerFailed", { count: failures }));
				} catch {
					if (active()) setActionError(t("teamApprovalLoadFailed"));
				} finally {
					unsubscribe();
					if (runController.current === controller) runController.current = void 0;
					if (active()) setBusy(false);
					else if (epoch.current === currentEpoch && isCurrent(sessionId)) {
						setActionError(void 0);
						setBusy(false);
					}
				}
			};
			const batch = (outcome) => {
				run(approvals.map((request) => ({
					pending: request,
					answer: () => request.answer(outcome)
				})));
			};
			const error = actionError;
			const loading = pendingKeys !== "" && children === void 0;
			if (!enabled || waiting.length === 0 && error === void 0 && !loading) return null;
			const pendingTitle = pendingKeys !== "" && children === void 0 ? eligibleMatches && eligible !== void 0 && "failed" in eligible ? t("teamPendingUncounted") : t("teamPendingLoading") : t("teamPendingTitle", { count: waiting.length });
			return (0, react.createElement)("section", {
				className: AcpTeamApprovals_module_css_default.card,
				"data-acp-team-approvals": "",
				"data-acp-child-approvals": "",
				"aria-label": pendingTitle
			}, (0, react.createElement)("div", { className: AcpTeamApprovals_module_css_default.header }, (0, react.createElement)("span", {
				className: AcpTeamApprovals_module_css_default.icon,
				"aria-hidden": true
			}, "!"), (0, react.createElement)("strong", {
				role: "status",
				"aria-live": "polite"
			}, pendingTitle), approvals.length <= 1 ? null : (0, react.createElement)("div", { className: AcpTeamApprovals_module_css_default.actions }, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				variant: "outline",
				disabled: busy,
				onClick: () => batch("rejected")
			}, t("teamRejectAll")), (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				variant: "primary",
				disabled: busy,
				onClick: () => batch("allowed-once")
			}, t("teamAllowAll"))), (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				variant: "ghost",
				"aria-expanded": expanded,
				onClick: () => setExpanded(!expanded)
			}, t(expanded ? "teamPendingCollapse" : "teamPendingExpand"))), expanded ? (0, react.createElement)("div", { className: AcpTeamApprovals_module_css_default.body }, (0, react.createElement)("p", { className: AcpTeamApprovals_module_css_default.hint }, t("teamPendingHint")), approvals.length <= 1 ? null : (0, react.createElement)("p", { className: AcpTeamApprovals_module_css_default.hint }, t("teamBatchHint", { count: approvals.length })), (0, react.createElement)("ul", { className: AcpTeamApprovals_module_css_default.members }, ...waiting.map((member) => {
				const request = snapshot.get(member.sessionId).pendingInteraction;
				const approval = teamApproval(request);
				const kind = request.kind;
				const source = member.path.map((part) => `${part.name} (${part.sessionId})`).join(" › ");
				return (0, react.createElement)("li", {
					key: member.sessionId,
					className: AcpTeamApprovals_module_css_default.member,
					"data-team-pending-member": member.name,
					"aria-label": source
				}, (0, react.createElement)("div", { className: AcpTeamApprovals_module_css_default.memberHeader }, (0, react.createElement)("span", {
					className: AcpTeamApprovals_module_css_default.name,
					title: source
				}, member.path.map((part) => `${part.name} · ${shortSessionId(part.sessionId, sessionIds)}`).join(" › ")), (0, react.createElement)("div", { className: AcpTeamApprovals_module_css_default.actions }, (0, react.createElement)("span", { className: AcpTeamApprovals_module_css_default.status }, t(kind === "approval" ? "teamPendingApproval" : kind === "question" || kind === "plan-review" ? "teamPendingQuestion" : "teamPendingOther")), (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "outline",
					"aria-label": t("teamApprovalEntry", { name: member.name }),
					onClick: () => {
						openMember(sessionId, member).catch(() => setActionError(t("teamApprovalOpenFailed")));
					}
				}, t("teamPendingOpen")), approval === void 0 ? null : (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "outline",
					disabled: busy,
					onClick: () => {
						run([{
							pending: request,
							answer: () => approval.answer("rejected")
						}]);
					}
				}, t("teamReject")), approval === void 0 ? null : (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
					variant: "primary",
					disabled: busy,
					onClick: () => {
						run([{
							pending: request,
							answer: () => approval.answer("allowed-once")
						}]);
					}
				}, t("teamAllowOnce")))), approval === void 0 ? null : (0, react.createElement)("div", {
					className: AcpTeamApprovals_module_css_default.reason,
					"data-team-approval-reason": "",
					tabIndex: 0
				}, resolveReason(approval.displayReason) ?? approval.reason ?? approval.toolName));
			}))) : null, error === void 0 ? null : (0, react.createElement)("p", {
				role: "status",
				className: AcpTeamApprovals_module_css_default.error
			}, error));
		}
		//#endregion
		//#region src/contract/agent-config.ts
		/** Browser-safe profile contract and identity rules. */
		/**
		* Settings namespace storing the ACP agent list.
		* 当前设置区段与包名一致。旧 `dsh-acp` settings 由
		* `src/host/composition/legacy-settings.ts` 导入；sidecar 根目录仍使用
		* `src/persistence/sidecar.ts` 中的 `dshHomePath('dsh-acp')`。
		*/
		const ACP_SETTINGS_NS = "dsh-acp-adapter";
		/**
		* Agent ids double as settings path segments, health-endpoint URL segments,
		* and route id suffixes — kept to the settings-namespace alphabet on purpose.
		*/
		const ACP_AGENT_ID_PATTERN = /^[a-z][a-z0-9-]*$/;
		/** 所有可显式绑定的合法 runtime（settings schema 使用）。 */
		const ACP_AGENT_IDS = [
			"devin",
			"codex",
			"kimi",
			"claude",
			"codebuddy",
			"antigravity"
		];
		/** Profile-ID fallback predates explicit runtime bindings and is limited to the original four IDs. */
		const LEGACY_RUNTIME_IDS = [
			"devin",
			"codex",
			"kimi",
			"claude"
		];
		const RUNTIME_REGISTRY_IDS = {
			devin: "devin",
			codex: "codex-acp",
			kimi: "kimi",
			claude: "claude-acp",
			codebuddy: "codebuddy-code",
			antigravity: "antigravity-acp"
		};
		/** Explicit binding wins; only the original built-in profile IDs retain legacy fallback. */
		function effectiveRuntimeOf(id, config) {
			return config?.runtime ?? (LEGACY_RUNTIME_IDS.includes(id) ? id : void 0);
		}
		/** Catalog metadata does not participate in execution identity. */
		function catalogIdOf(id, config) {
			const runtime = effectiveRuntimeOf(id, config);
			return config.catalogId ?? (runtime === void 0 ? id : RUNTIME_REGISTRY_IDS[runtime]);
		}
		/** Used only when creating a catalog preset; never infer runtime from saved catalogId. */
		function runtimeForCatalogId(id) {
			return ACP_AGENT_IDS.find((runtime) => RUNTIME_REGISTRY_IDS[runtime] === id);
		}
		//#endregion
		//#region assets/registry/registry.json
		var agents = [
			{
				"id": "agoragentic-acp",
				"name": "Agoragentic",
				"version": "1.3.0",
				"description": "Agent marketplace with 174+ AI capabilities. Browse, invoke, and pay for agent services settled in USDC on Base L2.",
				"repository": "https://github.com/rhein1/agoragentic-integrations",
				"website": "https://agoragentic.com",
				"authors": ["ACRE / Agoragentic"],
				"license": "MIT",
				"license_url": "https://github.com/rhein1/agoragentic-integrations/blob/main/LICENSE",
				"distribution": { "npx": {
					"package": "agoragentic-mcp@1.3.0",
					"args": ["--acp"]
				} },
				"icon": "https://cdn.agentclientprotocol.com/registry/v1/latest/agoragentic-acp.svg"
			},
			{
				"id": "amp-acp",
				"name": "Amp",
				"version": "0.9.0",
				"description": "ACP wrapper for Amp - the frontier coding agent",
				"repository": "https://github.com/tao12345666333/amp-acp",
				"authors": ["tao12345666333"],
				"license": "Apache-2.0",
				"license_url": "https://github.com/tao12345666333/amp-acp/blob/main/LICENSE",
				"icon": "https://cdn.agentclientprotocol.com/registry/v1/latest/amp-acp.svg",
				"distribution": { "binary": {
					"darwin-aarch64": {
						"archive": "https://github.com/tao12345666333/amp-acp/releases/download/v0.9.0/amp-acp-darwin-aarch64.tar.gz",
						"cmd": "./amp-acp",
						"sha256": "240a1a464f2a400ae51e9613b7f52b2abb6e7a29759001e9185291325671ccf1"
					},
					"darwin-x86_64": {
						"archive": "https://github.com/tao12345666333/amp-acp/releases/download/v0.9.0/amp-acp-darwin-x86_64.tar.gz",
						"cmd": "./amp-acp",
						"sha256": "0dc6d1ab8054e09b10ef49eea3e61afe363473d785bc9682ecb997480ec2f61f"
					},
					"linux-aarch64": {
						"archive": "https://github.com/tao12345666333/amp-acp/releases/download/v0.9.0/amp-acp-linux-aarch64.tar.gz",
						"cmd": "./amp-acp",
						"sha256": "b9e365221838b1a6e177c2fcd8f25a30086c3630e0330f1f6f74b25d2d4126c2"
					},
					"linux-x86_64": {
						"archive": "https://github.com/tao12345666333/amp-acp/releases/download/v0.9.0/amp-acp-linux-x86_64.tar.gz",
						"cmd": "./amp-acp",
						"sha256": "afaa50a152eb86a8ff21e354ded63fe2d21b730859692e3a60b2c4c9ef23df31"
					},
					"windows-x86_64": {
						"archive": "https://github.com/tao12345666333/amp-acp/releases/download/v0.9.0/amp-acp-windows-x86_64.zip",
						"cmd": "amp-acp.exe",
						"sha256": "3b2c3d14d703fcf9572da9733e4941703a7744bd37ec4aaa75421d6002c0157b"
					}
				} }
			},
			{
				"id": "antigravity-acp",
				"name": "Google Antigravity",
				"version": "1.1.1",
				"description": "Google’s AI coding agent",
				"website": "https://antigravity.google/docs/ide/extensions",
				"authors": ["Google LLC"],
				"license": "proprietary",
				"license_url": "https://antigravity.google/terms",
				"distribution": { "binary": {
					"darwin-aarch64": {
						"archive": "https://dl.google.com/agy-extensions/releases/macos/agy-acp-server-agy_acp_server_1.1.1-darwin-arm64.zip",
						"cmd": "./agy_acp_server.par"
					},
					"linux-x86_64": {
						"archive": "https://dl.google.com/agy-extensions/releases/linux/agy-acp-server-agy_acp_server_1.1.1-linux-x86_64.zip",
						"cmd": "./agy_acp_server.par",
						"args": ["--uid="]
					},
					"linux-aarch64": {
						"archive": "https://dl.google.com/agy-extensions/releases/linux/agy-acp-server-agy_acp_server_1.1.1-linux-arm64.zip",
						"cmd": "./agy_acp_server.par",
						"args": ["--uid="]
					},
					"windows-x86_64": {
						"archive": "https://dl.google.com/agy-extensions/releases/windows/agy-acp-server-agy_acp_server_1.1.1-windows-x86_64.zip",
						"cmd": "./agy_acp_server.exe"
					},
					"windows-aarch64": {
						"archive": "https://dl.google.com/agy-extensions/releases/windows/agy-acp-server-agy_acp_server_1.1.1-windows-arm64.zip",
						"cmd": "./agy_acp_server.exe"
					}
				} },
				"icon": "https://cdn.agentclientprotocol.com/registry/v1/latest/antigravity-acp.svg"
			},
			{
				"id": "auggie",
				"name": "Auggie CLI",
				"version": "0.36.0",
				"description": "Augment Code's powerful software agent, backed by industry-leading context engine",
				"repository": "https://github.com/augmentcode/auggie",
				"website": "https://www.augmentcode.com/",
				"authors": ["Augment Code <support@augmentcode.com>"],
				"license": "proprietary",
				"license_url": "https://github.com/augmentcode/auggie/blob/main/LICENSE.md",
				"icon": "https://cdn.agentclientprotocol.com/registry/v1/latest/auggie.svg",
				"distribution": { "npx": {
					"package": "@augmentcode/auggie@0.36.0",
					"args": ["--acp"],
					"env": { "AUGMENT_DISABLE_AUTO_UPDATE": "1" }
				} }
			},
			{
				"id": "autohand",
				"name": "Autohand Code",
				"version": "0.2.1",
				"description": "Autohand Code - AI coding agent powered by Autohand AI",
				"repository": "https://github.com/autohandai/autohand-acp",
				"website": "https://www.autohand.ai/cli/",
				"authors": ["Autohand AI"],
				"license": "Apache-2.0",
				"license_url": "https://github.com/autohandai/autohand-acp/blob/main/LICENSE",
				"distribution": { "npx": { "package": "@autohandai/autohand-acp@0.2.1" } },
				"icon": "https://cdn.agentclientprotocol.com/registry/v1/latest/autohand.svg"
			},
			{
				"id": "claude-acp",
				"name": "Claude Agent",
				"version": "0.77.0",
				"description": "ACP wrapper for Anthropic's Claude",
				"repository": "https://github.com/agentclientprotocol/claude-agent-acp",
				"authors": [
					"Anthropic",
					"Zed Industries",
					"JetBrains"
				],
				"license": "proprietary",
				"license_url": "https://github.com/agentclientprotocol/claude-agent-acp/blob/main/LICENSE",
				"distribution": { "npx": { "package": "@agentclientprotocol/claude-agent-acp@0.77.0" } },
				"icon": "https://cdn.agentclientprotocol.com/registry/v1/latest/claude-acp.svg"
			},
			{
				"id": "cline",
				"name": "Cline",
				"version": "3.0.61",
				"description": "Autonomous coding agent CLI - capable of creating/editing files, running commands, using the browser, and more",
				"repository": "https://github.com/cline/cline",
				"website": "https://cline.bot/cli",
				"authors": ["Cline Bot Inc."],
				"license": "Apache-2.0",
				"license_url": "https://github.com/cline/cline/blob/main/LICENSE",
				"icon": "https://cdn.agentclientprotocol.com/registry/v1/latest/cline.svg",
				"distribution": { "npx": {
					"package": "cline@3.0.61",
					"args": ["--acp"]
				} }
			},
			{
				"id": "codebuddy-code",
				"name": "Codebuddy Code",
				"version": "2.150.0",
				"description": "Tencent Cloud's official intelligent coding tool",
				"website": "https://www.codebuddy.cn/cli/",
				"authors": ["Tencent Cloud"],
				"license": "Proprietary",
				"license_url": "https://www.codebuddy.cn/agreement/",
				"distribution": { "npx": {
					"package": "@tencent-ai/codebuddy-code@2.150.0",
					"args": ["--acp"]
				} },
				"icon": "https://cdn.agentclientprotocol.com/registry/v1/latest/codebuddy-code.svg"
			},
			{
				"id": "codex-acp",
				"name": "Codex",
				"version": "1.11.0",
				"description": "ACP adapter for OpenAI's coding assistant",
				"repository": "https://github.com/agentclientprotocol/codex-acp",
				"authors": [
					"OpenAI",
					"JetBrains s.r.o",
					"Zed Industries"
				],
				"license": "Apache-2.0",
				"license_url": "https://github.com/agentclientprotocol/codex-acp/blob/main/LICENSE",
				"distribution": { "npx": { "package": "@agentclientprotocol/codex-acp@1.11.0" } },
				"icon": "https://cdn.agentclientprotocol.com/registry/v1/latest/codex-acp.svg"
			},
			{
				"id": "cortex-code",
				"name": "Cortex Code",
				"version": "1.0.73",
				"description": "Snowflake's Cortex Code coding agent",
				"repository": "https://docs.snowflake.com/en/user-guide/cortex-code/cortex-code",
				"authors": ["Snowflake"],
				"license": "proprietary",
				"license_url": "https://www.snowflake.com/en/legal/terms-of-service/",
				"distribution": { "binary": {
					"darwin-aarch64": {
						"archive": "https://sfc-repo.snowflakecomputing.com/cortex-code-cli/a4643c4278/1.0.73%2B180523.e6179a031de9/coco-1.0.73%2B180523.e6179a031de9-darwin-arm64.tar.gz",
						"cmd": "./coco-1.0.73+180523.e6179a031de9-darwin-arm64/cortex",
						"args": ["acp", "serve"]
					},
					"darwin-x86_64": {
						"archive": "https://sfc-repo.snowflakecomputing.com/cortex-code-cli/a4643c4278/1.0.73%2B180523.e6179a031de9/coco-1.0.73%2B180523.e6179a031de9-darwin-amd64.tar.gz",
						"cmd": "./coco-1.0.73+180523.e6179a031de9-darwin-amd64/cortex",
						"args": ["acp", "serve"]
					},
					"linux-x86_64": {
						"archive": "https://sfc-repo.snowflakecomputing.com/cortex-code-cli/a4643c4278/1.0.73%2B180523.e6179a031de9/coco-1.0.73%2B180523.e6179a031de9-linux-amd64.tar.gz",
						"cmd": "./coco-1.0.73+180523.e6179a031de9-linux-amd64/cortex",
						"args": ["acp", "serve"]
					},
					"linux-aarch64": {
						"archive": "https://sfc-repo.snowflakecomputing.com/cortex-code-cli/a4643c4278/1.0.73%2B180523.e6179a031de9/coco-1.0.73%2B180523.e6179a031de9-linux-arm64.tar.gz",
						"cmd": "./coco-1.0.73+180523.e6179a031de9-linux-arm64/cortex",
						"args": ["acp", "serve"]
					},
					"windows-x86_64": {
						"archive": "https://sfc-repo.snowflakecomputing.com/cortex-code-cli/a4643c4278/1.0.73%2B180523.e6179a031de9/coco-1.0.73%2B180523.e6179a031de9-windows-amd64.tar.gz",
						"cmd": "./coco-1.0.73+180523.e6179a031de9-windows-amd64/cortex.exe",
						"args": ["acp", "serve"]
					},
					"windows-aarch64": {
						"archive": "https://sfc-repo.snowflakecomputing.com/cortex-code-cli/a4643c4278/1.0.73%2B180523.e6179a031de9/coco-1.0.73%2B180523.e6179a031de9-windows-arm64.tar.gz",
						"cmd": "./coco-1.0.73+180523.e6179a031de9-windows-arm64/cortex.exe",
						"args": ["acp", "serve"]
					}
				} },
				"icon": "https://cdn.agentclientprotocol.com/registry/v1/latest/cortex-code.svg"
			},
			{
				"id": "corust-agent",
				"name": "Corust Agent",
				"version": "0.6.0",
				"description": "Co-building with a seasoned Rust partner.",
				"repository": "https://github.com/Corust-ai/corust-agent-release",
				"website": "https://corust.ai/",
				"authors": ["Corust AI <support@corust.ai>"],
				"license": "GPL-3.0-or-later",
				"license_url": "https://github.com/Corust-ai/corust-agent-release/blob/main/LICENSE",
				"distribution": { "binary": {
					"darwin-aarch64": {
						"archive": "https://github.com/Corust-ai/corust-agent-release/releases/download/v0.6.0/agent-darwin-arm64.tar.gz",
						"cmd": "./corust-agent-acp"
					},
					"darwin-x86_64": {
						"archive": "https://github.com/Corust-ai/corust-agent-release/releases/download/v0.6.0/agent-darwin-x64.tar.gz",
						"cmd": "./corust-agent-acp"
					},
					"linux-x86_64": {
						"archive": "https://github.com/Corust-ai/corust-agent-release/releases/download/v0.6.0/agent-linux-x64.tar.gz",
						"cmd": "./corust-agent-acp"
					},
					"windows-x86_64": {
						"archive": "https://github.com/Corust-ai/corust-agent-release/releases/download/v0.6.0/agent-windows-x64.zip",
						"cmd": "./corust-agent-acp.exe"
					}
				} },
				"icon": "https://cdn.agentclientprotocol.com/registry/v1/latest/corust-agent.svg"
			},
			{
				"id": "crow-cli",
				"name": "crow-cli",
				"version": "0.1.24",
				"description": "Minimal ACP Native Coding Agent",
				"repository": "https://github.com/crow-cli/crow-cli",
				"website": "https://crow-ai.dev",
				"authors": ["Thomas Wood"],
				"license": "Apache-2.0",
				"license_url": "https://github.com/crow-cli/crow-cli/blob/main/LICENSE.md",
				"distribution": { "binary": {
					"darwin-aarch64": {
						"archive": "https://github.com/crow-cli/crow-cli/releases/download/v0.1.24/crow-cli-darwin-aarch64.tar.gz",
						"cmd": "./crow-cli",
						"args": ["acp"]
					},
					"darwin-x86_64": {
						"archive": "https://github.com/crow-cli/crow-cli/releases/download/v0.1.24/crow-cli-darwin-x86_64.tar.gz",
						"cmd": "./crow-cli",
						"args": ["acp"]
					},
					"linux-aarch64": {
						"archive": "https://github.com/crow-cli/crow-cli/releases/download/v0.1.24/crow-cli-linux-aarch64.tar.gz",
						"cmd": "./crow-cli",
						"args": ["acp"]
					},
					"linux-x86_64": {
						"archive": "https://github.com/crow-cli/crow-cli/releases/download/v0.1.24/crow-cli-linux-x86_64.tar.gz",
						"cmd": "./crow-cli",
						"args": ["acp"]
					},
					"windows-x86_64": {
						"archive": "https://github.com/crow-cli/crow-cli/releases/download/v0.1.24/crow-cli-windows-x86_64.zip",
						"cmd": "./crow-cli.exe",
						"args": ["acp"]
					}
				} },
				"icon": "https://cdn.agentclientprotocol.com/registry/v1/latest/crow-cli.svg"
			},
			{
				"id": "cursor",
				"name": "Cursor",
				"version": "2026.09.10",
				"description": "Cursor's coding agent",
				"website": "https://cursor.com/docs/cli/acp",
				"authors": ["Cursor"],
				"license": "proprietary",
				"license_url": "https://cursor.com/terms-of-service",
				"distribution": { "binary": {
					"darwin-aarch64": {
						"archive": "https://downloads.cursor.com/lab/2026.09.10-fd3934a/darwin/arm64/agent-cli-package.tar.gz",
						"cmd": "./dist-package/cursor-agent",
						"args": ["acp"]
					},
					"darwin-x86_64": {
						"archive": "https://downloads.cursor.com/lab/2026.09.10-fd3934a/darwin/x64/agent-cli-package.tar.gz",
						"cmd": "./dist-package/cursor-agent",
						"args": ["acp"]
					},
					"linux-aarch64": {
						"archive": "https://downloads.cursor.com/lab/2026.09.10-fd3934a/linux/arm64/agent-cli-package.tar.gz",
						"cmd": "./dist-package/cursor-agent",
						"args": ["acp"]
					},
					"linux-x86_64": {
						"archive": "https://downloads.cursor.com/lab/2026.09.10-fd3934a/linux/x64/agent-cli-package.tar.gz",
						"cmd": "./dist-package/cursor-agent",
						"args": ["acp"]
					},
					"windows-aarch64": {
						"archive": "https://downloads.cursor.com/lab/2026.09.10-fd3934a/windows/arm64/agent-cli-package.zip",
						"cmd": "./dist-package\\cursor-agent.cmd",
						"args": ["acp"]
					},
					"windows-x86_64": {
						"archive": "https://downloads.cursor.com/lab/2026.09.10-fd3934a/windows/x64/agent-cli-package.zip",
						"cmd": "./dist-package\\cursor-agent.cmd",
						"args": ["acp"]
					}
				} },
				"icon": "https://cdn.agentclientprotocol.com/registry/v1/latest/cursor.svg"
			},
			{
				"id": "deepagents",
				"name": "DeepAgents",
				"version": "0.1.7",
				"description": "Batteries-included AI coding and general purpose agent powered by LangChain.",
				"repository": "https://github.com/langchain-ai/deepagentsjs",
				"website": "https://docs.langchain.com/oss/javascript/deepagents/overview",
				"authors": ["LangChain"],
				"license": "MIT",
				"license_url": "https://github.com/langchain-ai/deepagentsjs/blob/main/LICENSE",
				"distribution": { "npx": {
					"package": "deepagents-acp@0.1.7",
					"args": []
				} },
				"icon": "https://cdn.agentclientprotocol.com/registry/v1/latest/deepagents.svg"
			},
			{
				"id": "devin",
				"name": "Devin",
				"version": "3000.10.21",
				"description": "Devin CLI coding agent by Cognition",
				"website": "https://docs.devin.ai/cli",
				"authors": ["Cognition"],
				"license": "proprietary",
				"license_url": "https://cognition.com/legal/platform-terms-of-service",
				"repository": "https://github.com/CognitionAI/devin-cli",
				"distribution": { "binary": {
					"darwin-aarch64": {
						"archive": "https://static.devin.ai/cli/3000.10.21/devin-3000.10.21-aarch64-apple-darwin.tar.gz",
						"cmd": "./bin/devin",
						"args": ["acp"]
					},
					"darwin-x86_64": {
						"archive": "https://static.devin.ai/cli/3000.10.21/devin-3000.10.21-x86_64-apple-darwin.tar.gz",
						"cmd": "./bin/devin",
						"args": ["acp"]
					},
					"linux-aarch64": {
						"archive": "https://static.devin.ai/cli/3000.10.21/devin-3000.10.21-aarch64-unknown-linux.tar.gz",
						"cmd": "./bin/devin",
						"args": ["acp"]
					},
					"linux-x86_64": {
						"archive": "https://static.devin.ai/cli/3000.10.21/devin-3000.10.21-x86_64-unknown-linux.tar.gz",
						"cmd": "./bin/devin",
						"args": ["acp"]
					},
					"windows-aarch64": {
						"archive": "https://static.devin.ai/cli/3000.10.21/devin-3000.10.21-aarch64-pc-windows.zip",
						"cmd": "./bin\\devin.exe",
						"args": ["acp"]
					},
					"windows-x86_64": {
						"archive": "https://static.devin.ai/cli/3000.10.21/devin-3000.10.21-x86_64-pc-windows.zip",
						"cmd": "./bin\\devin.exe",
						"args": ["acp"]
					}
				} },
				"icon": "https://cdn.agentclientprotocol.com/registry/v1/latest/devin.svg"
			},
			{
				"id": "dimcode",
				"name": "DimCode",
				"version": "0.5.2",
				"description": "A coding agent that puts leading models at your command.",
				"website": "https://dimcode.dev/docs/acp.html",
				"authors": ["ArcShips"],
				"license": "proprietary",
				"distribution": { "npx": {
					"package": "dimcode@0.5.2",
					"args": ["acp"]
				} },
				"icon": "https://cdn.agentclientprotocol.com/registry/v1/latest/dimcode.svg"
			},
			{
				"id": "dirac",
				"name": "Dirac",
				"version": "0.5.12",
				"description": "Reduces API costs by more than 50%, produces better and faster work. Uses Hash anchored parallel edits, AST manipulation and a whole lot of neat optimizations. Fully Open Source.",
				"repository": "https://github.com/dirac-run/dirac",
				"website": "https://dirac.run",
				"authors": ["Dirac Delta Labs"],
				"license": "Apache-2.0",
				"license_url": "https://github.com/dirac-run/dirac/blob/master/LICENSE",
				"icon": "https://cdn.agentclientprotocol.com/registry/v1/latest/dirac.svg",
				"distribution": { "npx": {
					"package": "dirac-cli@0.5.12",
					"args": ["--acp"]
				} }
			},
			{
				"id": "factory-droid",
				"name": "Factory Droid",
				"version": "0.218.1",
				"description": "Factory Droid - AI coding agent powered by Factory AI",
				"website": "https://factory.ai/product/cli",
				"authors": ["Factory AI"],
				"license": "proprietary",
				"license_url": "https://factory.ai/legal/terms",
				"distribution": { "npx": {
					"package": "droid@0.218.1",
					"args": [
						"exec",
						"--output-format",
						"acp-daemon"
					],
					"env": {
						"DROID_DISABLE_AUTO_UPDATE": "true",
						"FACTORY_DROID_AUTO_UPDATE_ENABLED": "false"
					}
				} },
				"icon": "https://cdn.agentclientprotocol.com/registry/v1/latest/factory-droid.svg"
			},
			{
				"id": "fast-agent",
				"name": "fast-agent",
				"version": "0.10.1",
				"description": "Code and build agents with comprehensive multi-provider support",
				"repository": "https://github.com/evalstate/fast-agent",
				"website": "https://fast-agent.ai",
				"authors": ["enquiries@fast-agent.ai"],
				"license": "Apache 2.0",
				"license_url": "https://github.com/evalstate/fast-agent/blob/main/LICENSE",
				"distribution": { "uvx": {
					"package": "fast-agent-acp==0.10.1",
					"args": ["-x"],
					"env": { "FAST_AGENT_MODEL": "codexplan" }
				} },
				"icon": "https://cdn.agentclientprotocol.com/registry/v1/latest/fast-agent.svg"
			},
			{
				"id": "gemini",
				"name": "Gemini CLI",
				"version": "0.59.0",
				"description": "Google's official CLI for Gemini",
				"repository": "https://github.com/google-gemini/gemini-cli",
				"website": "https://geminicli.com",
				"authors": ["Google"],
				"license": "Apache-2.0",
				"license_url": "https://github.com/google-gemini/gemini-cli/blob/main/LICENSE",
				"distribution": { "npx": {
					"package": "@google/gemini-cli@0.59.0",
					"args": ["--acp"]
				} },
				"icon": "https://cdn.agentclientprotocol.com/registry/v1/latest/gemini.svg"
			},
			{
				"id": "github-copilot-cli",
				"name": "GitHub Copilot",
				"version": "1.0.83",
				"description": "GitHub's AI pair programmer",
				"repository": "https://github.com/github/copilot-cli",
				"website": "https://github.com/features/copilot/cli/",
				"authors": ["GitHub"],
				"license": "proprietary",
				"license_url": "https://github.com/github/copilot-cli/blob/main/LICENSE.md",
				"distribution": { "npx": {
					"package": "@github/copilot@1.0.83",
					"args": ["--acp"]
				} },
				"icon": "https://cdn.agentclientprotocol.com/registry/v1/latest/github-copilot-cli.svg"
			},
			{
				"id": "glm-acp-agent",
				"name": "GLM Agent",
				"version": "1.8.0",
				"description": "ACP agent powered by Zhipu AI's GLM Coding Plan models (glm-5.1, glm-5-turbo, glm-4.7, glm-4.5-air). Supports streaming, tool calls, mid-session model switching, image input via Z.AI Coding Plan Vision MCP, and session load/fork/resume with on-disk persistence.",
				"repository": "https://github.com/stefandevo/glm-acp-agent",
				"authors": ["Stefan de Vogelaere"],
				"license": "Apache-2.0",
				"license_url": "https://github.com/stefandevo/glm-acp-agent/blob/main/LICENSE",
				"icon": "https://cdn.agentclientprotocol.com/registry/v1/latest/glm-acp-agent.svg",
				"distribution": { "npx": { "package": "glm-acp-agent@1.8.0" } }
			},
			{
				"id": "goose",
				"name": "goose",
				"version": "1.50.0",
				"description": "A local, extensible, open source AI agent that automates engineering tasks",
				"repository": "https://github.com/block/goose",
				"website": "https://block.github.io/goose/",
				"authors": ["Block"],
				"license": "Apache-2.0",
				"license_url": "https://github.com/block/goose/blob/main/LICENSE",
				"distribution": { "binary": {
					"darwin-aarch64": {
						"archive": "https://github.com/block/goose/releases/download/v1.50.0/goose-aarch64-apple-darwin.tar.bz2",
						"cmd": "./goose",
						"args": ["acp"],
						"sha256": "2ac186f03e547057a7d8aaa28c2ec34bef0c3718ead98bbbda50945273f93147"
					},
					"darwin-x86_64": {
						"archive": "https://github.com/block/goose/releases/download/v1.50.0/goose-x86_64-apple-darwin.tar.bz2",
						"cmd": "./goose",
						"args": ["acp"],
						"sha256": "1c7932a6cd83a90f1c05f5d86c1a4c0125f12fe7db1a4bf84252a0eec562261d"
					},
					"linux-aarch64": {
						"archive": "https://github.com/block/goose/releases/download/v1.50.0/goose-aarch64-unknown-linux-gnu.tar.bz2",
						"cmd": "./goose",
						"args": ["acp"],
						"sha256": "21918884e8c755e46f66c9476a03e846cb02a73edf8ca958e41291efe9845ab9"
					},
					"linux-x86_64": {
						"archive": "https://github.com/block/goose/releases/download/v1.50.0/goose-x86_64-unknown-linux-gnu.tar.bz2",
						"cmd": "./goose",
						"args": ["acp"],
						"sha256": "8b5dfae07d16e352fbabe3122339a9270ea30e3b29246c81d6a227ed5f35e904"
					},
					"windows-x86_64": {
						"archive": "https://github.com/block/goose/releases/download/v1.50.0/goose-x86_64-pc-windows-msvc.zip",
						"cmd": "./goose-package\\goose.exe",
						"args": ["acp"],
						"sha256": "1bcb644e9dd9eeae60ec0491c0687b3378d32365e7cb5c3edeab8db6aa923829"
					}
				} },
				"icon": "https://cdn.agentclientprotocol.com/registry/v1/latest/goose.svg"
			},
			{
				"id": "grok-build",
				"name": "Grok Build",
				"version": "1.0.30",
				"description": "xAI's coding agent and CLI",
				"website": "https://x.ai/cli",
				"authors": ["xAI"],
				"license": "proprietary",
				"license_url": "https://x.ai/legal/terms-of-service",
				"distribution": { "npx": {
					"package": "@xai-official/grok@1.0.30",
					"args": ["agent", "stdio"]
				} },
				"icon": "https://cdn.agentclientprotocol.com/registry/v1/latest/grok-build.svg"
			},
			{
				"id": "harn",
				"name": "Harn",
				"version": "0.10.135",
				"description": "Harn runs .harn agent pipelines as a native ACP coding agent over stdio.",
				"repository": "https://github.com/burin-labs/harn",
				"website": "https://harnlang.com",
				"authors": ["Burin Labs"],
				"license": "Apache-2.0",
				"license_url": "https://github.com/burin-labs/harn/blob/main/LICENSE-APACHE",
				"distribution": { "binary": {
					"darwin-aarch64": {
						"archive": "https://github.com/burin-labs/harn/releases/download/v0.10.135/harn-aarch64-apple-darwin.tar.gz",
						"cmd": "./harn",
						"args": ["serve", "acp"],
						"sha256": "c277bd33da392113f0b726fc370a3a75d4d9b985fcf6340069581483d80e35e5"
					},
					"darwin-x86_64": {
						"archive": "https://github.com/burin-labs/harn/releases/download/v0.10.135/harn-x86_64-apple-darwin.tar.gz",
						"cmd": "./harn",
						"args": ["serve", "acp"],
						"sha256": "cbe721ac357df62fc97d9d73f45036a6753c315034b18d76844042ef91e33330"
					},
					"linux-aarch64": {
						"archive": "https://github.com/burin-labs/harn/releases/download/v0.10.135/harn-aarch64-unknown-linux-gnu.tar.gz",
						"cmd": "./harn",
						"args": ["serve", "acp"],
						"sha256": "8a415a04f24790698eca9503e1dc40015e4558ce3924bdd7689ddbe91fada8dd"
					},
					"linux-x86_64": {
						"archive": "https://github.com/burin-labs/harn/releases/download/v0.10.135/harn-x86_64-unknown-linux-gnu.tar.gz",
						"cmd": "./harn",
						"args": ["serve", "acp"],
						"sha256": "a2982186d18831d7982a0525f3fdcdf648a5f21ebec6bdba9b0dc300f1b8e5e0"
					},
					"windows-x86_64": {
						"archive": "https://github.com/burin-labs/harn/releases/download/v0.10.135/harn-x86_64-pc-windows-msvc.zip",
						"cmd": "harn.exe",
						"args": ["serve", "acp"],
						"sha256": "e4a934d4daf21bb4f1ed52c4851b3bfcca8be512def6042902d19dfee541c916"
					}
				} },
				"icon": "https://cdn.agentclientprotocol.com/registry/v1/latest/harn.svg"
			},
			{
				"id": "junie",
				"name": "Junie",
				"version": "3218.3.0",
				"description": "AI Coding Agent by JetBrains",
				"repository": "https://github.com/JetBrains/junie-acp-release",
				"website": "https://junie.jetbrains.com",
				"authors": ["JetBrains"],
				"license": "proprietary",
				"license_url": "https://www.jetbrains.com/legal/docs/terms/jetbrains-ai-service/",
				"distribution": { "binary": {
					"darwin-aarch64": {
						"archive": "https://github.com/JetBrains/junie-acp-release/releases/download/3218.3/junie-release-3218.3-macos-aarch64.zip",
						"cmd": "./Applications/junie.app/Contents/MacOS/junie",
						"args": ["--acp=true"]
					},
					"darwin-x86_64": {
						"archive": "https://github.com/JetBrains/junie-acp-release/releases/download/3218.3/junie-release-3218.3-macos-amd64.zip",
						"cmd": "./Applications/junie.app/Contents/MacOS/junie",
						"args": ["--acp=true"]
					},
					"linux-aarch64": {
						"archive": "https://github.com/JetBrains/junie-acp-release/releases/download/3218.3/junie-release-3218.3-linux-aarch64.zip",
						"cmd": "./junie-app/bin/junie",
						"args": ["--acp=true"]
					},
					"linux-x86_64": {
						"archive": "https://github.com/JetBrains/junie-acp-release/releases/download/3218.3/junie-release-3218.3-linux-amd64.zip",
						"cmd": "./junie-app/bin/junie",
						"args": ["--acp=true"]
					},
					"windows-x86_64": {
						"archive": "https://github.com/JetBrains/junie-acp-release/releases/download/3218.3/junie-release-3218.3-windows-amd64.zip",
						"cmd": "./junie/junie.exe",
						"args": ["--acp=true"]
					},
					"windows-aarch64": {
						"archive": "https://github.com/JetBrains/junie-acp-release/releases/download/3218.3/junie-release-3218.3-windows-aarch64.zip",
						"cmd": "./junie/junie.exe",
						"args": ["--acp=true"]
					}
				} },
				"icon": "https://cdn.agentclientprotocol.com/registry/v1/latest/junie.svg"
			},
			{
				"id": "kilo",
				"name": "Kilo",
				"version": "7.6.2",
				"description": "The open source coding agent",
				"repository": "https://github.com/Kilo-Org/kilocode",
				"website": "https://kilo.ai/",
				"authors": ["Kilo Code"],
				"license": "MIT",
				"license_url": "https://github.com/Kilo-Org/kilocode/blob/main/LICENSE",
				"icon": "https://cdn.agentclientprotocol.com/registry/v1/latest/kilo.svg",
				"distribution": {
					"binary": {
						"darwin-aarch64": {
							"archive": "https://github.com/Kilo-Org/kilocode/releases/download/v7.6.2/kilo-darwin-arm64.zip",
							"cmd": "./kilo",
							"args": ["acp"],
							"sha256": "516b8b975beec61ac6c2a3dcf9ea1377bc0959d6f4fd695564de7dcb3a350a9a"
						},
						"darwin-x86_64": {
							"archive": "https://github.com/Kilo-Org/kilocode/releases/download/v7.6.2/kilo-darwin-x64.zip",
							"cmd": "./kilo",
							"args": ["acp"],
							"sha256": "001c6d21a38984ec3a8ea4d2b217efb4870f48c527349871bc553a78bcba989f"
						},
						"linux-aarch64": {
							"archive": "https://github.com/Kilo-Org/kilocode/releases/download/v7.6.2/kilo-linux-arm64.tar.gz",
							"cmd": "./kilo",
							"args": ["acp"],
							"sha256": "b7e532d3b17693cc69883dc030ae2aa5787ec86510b75ffd09892d5b25998f5e"
						},
						"linux-x86_64": {
							"archive": "https://github.com/Kilo-Org/kilocode/releases/download/v7.6.2/kilo-linux-x64.tar.gz",
							"cmd": "./kilo",
							"args": ["acp"],
							"sha256": "74cba87e7b4b0ae53cd40c76e464432e6ae75f810a753ff88436f666a08d3858"
						},
						"windows-x86_64": {
							"archive": "https://github.com/Kilo-Org/kilocode/releases/download/v7.6.2/kilo-windows-x64.zip",
							"cmd": "./kilo.exe",
							"args": ["acp"],
							"sha256": "bfc2daae05ef7e44584928aab87b53d5cedd9e19d32af4a01903e08d36900dcf"
						}
					},
					"npx": {
						"package": "@kilocode/cli@7.6.2",
						"args": ["acp"]
					}
				}
			},
			{
				"id": "kimchi",
				"name": "Kimchi",
				"version": "1.1.18",
				"description": "Coding agent powered by multi-model orchestration",
				"repository": "https://github.com/getkimchi/kimchi",
				"website": "https://kimchi.dev",
				"authors": ["Kimchi"],
				"license": "Apache-2.0",
				"license_url": "https://github.com/getkimchi/kimchi/blob/master/LICENSE",
				"distribution": { "binary": {
					"darwin-aarch64": {
						"archive": "https://github.com/getkimchi/kimchi/releases/download/v1.1.18/kimchi_darwin_arm64.tar.gz",
						"sha256": "2490ab7d9314e4d9f272071e1f3a3442d9bb2337d2ffddfdc0b763e90bc22b58",
						"cmd": "./bin/kimchi",
						"args": ["--mode", "acp"]
					},
					"darwin-x86_64": {
						"archive": "https://github.com/getkimchi/kimchi/releases/download/v1.1.18/kimchi_darwin_amd64.tar.gz",
						"sha256": "ed0bc8319ea2f251a6712de113388500e7c7730cc705cc6ad92fbdf69f0e9f43",
						"cmd": "./bin/kimchi",
						"args": ["--mode", "acp"]
					},
					"linux-aarch64": {
						"archive": "https://github.com/getkimchi/kimchi/releases/download/v1.1.18/kimchi_linux_arm64.tar.gz",
						"sha256": "1c009f421bf9b08879229c7b79554bcbbea4f62196dea26a63eca2abcb43bf02",
						"cmd": "./bin/kimchi",
						"args": ["--mode", "acp"]
					},
					"linux-x86_64": {
						"archive": "https://github.com/getkimchi/kimchi/releases/download/v1.1.18/kimchi_linux_amd64.tar.gz",
						"sha256": "3e48fddf41e466e2bf640a61d2dde40c815b80fcf1f06c7684b1ec9b9568a764",
						"cmd": "./bin/kimchi",
						"args": ["--mode", "acp"]
					},
					"windows-x86_64": {
						"archive": "https://github.com/getkimchi/kimchi/releases/download/v1.1.18/kimchi_windows_amd64.zip",
						"sha256": "5f39bb651a9bc4236f39f2f5d02f7c222efda70d6ba3347bbc6197b7bfb17088",
						"cmd": "./bin/kimchi.exe",
						"args": ["--mode", "acp"]
					}
				} },
				"icon": "https://cdn.agentclientprotocol.com/registry/v1/latest/kimchi.svg"
			},
			{
				"id": "kimi",
				"name": "Kimi CLI",
				"version": "1.50.0",
				"description": "Moonshot AI's coding assistant",
				"repository": "https://github.com/MoonshotAI/kimi-cli",
				"website": "https://moonshotai.github.io/kimi-cli/",
				"authors": ["Moonshot AI"],
				"license": "MIT",
				"license_url": "https://github.com/MoonshotAI/kimi-cli/blob/main/LICENSE",
				"distribution": { "binary": {
					"darwin-aarch64": {
						"archive": "https://github.com/MoonshotAI/kimi-cli/releases/download/1.50.0/kimi-1.50.0-aarch64-apple-darwin.tar.gz",
						"cmd": "./kimi",
						"args": ["acp"],
						"sha256": "5684f903cfc1ca1be4135a2634f7db108c787827c084b41df6a98eb01c9012df"
					},
					"linux-aarch64": {
						"archive": "https://github.com/MoonshotAI/kimi-cli/releases/download/1.50.0/kimi-1.50.0-aarch64-unknown-linux-gnu.tar.gz",
						"cmd": "./kimi",
						"args": ["acp"],
						"sha256": "de235322f48abe63e7a8d737f39f0c00fecf724f1dfaa1ae02491bb773ae8070"
					},
					"linux-x86_64": {
						"archive": "https://github.com/MoonshotAI/kimi-cli/releases/download/1.50.0/kimi-1.50.0-x86_64-unknown-linux-gnu.tar.gz",
						"cmd": "./kimi",
						"args": ["acp"],
						"sha256": "10ccaa26ee7f5bb43f7c05baf808c11cd0160710b07ac422382d1d1923f3dab6"
					},
					"windows-aarch64": {
						"archive": "https://github.com/MoonshotAI/kimi-cli/releases/download/1.50.0/kimi-1.50.0-aarch64-pc-windows-msvc.zip",
						"cmd": "./kimi.exe",
						"args": ["acp"],
						"sha256": "45fdb98d41a37e5430c332290a9cd97cb0586c428c1d49f6e11c54c80efdfc85"
					},
					"windows-x86_64": {
						"archive": "https://github.com/MoonshotAI/kimi-cli/releases/download/1.50.0/kimi-1.50.0-x86_64-pc-windows-msvc.zip",
						"cmd": "./kimi.exe",
						"args": ["acp"],
						"sha256": "2752f041cd7ead131c81b06f32bd1cf30afadf9b2e4741f7273331877aef6b33"
					}
				} },
				"icon": "https://cdn.agentclientprotocol.com/registry/v1/latest/kimi.svg"
			},
			{
				"id": "minimax-code",
				"name": "MiniMax Code",
				"version": "0.2.7",
				"description": "MiniMax Code is an AI coding agent with Agent Client Protocol support.",
				"website": "https://agent.minimax.io",
				"authors": ["MiniMax"],
				"license": "MIT",
				"license_url": "https://agent.minimax.io/doc/en/terms-of-service.html",
				"distribution": { "npx": {
					"package": "@minimax-ai/code@0.2.7",
					"args": ["acp"]
				} },
				"icon": "https://cdn.agentclientprotocol.com/registry/v1/latest/minimax-code.svg"
			},
			{
				"id": "minion-code",
				"name": "Minion Code",
				"version": "0.1.44",
				"description": "An enhanced AI code assistant built on the Minion framework with rich development tools",
				"repository": "https://github.com/femto/minion-code",
				"authors": ["femto"],
				"license": "AGPL-3.0",
				"license_url": "https://github.com/femto/minion-code/blob/main/LICENSE",
				"distribution": { "uvx": {
					"package": "minion-code@0.1.44",
					"args": ["acp"]
				} },
				"icon": "https://cdn.agentclientprotocol.com/registry/v1/latest/minion-code.svg"
			},
			{
				"id": "mistral-vibe",
				"name": "Mistral Vibe",
				"version": "2.24.1",
				"description": "Mistral's open-source coding assistant",
				"repository": "https://github.com/mistralai/mistral-vibe",
				"website": "https://mistral.ai/products/vibe",
				"authors": ["Mistral AI"],
				"license": "Apache-2.0",
				"license_url": "https://github.com/mistralai/mistral-vibe/blob/main/LICENSE",
				"icon": "https://cdn.agentclientprotocol.com/registry/v1/latest/mistral-vibe.svg",
				"distribution": { "binary": {
					"darwin-aarch64": {
						"archive": "https://github.com/mistralai/mistral-vibe/releases/download/v2.24.1/vibe-acp-darwin-aarch64-2.24.1.tar.gz",
						"cmd": "./vibe-acp",
						"sha256": "4faa3ed31454ee739fac2d5ff052c56056b175611a7b7ace0a4191f2bf83ba93"
					},
					"darwin-x86_64": {
						"archive": "https://github.com/mistralai/mistral-vibe/releases/download/v2.24.1/vibe-acp-darwin-x86_64-2.24.1.tar.gz",
						"cmd": "./vibe-acp",
						"sha256": "97d512a02e97fb828824cfb7b72734574f086d0442851c5fdfb432d7dabfa88a"
					},
					"linux-aarch64": {
						"archive": "https://github.com/mistralai/mistral-vibe/releases/download/v2.24.1/vibe-acp-linux-aarch64-2.24.1.tar.gz",
						"cmd": "./vibe-acp",
						"sha256": "e43913b43f0666df2a42060cd3bd410805b0ca1218843b0c242edf874a78c31a"
					},
					"linux-x86_64": {
						"archive": "https://github.com/mistralai/mistral-vibe/releases/download/v2.24.1/vibe-acp-linux-x86_64-2.24.1.tar.gz",
						"cmd": "./vibe-acp",
						"sha256": "8e87f581e7c292fbeab7377178e947ddc4e83753c409f1db0760631f11d7083c"
					},
					"windows-x86_64": {
						"archive": "https://github.com/mistralai/mistral-vibe/releases/download/v2.24.1/vibe-acp-windows-x86_64-2.24.1.zip",
						"cmd": "./vibe-acp.exe",
						"sha256": "a66329ff18845f8e810359910e8da15bb2071648159c13a10838e5ae7a7d9b81"
					}
				} }
			},
			{
				"id": "nova",
				"name": "Nova",
				"version": "1.1.38",
				"description": "Nova by Compass AI - a fully-fledged software engineer at your command",
				"repository": "https://github.com/Compass-Agentic-Platform/nova",
				"website": "https://www.compassap.ai/portfolio/nova.html",
				"authors": ["Compass AI"],
				"license": "proprietary",
				"license_url": "https://github.com/Compass-Agentic-Platform/nova/blob/main/LICENSE",
				"icon": "https://cdn.agentclientprotocol.com/registry/v1/latest/nova.svg",
				"distribution": { "npx": {
					"package": "@compass-ai/nova@1.1.38",
					"args": ["acp"]
				} }
			},
			{
				"id": "opencode",
				"name": "OpenCode",
				"version": "1.18.30",
				"description": "The open source coding agent",
				"repository": "https://github.com/anomalyco/opencode",
				"website": "https://opencode.ai",
				"authors": ["Anomaly"],
				"license": "MIT",
				"license_url": "https://github.com/anomalyco/opencode/blob/dev/LICENSE",
				"icon": "https://cdn.agentclientprotocol.com/registry/v1/latest/opencode.svg",
				"distribution": { "binary": {
					"darwin-aarch64": {
						"archive": "https://github.com/anomalyco/opencode/releases/download/v1.18.30/opencode-darwin-arm64.zip",
						"cmd": "./opencode",
						"args": ["acp"],
						"sha256": "a5e43d6887386efc7d68ce49ae28e3bbdfdee3dfd1d7169b612c3ce67e53b1e8"
					},
					"darwin-x86_64": {
						"archive": "https://github.com/anomalyco/opencode/releases/download/v1.18.30/opencode-darwin-x64.zip",
						"cmd": "./opencode",
						"args": ["acp"],
						"sha256": "7453007e58ff122401438d95ccb24334874b5908dcaee77883f96c23395d5710"
					},
					"linux-aarch64": {
						"archive": "https://github.com/anomalyco/opencode/releases/download/v1.18.30/opencode-linux-arm64.tar.gz",
						"cmd": "./opencode",
						"args": ["acp"],
						"sha256": "4111a55c2a02c0fac314bd51e9a2330280e6d29d2b85b9554fff6d62612566ed"
					},
					"linux-x86_64": {
						"archive": "https://github.com/anomalyco/opencode/releases/download/v1.18.30/opencode-linux-x64.tar.gz",
						"cmd": "./opencode",
						"args": ["acp"],
						"sha256": "55007246858165496ff85ba1c2b648f7421e8e2013bf4189a680c9ff8e699d17"
					},
					"windows-aarch64": {
						"archive": "https://github.com/anomalyco/opencode/releases/download/v1.18.30/opencode-windows-arm64.zip",
						"cmd": "./opencode",
						"args": ["acp"],
						"sha256": "35d6ff7d80aff5ade71ac06fc32dd89357b5b0bac050fc6db41ecf0929cea560"
					},
					"windows-x86_64": {
						"archive": "https://github.com/anomalyco/opencode/releases/download/v1.18.30/opencode-windows-x64.zip",
						"cmd": "./opencode.exe",
						"args": ["acp"],
						"sha256": "c8c0e0d05ac3dac544a0edfad8de9eb244bf46c6c7a131c38619d40fcf31bd1f"
					}
				} }
			},
			{
				"id": "pi-acp",
				"name": "pi ACP",
				"version": "0.0.33",
				"description": "ACP adapter for pi coding agent",
				"repository": "https://github.com/svkozak/pi-acp",
				"authors": ["Sergii Kozak <svkozak@gmail.com>"],
				"license": "MIT",
				"license_url": "https://github.com/svkozak/pi-acp/blob/main/LICENSE",
				"distribution": { "npx": { "package": "pi-acp@0.0.33" } },
				"icon": "https://cdn.agentclientprotocol.com/registry/v1/latest/pi-acp.svg"
			},
			{
				"id": "poolside",
				"name": "Poolside",
				"version": "1.0.16",
				"description": "Poolside's coding agent",
				"repository": "https://github.com/poolsideai/pool",
				"website": "https://poolside.ai",
				"authors": ["Poolside <feedback@poolside.ai>"],
				"license": "proprietary",
				"license_url": "https://github.com/poolsideai/pool/blob/main/LICENSE.md",
				"distribution": { "binary": {
					"darwin-aarch64": {
						"archive": "https://downloads.poolside.ai/pool/v1.0.16/pool-darwin-arm64.tar.gz",
						"cmd": "./pool-darwin-arm64",
						"args": ["acp"],
						"sha256": "0932af3eb2b57a863acacb664ec8b2b1d3a76c2570a788b086001608cc585f74"
					},
					"darwin-x86_64": {
						"archive": "https://downloads.poolside.ai/pool/v1.0.16/pool-darwin-amd64.tar.gz",
						"cmd": "./pool-darwin-amd64",
						"args": ["acp"],
						"sha256": "6d75fae2d7de6c35b6b467b5f682935e3ecde8ff611cb620c56b7bd607e0afde"
					},
					"linux-aarch64": {
						"archive": "https://downloads.poolside.ai/pool/v1.0.16/pool-linux-arm64.tar.gz",
						"cmd": "./pool-linux-arm64",
						"args": ["acp"],
						"sha256": "466343b66b03ee4e66476fcc69be1eb5bf8e9155a4ab73e0e72a232d1f8d2a12"
					},
					"linux-x86_64": {
						"archive": "https://downloads.poolside.ai/pool/v1.0.16/pool-linux-amd64.tar.gz",
						"cmd": "./pool-linux-amd64",
						"args": ["acp"],
						"sha256": "e86aa8c9feef003540673ab494e91bfadc273218d531c43d662cafb69e464146"
					},
					"windows-aarch64": {
						"archive": "https://downloads.poolside.ai/pool/v1.0.16/pool-windows-arm64.tar.gz",
						"cmd": "./pool-windows-arm64.exe",
						"args": ["acp"],
						"sha256": "8dc7d014ced3e9d3ced240bbc7dabaf696bf59f118bd271d9f4e8561e415d75b"
					},
					"windows-x86_64": {
						"archive": "https://downloads.poolside.ai/pool/v1.0.16/pool-windows-amd64.tar.gz",
						"cmd": "./pool-windows-amd64.exe",
						"args": ["acp"],
						"sha256": "3e324f1a4b5855ba5363232c06461ec9d6d2ae1a341c827221e79779f8f2bc6f"
					}
				} },
				"icon": "https://cdn.agentclientprotocol.com/registry/v1/latest/poolside.svg"
			},
			{
				"id": "qoder",
				"name": "Qoder CLI",
				"version": "0.2.14",
				"description": "AI coding assistant with agentic capabilities",
				"website": "https://qoder.com",
				"authors": ["Qoder AI"],
				"license": "proprietary",
				"license_url": "https://qoder.com/product-service?lang=en",
				"icon": "https://cdn.agentclientprotocol.com/registry/v1/latest/qoder.svg",
				"distribution": { "npx": {
					"package": "@qoder-ai/qodercli@0.2.14",
					"args": ["--acp"]
				} }
			},
			{
				"id": "qwen-code",
				"name": "Qwen Code",
				"version": "0.23.3",
				"description": "Alibaba's Qwen coding assistant",
				"repository": "https://github.com/QwenLM/qwen-code",
				"website": "https://qwenlm.github.io/qwen-code-docs/en/users/overview",
				"authors": ["Alibaba Qwen Team"],
				"license": "Apache-2.0",
				"license_url": "https://github.com/QwenLM/qwen-code/blob/main/LICENSE",
				"distribution": { "npx": {
					"package": "@qwen-code/qwen-code@0.23.3",
					"args": ["--acp", "--experimental-skills"]
				} },
				"icon": "https://cdn.agentclientprotocol.com/registry/v1/latest/qwen-code.svg"
			},
			{
				"id": "sigit",
				"name": "siGit Code",
				"version": "1.5.8",
				"description": "Local-first coding agent. Runs entirely on your machine with optional on-device LLM inference via Onde.",
				"repository": "https://github.com/getsigit/sigit",
				"website": "https://github.com/getsigit/sigit",
				"authors": ["smbCloud"],
				"license": "Apache-2.0",
				"license_url": "https://github.com/getsigit/sigit/blob/main/LICENSE",
				"distribution": {
					"binary": {
						"darwin-aarch64": {
							"archive": "https://github.com/getsigit/sigit/releases/download/v1.5.8/sigit-macos-arm64.tar.gz",
							"cmd": "./sigit",
							"sha256": "a5c07e6588eb9c24cb92fe9dbbb5abe661056a5e0addc17f030b8b4f057a465a"
						},
						"darwin-x86_64": {
							"archive": "https://github.com/getsigit/sigit/releases/download/v1.5.8/sigit-macos-amd64.tar.gz",
							"cmd": "./sigit",
							"sha256": "863deaff2f02e823ec18581e326d50b643f9e8b26d4b87e75e934be877824590"
						},
						"linux-aarch64": {
							"archive": "https://github.com/getsigit/sigit/releases/download/v1.5.8/sigit-linux-arm64",
							"cmd": "./sigit-linux-arm64",
							"sha256": "4ed2f21664a2aafe693649fd2bfb45951b9e1ecd6de3121facc3c6ff9b7f62a8"
						},
						"linux-x86_64": {
							"archive": "https://github.com/getsigit/sigit/releases/download/v1.5.8/sigit-linux-amd64",
							"cmd": "./sigit-linux-amd64",
							"sha256": "fa8cc4bc960a7814f5d2fdec55674a2c8719b3f48d1464d8266edf00a8c6e19b"
						},
						"windows-aarch64": {
							"archive": "https://github.com/getsigit/sigit/releases/download/v1.5.8/sigit-win-arm64.exe",
							"cmd": "./sigit-win-arm64.exe",
							"sha256": "835aa6beebfb304f66d1ac0cc8406fa74dee34484824a161bd394de6f34855bf"
						},
						"windows-x86_64": {
							"archive": "https://github.com/getsigit/sigit/releases/download/v1.5.8/sigit-win-amd64.exe",
							"cmd": "./sigit-win-amd64.exe",
							"sha256": "9db1d50d2234f6c57778e69acb8dcd94cf39e8b28aa179ed2cdad55e4361d307"
						}
					},
					"npx": { "package": "@smbcloud/sigit@1.5.8" }
				},
				"icon": "https://cdn.agentclientprotocol.com/registry/v1/latest/sigit.svg"
			},
			{
				"id": "stakpak",
				"name": "Stakpak",
				"version": "0.3.88",
				"description": "Open-source DevOps agent in Rust with enterprise-grade security",
				"repository": "https://github.com/stakpak/agent",
				"website": "https://stakpak.dev",
				"authors": ["Stakpak Team <contact@stakpak.dev>"],
				"license": "Apache-2.0",
				"license_url": "https://github.com/stakpak/agent/blob/main/LICENSE",
				"icon": "https://cdn.agentclientprotocol.com/registry/v1/latest/stakpak.svg",
				"distribution": { "binary": {
					"darwin-aarch64": {
						"archive": "https://github.com/stakpak/agent/releases/download/v0.3.88/stakpak-darwin-aarch64.tar.gz",
						"cmd": "./stakpak",
						"args": ["acp"]
					},
					"darwin-x86_64": {
						"archive": "https://github.com/stakpak/agent/releases/download/v0.3.88/stakpak-darwin-x86_64.tar.gz",
						"cmd": "./stakpak",
						"args": ["acp"]
					},
					"linux-aarch64": {
						"archive": "https://github.com/stakpak/agent/releases/download/v0.3.88/stakpak-linux-aarch64.tar.gz",
						"cmd": "./stakpak",
						"args": ["acp"]
					},
					"linux-x86_64": {
						"archive": "https://github.com/stakpak/agent/releases/download/v0.3.88/stakpak-linux-x86_64.tar.gz",
						"cmd": "./stakpak",
						"args": ["acp"]
					},
					"windows-x86_64": {
						"archive": "https://github.com/stakpak/agent/releases/download/v0.3.88/stakpak-windows-x86_64.zip",
						"cmd": "./stakpak.exe",
						"args": ["acp"]
					}
				} }
			},
			{
				"id": "vtcode",
				"name": "VT Code",
				"version": "0.96.14",
				"description": "An open-source coding agent with LLM-native code understanding and robust shell safety. Supports multiple LLM providers with automatic failover and efficient context management.",
				"repository": "https://github.com/vinhnx/VTCode",
				"website": "https://github.com/vinhnx/VTCode/blob/main/docs/guides/zed-acp.md",
				"authors": ["vinhnx"],
				"license": "MIT",
				"license_url": "https://github.com/vinhnx/VTCode/blob/main/LICENSE",
				"distribution": { "binary": {
					"darwin-aarch64": {
						"archive": "https://github.com/vinhnx/VTCode/releases/download/0.96.14/vtcode-0.96.14-aarch64-apple-darwin.tar.gz",
						"cmd": "./vtcode",
						"args": ["acp"],
						"env": {
							"VT_ACP_ENABLED": "1",
							"VT_ACP_ZED_ENABLED": "1"
						}
					},
					"darwin-x86_64": {
						"archive": "https://github.com/vinhnx/VTCode/releases/download/0.96.14/vtcode-0.96.14-x86_64-apple-darwin.tar.gz",
						"cmd": "./vtcode",
						"args": ["acp"],
						"env": {
							"VT_ACP_ENABLED": "1",
							"VT_ACP_ZED_ENABLED": "1"
						}
					},
					"linux-x86_64": {
						"archive": "https://github.com/vinhnx/VTCode/releases/download/0.96.14/vtcode-0.96.14-x86_64-unknown-linux-gnu.tar.gz",
						"cmd": "./vtcode",
						"args": ["acp"],
						"env": {
							"VT_ACP_ENABLED": "1",
							"VT_ACP_ZED_ENABLED": "1"
						}
					},
					"windows-x86_64": {
						"archive": "https://github.com/vinhnx/VTCode/releases/download/0.96.14/vtcode-0.96.14-x86_64-pc-windows-msvc.zip",
						"cmd": "vtcode.exe",
						"args": ["acp"],
						"env": {
							"VT_ACP_ENABLED": "1",
							"VT_ACP_ZED_ENABLED": "1"
						}
					}
				} },
				"icon": "https://cdn.agentclientprotocol.com/registry/v1/latest/vtcode.svg"
			}
		];
		//#endregion
		//#region assets/registry/executables.json
		var entries = {
			"agoragentic-acp": {
				"version": "1.3.0",
				"kind": "npx",
				"command": "agoragentic-mcp",
				"args": ["--acp"],
				"env": {}
			},
			"amp-acp": {
				"version": "0.9.0",
				"kind": "binary",
				"manualReason": "host-platform-required",
				"command": "",
				"args": [],
				"env": {}
			},
			"antigravity-acp": {
				"version": "1.1.1",
				"kind": "binary",
				"manualReason": "host-platform-required",
				"command": "",
				"args": [],
				"env": {}
			},
			"auggie": {
				"version": "0.36.0",
				"kind": "npx",
				"command": "auggie",
				"args": ["--acp"],
				"env": { "AUGMENT_DISABLE_AUTO_UPDATE": "1" }
			},
			"autohand": {
				"version": "0.2.1",
				"kind": "npx",
				"command": "autohand-acp",
				"args": [],
				"env": {}
			},
			"claude-acp": {
				"version": "0.77.0",
				"kind": "npx",
				"command": "claude-agent-acp",
				"args": [],
				"env": {}
			},
			"cline": {
				"version": "3.0.61",
				"kind": "npx",
				"command": "cline",
				"args": ["--acp"],
				"env": {}
			},
			"codebuddy-code": {
				"version": "2.150.0",
				"kind": "npx",
				"command": "codebuddy-code",
				"args": ["--acp"],
				"env": {}
			},
			"codex-acp": {
				"version": "1.11.0",
				"kind": "npx",
				"command": "codex-acp",
				"args": [],
				"env": {}
			},
			"cortex-code": {
				"version": "1.0.73",
				"kind": "binary",
				"manualReason": "host-platform-required",
				"command": "",
				"args": ["acp", "serve"],
				"env": {}
			},
			"corust-agent": {
				"version": "0.6.0",
				"kind": "binary",
				"manualReason": "host-platform-required",
				"command": "",
				"args": [],
				"env": {}
			},
			"crow-cli": {
				"version": "0.1.24",
				"kind": "binary",
				"manualReason": "host-platform-required",
				"command": "",
				"args": ["acp"],
				"env": {}
			},
			"cursor": {
				"version": "2026.09.10",
				"kind": "binary",
				"manualReason": "host-platform-required",
				"command": "",
				"args": ["acp"],
				"env": {}
			},
			"deepagents": {
				"version": "0.1.7",
				"kind": "npx",
				"command": "deepagents-acp",
				"args": [],
				"env": {}
			},
			"devin": {
				"version": "3000.10.21",
				"kind": "binary",
				"manualReason": "host-platform-required",
				"command": "",
				"args": ["acp"],
				"env": {}
			},
			"dimcode": {
				"version": "0.5.2",
				"kind": "npx",
				"command": "dimcode",
				"args": ["acp"],
				"env": {}
			},
			"dirac": {
				"version": "0.5.12",
				"kind": "npx",
				"command": "dirac",
				"args": ["--acp"],
				"env": {}
			},
			"factory-droid": {
				"version": "0.218.1",
				"kind": "npx",
				"command": "droid",
				"args": [
					"exec",
					"--output-format",
					"acp-daemon"
				],
				"env": {
					"DROID_DISABLE_AUTO_UPDATE": "true",
					"FACTORY_DROID_AUTO_UPDATE_ENABLED": "false"
				}
			},
			"fast-agent": {
				"version": "0.10.1",
				"kind": "uvx",
				"command": "fast-agent-acp",
				"args": ["-x"],
				"env": { "FAST_AGENT_MODEL": "codexplan" }
			},
			"gemini": {
				"version": "0.59.0",
				"kind": "npx",
				"command": "gemini",
				"args": ["--acp"],
				"env": {}
			},
			"github-copilot-cli": {
				"version": "1.0.83",
				"kind": "npx",
				"command": "copilot",
				"args": ["--acp"],
				"env": {}
			},
			"glm-acp-agent": {
				"version": "1.8.0",
				"kind": "npx",
				"command": "glm-acp-agent",
				"args": [],
				"env": {}
			},
			"goose": {
				"version": "1.50.0",
				"kind": "binary",
				"manualReason": "host-platform-required",
				"command": "",
				"args": ["acp"],
				"env": {}
			},
			"grok-build": {
				"version": "1.0.30",
				"kind": "npx",
				"command": "grok",
				"args": ["agent", "stdio"],
				"env": {}
			},
			"harn": {
				"version": "0.10.135",
				"kind": "binary",
				"manualReason": "host-platform-required",
				"command": "",
				"args": ["serve", "acp"],
				"env": {}
			},
			"junie": {
				"version": "3218.3.0",
				"kind": "binary",
				"manualReason": "host-platform-required",
				"command": "",
				"args": ["--acp=true"],
				"env": {}
			},
			"kilo": {
				"version": "7.6.2",
				"kind": "binary",
				"manualReason": "host-platform-required",
				"command": "",
				"args": ["acp"],
				"env": {}
			},
			"kimchi": {
				"version": "1.1.18",
				"kind": "binary",
				"manualReason": "host-platform-required",
				"command": "",
				"args": ["--mode", "acp"],
				"env": {}
			},
			"kimi": {
				"version": "1.50.0",
				"kind": "binary",
				"manualReason": "host-platform-required",
				"command": "",
				"args": ["acp"],
				"env": {}
			},
			"minimax-code": {
				"version": "0.2.7",
				"kind": "npx",
				"command": "mcode",
				"args": ["acp"],
				"env": {}
			},
			"minion-code": {
				"version": "0.1.44",
				"kind": "uvx",
				"command": "minion-code",
				"args": ["acp"],
				"env": {}
			},
			"mistral-vibe": {
				"version": "2.24.1",
				"kind": "binary",
				"manualReason": "host-platform-required",
				"command": "",
				"args": [],
				"env": {}
			},
			"nova": {
				"version": "1.1.38",
				"kind": "npx",
				"command": "nova",
				"args": ["acp"],
				"env": {}
			},
			"opencode": {
				"version": "1.18.30",
				"kind": "binary",
				"manualReason": "host-platform-required",
				"command": "",
				"args": ["acp"],
				"env": {}
			},
			"pi-acp": {
				"version": "0.0.33",
				"kind": "npx",
				"command": "pi-acp",
				"args": [],
				"env": {}
			},
			"poolside": {
				"version": "1.0.16",
				"kind": "binary",
				"manualReason": "host-platform-required",
				"command": "",
				"args": ["acp"],
				"env": {}
			},
			"qoder": {
				"version": "0.2.14",
				"kind": "npx",
				"command": "qodercli",
				"args": ["--acp"],
				"env": {}
			},
			"qwen-code": {
				"version": "0.23.3",
				"kind": "npx",
				"command": "qwen",
				"args": ["--acp", "--experimental-skills"],
				"env": {}
			},
			"sigit": {
				"version": "1.5.8",
				"kind": "binary",
				"manualReason": "host-platform-required",
				"command": "",
				"args": [],
				"env": {}
			},
			"stakpak": {
				"version": "0.3.88",
				"kind": "binary",
				"manualReason": "host-platform-required",
				"command": "",
				"args": ["acp"],
				"env": {}
			},
			"vtcode": {
				"version": "0.96.14",
				"kind": "binary",
				"manualReason": "host-platform-required",
				"command": "",
				"args": ["acp"],
				"env": {
					"VT_ACP_ENABLED": "1",
					"VT_ACP_ZED_ENABLED": "1"
				}
			}
		};
		//#endregion
		//#region src/client/data/catalog.ts
		/** Build-time registry catalog. No runtime network or host-platform assumptions. */
		/** registry.json 的 agents 数组（CI 已校验；这里收窄为最小只读面）。 */
		const registryAgents = agents;
		/** executables.json sidecar 的 entries（agent id → PATH 可执行名预填）。 */
		const executableEntries = entries;
		/** Display guidance absent from the registry, not launch configuration. */
		const LOGIN_HINTS = {
			devin: "devin auth login",
			codex: "codex login",
			kimi: "kimi login",
			claude: "claude",
			codebuddy: "codebuddy"
		};
		/** Known installed CLI names for binary distributions; never archive paths. */
		const INSTALLED_BINARY_COMMANDS = {
			devin: "devin",
			kimi: "kimi"
		};
		/** Curated adapter regression/live-smoke coverage, not certification of registry versions.
		* Keep this explicit: adding a runtime binding does not establish verification.
		*/
		const VERIFIED_ADAPTER_IDS = [
			"devin",
			"codebuddy-code",
			"codex-acp",
			"kimi",
			"claude-acp",
			"antigravity-acp",
			"qwen-code"
		];
		/** npx/uvx 分发的安装指引（spawn 姿态不变：只做展示，不自动安装）。 */
		function installHintOf(agent) {
			const distribution = agent.distribution;
			if (distribution?.binary !== void 0) return agent.website ?? Object.entries(distribution.binary).map(([platform, entry]) => `${platform}: ${entry?.archive ?? ""}`).join("\n");
			if (distribution?.npx !== void 0) return `npm install -g ${distribution.npx.package ?? agent.id}`;
			if (distribution?.uvx !== void 0) return `uv tool install ${distribution.uvx.package ?? agent.id}`;
			return agent.website ?? agent.id;
		}
		/**
		* 全量 catalog：已验证适配条目排前，其余按 registry 顺序。合成是
		* 纯数据变换，模块加载时执行一次。
		*/
		const ACP_CATALOG_ENTRIES = buildCatalogEntries(registryAgents, executableEntries);
		function buildCatalogEntries(registryAgents, executableEntries) {
			const entries = [];
			for (const agent of registryAgents) {
				const executable = executableEntries[agent.id];
				const runtime = runtimeForCatalogId(agent.id);
				const command = executable?.kind === "binary" ? INSTALLED_BINARY_COMMANDS[agent.id] ?? executable.command : executable?.command ?? "";
				const args = executable?.args ?? [];
				entries.push({
					id: agent.id,
					name: agent.name,
					version: executable?.version ?? agent.version,
					installHint: installHintOf(agent),
					command,
					verification: VERIFIED_ADAPTER_IDS.includes(agent.id) ? "adapter-tested" : "unverified",
					args: [...args],
					env: { ...executable?.env },
					requiresCommand: command === "",
					...runtime === void 0 ? {} : {
						runtime,
						...LOGIN_HINTS[runtime] === void 0 ? {} : { loginHint: LOGIN_HINTS[runtime] }
					}
				});
			}
			entries.sort((left, right) => {
				const leftRank = VERIFIED_ADAPTER_IDS.indexOf(left.id);
				const rightRank = VERIFIED_ADAPTER_IDS.indexOf(right.id);
				return (leftRank < 0 ? VERIFIED_ADAPTER_IDS.length : leftRank) - (rightRank < 0 ? VERIFIED_ADAPTER_IDS.length : rightRank);
			});
			return entries;
		}
		/** Look up one catalog entry by registry agent id (the add-menu rows are rendered from the list). */
		function catalogEntryOf(id) {
			return ACP_CATALOG_ENTRIES.find((entry) => entry.id === id);
		}
		//#endregion
		//#region src/contract/remote.ts
		/** ACP agent 配置的五态 wire 词表；消费层从此 client-safe contract 派生。 */
		const ACP_AGENT_CONFIG_STATES = [
			"saved-unverified",
			"ready",
			"auth-required",
			"unavailable",
			"incompatible"
		];
		//#endregion
		//#region src/client/data/logic.ts
		/**
		* Pure settings-panel validation and defensive Remote payload decoding.
		*
		* No DOM, fetch, React, or Host implementation imports. Profile identities and
		* wire shapes follow the shared browser-safe contracts; decoders reject
		* malformed payloads before they reach the view.
		* @module @zaimokuza/dsh-acp-adapter/client/logic
		*/
		/** Env var name: POSIX shell identifier. */
		const ACP_ENV_KEY_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
		/**
		* Mask likely secret env values in the editor. Existing values travel through
		* `maskedEnv` and are preserved on save unless explicitly replaced or removed.
		* This display rule does not control the Host subprocess environment.
		*/
		const ACP_SECRET_ENV_KEY_PATTERN = /KEY|PASSWORD|SECRET|TOKEN/i;
		function isPlainObject(value) {
			if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
			const proto = Object.getPrototypeOf(value);
			return proto === Object.prototype || proto === null;
		}
		/** A blank draft for the manual-add flow. */
		function emptyDraft() {
			return {
				id: "",
				name: "",
				command: "",
				argsText: "",
				envText: "",
				loginHint: ""
			};
		}
		/** Display-only guidance: preserve saved hints and fall back to catalog metadata. */
		function agentLoginHint(id, config) {
			return config.loginHint?.trim() || catalogEntryOf(catalogIdOf(id, config))?.loginHint;
		}
		/**
		* Seed the editor from a catalog entry（add-menu 按 {@link ACP_CATALOG_ENTRIES}
		* 逐条渲染；catalog 条目来自 data/catalog.ts，见该模块头注释）。未知 id
		* 返回 undefined——菜单只从列表渲染，正常不可达；调用方据此不打开编辑器。
		*/
		function draftFromCatalogEntry(entryId) {
			const entry = catalogEntryOf(entryId);
			if (entry === void 0) return void 0;
			return {
				id: entry.id,
				name: entry.name,
				command: entry.command,
				argsText: formatArgsText(entry.args),
				envText: formatEnvText(entry.env),
				loginHint: entry.loginHint ?? "",
				catalogId: entry.id,
				...entry.runtime === void 0 ? {} : { runtime: entry.runtime }
			};
		}
		/** Seed the editor from a stored agent (the row's 编辑 button)。 */
		function draftFromAgent(id, config) {
			const visibleEnv = {};
			const maskedEnv = {};
			for (const [key, value] of Object.entries(config.env)) if (ACP_SECRET_ENV_KEY_PATTERN.test(key)) maskedEnv[key] = value;
			else visibleEnv[key] = value;
			return {
				id,
				name: config.name,
				...config.catalogId === void 0 && (effectiveRuntimeOf(id, config) !== void 0 || catalogEntryOf(id) === void 0) ? {} : { catalogId: catalogIdOf(id, config) },
				command: config.command,
				argsText: formatArgsText(config.args),
				envText: formatEnvText(visibleEnv),
				loginHint: config.loginHint ?? "",
				...Object.keys(maskedEnv).length === 0 ? {} : { maskedEnv },
				...config.runtime === void 0 ? {} : { runtime: config.runtime }
			};
		}
		/**
		* 移除草稿里一条掩码 env 键（UI 的「移除」按钮）。返回新草稿对象；
		* 移除最后一个键时 `maskedEnv` 字段整体缺席（保持「无掩码 = 字段不在」的
		* 单一形态，validate/序列化两侧都不用特判空对象）。
		*/
		function dropMaskedEnvKey(draft, key) {
			if (draft.maskedEnv === void 0 || !(key in draft.maskedEnv)) return draft;
			const next = { ...draft.maskedEnv };
			delete next[key];
			const { maskedEnv: _dropped, ...rest } = draft;
			return Object.keys(next).length === 0 ? rest : {
				...rest,
				maskedEnv: next
			};
		}
		/**
		* Parse the args textarea: one argument per line, each line trimmed, blank
		* lines dropped. A line's interior whitespace is the user's to keep.
		*/
		function parseArgsText(text) {
			return text.split("\n").map((line) => line.trim()).filter((line) => line !== "");
		}
		/** Render stored args as the editor's one-per-line text. */
		function formatArgsText(args) {
			return args.join("\n");
		}
		/**
		* Parse the env textarea: one `KEY=VALUE` per line (split on the FIRST `=`),
		* blank lines ignored, key trimmed and required to be a shell identifier,
		* value kept verbatim after the line trim.
		* @param text - the staged env text.
		* @returns the env map, or the first offending line (1-based).
		*/
		function parseEnvText(text) {
			const env = {};
			const lines = text.split("\n");
			for (let index = 0; index < lines.length; index += 1) {
				const line = lines[index].trim();
				if (line === "") continue;
				const eq = line.indexOf("=");
				const key = (eq < 0 ? line : line.slice(0, eq)).trim();
				if (!ACP_ENV_KEY_PATTERN.test(key)) return {
					ok: false,
					failure: {
						line: index + 1,
						reason: "key"
					}
				};
				if (Object.hasOwn(env, key)) return {
					ok: false,
					failure: {
						line: index + 1,
						reason: "duplicate"
					}
				};
				env[key] = eq < 0 ? "" : line.slice(eq + 1);
			}
			return {
				ok: true,
				env
			};
		}
		/** Render a stored env map as the editor's `KEY=VALUE` text (insertion order). */
		function formatEnvText(env) {
			return Object.entries(env).map(([key, value]) => `${key}=${value}`).join("\n");
		}
		/**
		* Validate a staged draft against the host schema's rules plus id uniqueness
		* and the built-in runtime singleton（同一内置 runtime 至多一个 profile，
		* client 侧先检——host schema 的同款跨条目拒绝兜底绕过 UI 的直写）。
		* The row being edited keeps its own id/runtime (`editingId`) without tripping
		* the taken checks.
		* @param draft - the staged text.
		* @param agents - the stored agents map（id 唯一性与 runtime 冲突的共同事实源）.
		* @param editingId - the id whose row is being edited, undefined while adding.
		* @returns per-field errors and, when clean, the parsed config.
		*/
		function validateAgentDraft(draft, agents, editingId) {
			const id = draft.id.trim();
			const name = draft.name.trim();
			const command = draft.command.trim();
			const loginHint = draft.loginHint.trim();
			const validation = {};
			if (id === "") validation.id = { key: "errorIdRequired" };
			else if (!ACP_AGENT_ID_PATTERN.test(id)) validation.id = { key: "errorIdInvalid" };
			else if (id !== editingId && Object.hasOwn(agents, id)) validation.id = { key: "errorIdTaken" };
			if (name === "") validation.name = { key: "errorNameRequired" };
			if (command === "") validation.command = { key: "errorCommandRequired" };
			const parsedEnv = parseEnvText(draft.envText);
			if (!parsedEnv.ok) validation.env = {
				key: parsedEnv.failure.reason === "key" ? "errorEnvKey" : "errorEnvDuplicate",
				params: { line: parsedEnv.failure.line }
			};
			const draftRuntime = effectiveRuntimeOf(id, draft);
			if (draftRuntime !== void 0) for (const [existingId, existing] of Object.entries(agents)) {
				if (existingId === editingId) continue;
				if (effectiveRuntimeOf(existingId, existing) !== draftRuntime) continue;
				validation.runtime = {
					key: "errorRuntimeTaken",
					params: {
						runtime: draftRuntime,
						id: existingId,
						name: existing.name
					}
				};
				break;
			}
			if (validation.id !== void 0 || validation.name !== void 0 || validation.command !== void 0 || validation.env !== void 0 || validation.runtime !== void 0 || !parsedEnv.ok) return validation;
			return {
				...validation,
				config: {
					name,
					command,
					args: parseArgsText(draft.argsText),
					env: {
						...draft.maskedEnv,
						...parsedEnv.env
					},
					...loginHint === "" ? {} : { loginHint },
					...draft.runtime === void 0 ? {} : { runtime: draft.runtime },
					...draft.catalogId === void 0 ? {} : { catalogId: draft.catalogId }
				}
			};
		}
		/** Agent ids in the registry's canonical display order. */
		function sortedAgentIds(agents) {
			return Object.keys(agents).sort((left, right) => left.localeCompare(right));
		}
		/** Project one scope snapshot into the panel's settings state. */
		function panelSettingsOf(snapshot) {
			return {
				status: snapshot.status === "ready" ? "ready" : snapshot.status === "unavailable" ? "unavailable" : snapshot.revision === void 0 ? "loading" : "invalid",
				writable: snapshot.writable,
				agents: snapshot.value?.agents ?? {},
				toolApprovalDefault: snapshot.value?.toolApprovalDefault ?? "auto",
				revision: snapshot.revision
			};
		}
		/**
		* Validate a dshAcp Remote `health` view payload. Wire boundary: the whole
		* payload is refused (undefined) rather than partially shown when any row
		* violates the contract.
		*/
		function decodeHealthResponse(body) {
			if (!isPlainObject(body)) return void 0;
			const providers = body["providers"];
			if (!Array.isArray(providers)) return void 0;
			const rows = [];
			for (const raw of providers) {
				const row = decodeHealthRow(raw);
				if (row === void 0) return void 0;
				rows.push(row);
			}
			return rows;
		}
		function decodeHealthRow(raw) {
			if (!isPlainObject(raw)) return void 0;
			const { id, name, command, args, loginHint, executable, version, state, probe } = raw;
			if (typeof id !== "string" || typeof name !== "string" || typeof command !== "string") return void 0;
			if (!Array.isArray(args) || !args.every((arg) => typeof arg === "string")) return void 0;
			if (!(typeof loginHint === "string" || loginHint === null)) return void 0;
			if (typeof executable !== "boolean") return void 0;
			if (!(typeof version === "string" || version === null)) return void 0;
			if (typeof state !== "string" || !ACP_AGENT_CONFIG_STATES.includes(state)) return void 0;
			const probeRow = decodeProbeRow(probe);
			if (probeRow === void 0) return void 0;
			return {
				id,
				name,
				command,
				args,
				loginHint,
				executable,
				version,
				state,
				probe: probeRow
			};
		}
		function decodeProbeRow(raw) {
			if (!isPlainObject(raw)) return void 0;
			const status = raw["status"];
			if (status === "never") return raw["at"] === null ? {
				status: "never",
				at: null
			} : void 0;
			if (typeof raw["at"] !== "number") return void 0;
			if (status === "ok") {
				const modelCount = raw["modelCount"];
				const authMethods = raw["authMethods"];
				if (typeof modelCount !== "number") return void 0;
				if (!(authMethods === null || Array.isArray(authMethods) && authMethods.every(isAuthMethod))) return void 0;
				const agentInfo = decodeAgentInfo(raw["agentInfo"]);
				if (agentInfo === void 0) return void 0;
				const capabilities = decodeCapabilityFacts(raw["capabilities"]);
				if (capabilities === void 0) return void 0;
				const cleanup = decodeProbeCleanup(raw["cleanup"]);
				if (cleanup === void 0) return void 0;
				const capabilityHash = raw["capabilityHash"];
				if (!(capabilityHash === null || typeof capabilityHash === "string")) return void 0;
				const protocolVersion = raw["protocolVersion"];
				if (!(protocolVersion === null || typeof protocolVersion === "number")) return void 0;
				const versionCompatibility = raw["versionCompatibility"];
				if (!(versionCompatibility === null || versionCompatibility === "current" || versionCompatibility === "different" || versionCompatibility === "unknown")) return void 0;
				const matrix = decodeCapabilityMatrix(raw["matrix"]);
				if (matrix === void 0) return void 0;
				return {
					status: "ok",
					at: raw["at"],
					modelCount,
					authMethods,
					agentInfo,
					capabilities,
					cleanup,
					capabilityHash,
					protocolVersion,
					versionCompatibility,
					matrix
				};
			}
			if (status === "error") {
				const failureKind = raw["failureKind"];
				const message = raw["message"];
				const phase = raw["phase"];
				if (typeof failureKind !== "string" || typeof message !== "string") return void 0;
				if (!(phase === null || phase === "initialize" || phase === "session")) return void 0;
				return {
					status: "error",
					at: raw["at"],
					failureKind,
					message,
					phase
				};
			}
		}
		/** agentInfo 字段：null 或 {name, version}（其余键剥离）。 */
		function decodeAgentInfo(raw) {
			if (raw === null) return null;
			if (!isPlainObject(raw)) return void 0;
			const { name, version } = raw;
			if (typeof name !== "string" || typeof version !== "string") return void 0;
			return {
				name,
				version
			};
		}
		/** capabilities 字段：null 或九键全 boolean 的事实对象（其余键剥离）。 */
		function decodeCapabilityFacts(raw) {
			if (raw === null) return null;
			if (!isPlainObject(raw)) return void 0;
			const keys = [
				"loadSession",
				"sessionList",
				"sessionClose",
				"sessionDelete",
				"promptImage",
				"promptAudio",
				"promptEmbeddedContext",
				"mcpHttp",
				"mcpSse"
			];
			const facts = {};
			for (const key of keys) {
				const value = raw[key];
				if (typeof value !== "boolean") return void 0;
				facts[key] = value;
			}
			return facts;
		}
		const CLEANUP_STEPS = [
			"done",
			"not-advertised",
			"failed"
		];
		/** cleanup 字段：null 词表或三态齐全的事实对象；其余形态整行拒绝。 */
		function decodeProbeCleanup(raw) {
			if (raw === null) return null;
			if (!isPlainObject(raw)) return void 0;
			const close = CLEANUP_STEPS.find((step) => step === raw["close"]);
			const del = CLEANUP_STEPS.find((step) => step === raw["delete"]);
			if (close === void 0 || del === void 0) return void 0;
			const message = raw["message"];
			if (!(message === null || typeof message === "string")) return void 0;
			return {
				close,
				delete: del,
				message
			};
		}
		function isAuthMethod(raw) {
			return isPlainObject(raw) && typeof raw["id"] === "string" && typeof raw["name"] === "string";
		}
		const MATRIX_STATUSES = [
			"supported",
			"degraded",
			"unsupported"
		];
		/**
		* matrix 字段：probe-ok 的必填键，行数组逐行严检（id/adapterPath
		* string、advertised boolean|null、hostSeam string|null、status 词表内、
		* note 缺席或 string）；任一畸形整行拒绝 → health 响应整体失格
		* （decodeHealthResponse 同款口径）。
		*/
		function decodeCapabilityMatrix(raw) {
			if (!Array.isArray(raw)) return void 0;
			const rows = [];
			for (const item of raw) {
				if (!isPlainObject(item)) return void 0;
				const { id, advertised, adapterPath, hostSeam, status, note } = item;
				if (typeof id !== "string") return void 0;
				if (!(advertised === null || typeof advertised === "boolean")) return void 0;
				if (typeof adapterPath !== "string") return void 0;
				if (!(hostSeam === null || typeof hostSeam === "string")) return void 0;
				if (typeof status !== "string" || !MATRIX_STATUSES.includes(status)) return void 0;
				if (note !== void 0 && typeof note !== "string") return void 0;
				rows.push({
					id,
					advertised,
					adapterPath,
					hostSeam,
					status,
					...typeof note === "string" ? { note } : {}
				});
			}
			return rows;
		}
		/**
		* boundSessions 应答的严格解码（wire 边界纪律与 decodeHealthResponse 同款：
		* 畸形/错型整体拒绝归 undefined——计数是删除确认的增强提示，缺失时面板退回
		* 无计数的基础文案，绝不拿解码失败冒充 0）。
		*/
		function decodeBoundSessions(body) {
			if (!isPlainObject(body)) return void 0;
			const { agentId, count } = body;
			if (typeof agentId !== "string" || !ACP_AGENT_ID_PATTERN.test(agentId)) return void 0;
			if (typeof count !== "number" || !Number.isInteger(count) || count < 0) return void 0;
			return {
				agentId,
				count
			};
		}
		/** Match one health row to a settings agent id (undefined when the response does not cover it). */
		function healthRowOf(rows, id) {
			return rows.find((row) => row.id === id);
		}
		/** Any thrown value → a displayable message. */
		function errorMessageOf(error) {
			return error instanceof Error ? error.message : String(error);
		}
		//#endregion
		//#region src/client/data/controller.ts
		/**
		* The ACP settings panel's controller: the one impure seam between the
		* pure logic module and the component tree. It owns the settings-scope
		* subscription and the dshAcp Remote calls (the bypass-endpoint
		* fetches are gone). Every decision is
		* delegated to logic.ts; this file only moves data.
		*
		* store discipline: the controller is glue, not a store. It keeps the
		* authoritative private projection (revision fencing and refresh guards read
		* it) and publishes every transition through the baked store actions bound at
		* `attach` time — the plugin bundle configuration entry declares `store:
		* createAcpPanelStore`, and the inject factory receives the framework-baked
		* actions and hands them here. Attach replays the full projection (`resync`)
		* so a re-created entry store catches up in one publish; while unattached the
		* controller still tracks state and simply has no mirror.
		* @module @zaimokuza/dsh-acp-adapter/client/controller
		*/
		var AcpPanelController = class {
			scopeSnapshot;
			health = {
				status: "idle",
				rows: [],
				fetchedAt: void 0,
				message: void 0,
				checkingAgentIds: [],
				agentErrors: {}
			};
			sink = null;
			unsubscribeScope;
			remote;
			write;
			refusedMessage;
			constructor(deps) {
				this.scopeSnapshot = deps.scope.getSnapshot();
				this.write = deps.mutate;
				this.refusedMessage = deps.refusedMessage;
				this.remote = deps.remote;
				this.unsubscribeScope = deps.scope.subscribe(() => {
					this.scopeSnapshot = deps.scope.getSnapshot();
					this.sink?.settingsMirrored(panelSettingsOf(this.scopeSnapshot));
				});
			}
			/**
			* Bind the framework-baked store actions (inject factory) and replay the
			* authoritative projection into the fresh store. Re-attach replaces the
			* sink and resyncs again (entry reload path).
			* @param actions - the panel store's baked write set.
			*/
			attach(actions) {
				this.sink = actions;
				this.sink.resync(this.project());
			}
			/** Drop the scope subscription and the mirror; the controller publishes nothing afterwards. */
			dispose() {
				this.unsubscribeScope();
				this.sink = null;
			}
			/**
			* Call the `dshAcp/health` Remote method. Concurrent refreshes fold into the
			* in-flight one; any failure — transport, host-side throw, or a
			* contract-violating payload — lands in 'unreachable' with its message, the
			* graceful-degradation posture for an absent host half.
			* @param recheck - true = 「重新检查」（收尾：host 丢弃 probe 缓存并重探，
			*   面板按钮路径）；false/省略 = 只读缓存视图（面板打开路径，不 spawn probe）。
			*/
			async refreshHealth(recheck = false) {
				if (this.health.status === "loading" || this.health.checkingAgentIds.length > 0) return;
				this.health = {
					...this.health,
					status: "loading",
					message: void 0,
					checkingAgentIds: [],
					agentErrors: {}
				};
				this.sink?.healthLoading();
				try {
					const result = await this.remote.health(recheck ? { recheck: true } : void 0);
					if (!result.ok) {
						this.failHealth(result.error.message);
						return;
					}
					const rows = decodeHealthResponse(result.value);
					if (rows === void 0) {
						this.failHealth("malformed dshAcp/health payload");
						return;
					}
					const fetchedAt = Date.now();
					this.health = {
						status: "ready",
						rows,
						fetchedAt,
						message: void 0,
						checkingAgentIds: [],
						agentErrors: {}
					};
					this.sink?.healthReady(rows, fetchedAt);
				} catch (error) {
					this.failHealth(errorMessageOf(error));
				}
			}
			/**
			* Re-probe exactly one configured agent. Different agents may run in
			* parallel; the same agent and a panel-wide refresh are deduplicated. Only
			* the returned target row is merged, preventing out-of-order concurrent
			* responses from rolling another agent back to an older snapshot.
			*/
			async refreshAgentHealth(agentId) {
				if (this.health.status === "loading" || this.health.checkingAgentIds.includes(agentId)) return;
				this.health = {
					...this.health,
					checkingAgentIds: [...this.health.checkingAgentIds, agentId].sort(),
					agentErrors: withoutKey(this.health.agentErrors, agentId)
				};
				this.sink?.agentHealthLoading(agentId);
				try {
					const result = await this.remote.health({
						recheck: true,
						agentId
					});
					if (!result.ok) {
						this.failAgentHealth(agentId, result.error.message);
						return;
					}
					const row = decodeHealthResponse(result.value)?.find((candidate) => candidate.id === agentId);
					if (row === void 0) {
						this.failAgentHealth(agentId, `health response did not contain agent ${JSON.stringify(agentId)}`);
						return;
					}
					const fetchedAt = Date.now();
					this.health = {
						...this.health,
						status: "ready",
						rows: mergeHealthRow(this.health.rows, row),
						fetchedAt,
						message: void 0,
						checkingAgentIds: this.health.checkingAgentIds.filter((id) => id !== agentId),
						agentErrors: withoutKey(this.health.agentErrors, agentId)
					};
					this.sink?.agentHealthReady(agentId, row, fetchedAt);
				} catch (error) {
					this.failAgentHealth(agentId, errorMessageOf(error));
				}
			}
			/**
			* Write one agent (add, edit, or rename) through the settings wire, fenced
			* by the revision the panel read at. A rename is one atomic mutate (unset +
			* set), so a refused pair cannot strand a half-moved entry. The draft MUST
			* already pass validation — the form gates its save button on it; a failure
			* here is a wiring bug and throws rather than degrading into a silent no-op.
			* @param editingId - the row being edited (undefined while adding).
			* @param draft - the staged form text.
			* @returns the host's refusal message, or undefined once the write landed.
			*/
			async saveAgent(editingId, draft) {
				const validation = validateAgentDraft(draft, this.scopeSnapshot.value?.agents ?? {}, editingId);
				if (validation.config === void 0) throw new Error(`AcpPanelController.saveAgent called with an invalid draft (first failure: ${validation.id?.key ?? validation.name?.key ?? validation.command?.key ?? validation.env?.key ?? validation.runtime?.key ?? "unknown"})`);
				const id = draft.id.trim();
				const ops = editingId !== void 0 && editingId !== id ? [{
					op: "unset",
					path: ["agents", editingId]
				}, {
					op: "set",
					path: ["agents", id],
					value: {
						...validation.config,
						args: [...validation.config.args]
					}
				}] : [{
					op: "set",
					path: ["agents", id],
					value: {
						...validation.config,
						args: [...validation.config.args]
					}
				}];
				return this.mutate(ops);
			}
			/**
			* Remove one agent. The unset names its path, so a stale panel cannot delete
			* a row it is not looking at beyond the revision fence.
			* @param id - the agent to remove.
			* @returns the host's refusal message, or undefined once the removal landed.
			*/
			async deleteAgent(id) {
				return this.mutate([{
					op: "unset",
					path: ["agents", id]
				}]);
			}
			/** Persist the default approval behavior for DSH native tools in new sessions. */
			async setToolApprovalDefault(policy) {
				if (policy !== "auto" && policy !== "ask") throw new TypeError("Invalid DSH tool approval policy");
				return this.mutate([{
					op: "set",
					path: ["toolApprovalDefault"],
					value: policy
				}]);
			}
			/**
			* 删除确认提示：该 profile 的既有会话 binding 计数（dshAcp/boundSessions）。
			* RPC 失败/载荷畸形/应答张冠李戴一律归 undefined——计数是确认的增强提示
			* 而非删除门，缺失时面板退回无计数的基础文案（绝不把失败冒充成 0）。
			*/
			async countBoundSessions(id) {
				try {
					const result = await this.remote.boundSessions(id);
					if (!result.ok) return void 0;
					const view = decodeBoundSessions(result.value);
					return view !== void 0 && view.agentId === id ? view.count : void 0;
				} catch {
					return;
				}
			}
			async mutate(ops) {
				const revision = this.scopeSnapshot.revision;
				try {
					return await this.write(ops, revision) ? void 0 : this.refusedMessage();
				} catch (error) {
					return errorMessageOf(error);
				}
			}
			failHealth(message) {
				this.health = {
					...this.health,
					status: "unreachable",
					message,
					checkingAgentIds: []
				};
				this.sink?.healthUnreachable(message);
			}
			failAgentHealth(agentId, message) {
				this.health = {
					...this.health,
					checkingAgentIds: this.health.checkingAgentIds.filter((id) => id !== agentId),
					agentErrors: {
						...this.health.agentErrors,
						[agentId]: message
					}
				};
				this.sink?.agentHealthFailed(agentId, message);
			}
			project() {
				return {
					settings: panelSettingsOf(this.scopeSnapshot),
					health: this.health
				};
			}
		};
		function withoutKey(values, key) {
			const next = { ...values };
			delete next[key];
			return next;
		}
		function mergeHealthRow(rows, row) {
			const index = rows.findIndex((candidate) => candidate.id === row.id);
			if (index < 0) return [...rows, row].sort((left, right) => left.id.localeCompare(right.id));
			return rows.map((candidate, candidateIndex) => candidateIndex === index ? row : candidate);
		}
		//#endregion
		//#region src/client/data/managed-routes.ts
		/** Client-side ownership catalogue derived from the plugin's authoritative
		* profile registry. A naming prefix is never an ownership claim. */
		var ManagedAcpRouteCatalog = class {
			scope;
			routes = /* @__PURE__ */ new Set();
			durableRoutes;
			unsubscribe;
			constructor(scope, durableRoutes = []) {
				this.scope = scope;
				this.durableRoutes = new Set(durableRoutes);
				this.routes = new Set(this.durableRoutes);
				this.refresh();
				this.unsubscribe = scope.subscribe(() => {
					this.refresh();
				});
			}
			owns = (provider) => provider !== void 0 && this.routes.has(provider);
			dispose() {
				this.unsubscribe();
				this.routes.clear();
			}
			refresh() {
				const agents = this.scope.getSnapshot().value?.agents;
				if (agents === void 0) return;
				this.routes = /* @__PURE__ */ new Set([...this.durableRoutes, ...Object.keys(agents).map((id) => `acp-${id}`)]);
			}
		};
		//#endregion
		//#region src/client/data/stores/panel-store.ts
		const initialPanelState = () => ({
			settings: {
				status: "loading",
				writable: false,
				agents: {},
				toolApprovalDefault: "auto",
				revision: void 0
			},
			health: {
				status: "idle",
				rows: [],
				fetchedAt: void 0,
				message: void 0,
				checkingAgentIds: [],
				agentErrors: {}
			}
		});
		/** The panel's complete write set — every glue publish routes through one of these. */
		const panelActions = {
			/** Mirror the settings scope's current projection (scope subscription + attach resync). */
			settingsMirrored(draft, settings) {
				draft.settings = settings;
			},
			/** A health refresh started (concurrent refreshes fold in the glue). */
			healthLoading(draft) {
				draft.health.status = "loading";
				draft.health.message = void 0;
				draft.health.checkingAgentIds = [];
				draft.health.agentErrors = {};
			},
			/** A refresh landed: rows replace wholesale, the error clears. */
			healthReady(draft, rows, fetchedAt) {
				draft.health = {
					status: "ready",
					rows,
					fetchedAt,
					message: void 0,
					checkingAgentIds: [],
					agentErrors: {}
				};
			},
			/** A refresh failed (network/HTTP/malformed): keep the last good rows, surface the message. */
			healthUnreachable(draft, message) {
				draft.health.status = "unreachable";
				draft.health.message = message;
				draft.health.checkingAgentIds = [];
			},
			/** One card started a targeted probe; other cards remain interactive. */
			agentHealthLoading(draft, agentId) {
				if (!draft.health.checkingAgentIds.includes(agentId)) {
					draft.health.checkingAgentIds.push(agentId);
					draft.health.checkingAgentIds.sort();
				}
				delete draft.health.agentErrors[agentId];
			},
			/** Merge only the checked row so concurrent checks cannot overwrite each other. */
			agentHealthReady(draft, agentId, row, fetchedAt) {
				draft.health.status = "ready";
				draft.health.message = void 0;
				draft.health.checkingAgentIds = draft.health.checkingAgentIds.filter((id) => id !== agentId);
				delete draft.health.agentErrors[agentId];
				const index = draft.health.rows.findIndex((candidate) => candidate.id === agentId);
				draft.health.rows = index < 0 ? [...draft.health.rows, row].sort((left, right) => left.id.localeCompare(right.id)) : draft.health.rows.map((candidate, candidateIndex) => candidateIndex === index ? row : candidate);
				draft.health.fetchedAt = fetchedAt;
			},
			/** A targeted transport/contract failure belongs to that card, not the whole panel. */
			agentHealthFailed(draft, agentId, message) {
				draft.health.checkingAgentIds = draft.health.checkingAgentIds.filter((id) => id !== agentId);
				draft.health.agentErrors[agentId] = message;
			},
			/**
			* Wholesale projection resync: the attach path replays the glue's
			* authoritative state into a fresh store in one publish.
			*/
			resync(draft, next) {
				draft.settings = next.settings;
				draft.health = next.health;
			}
		};
		/**
		* The exclusive-factory registration currency of the panel's store seat.
		* @returns a fresh handle (one per entry — never share at module level).
		*/
		function createAcpPanelStore() {
			return (0, _deepseek_ai_dsh_client_store.defineStore)({
				init: initialPanelState,
				actions: panelActions
			});
		}
		//#endregion
		//#region src/client/data/diagnostics.ts
		/** Stable references are safe to retain while locale-specific host prose is not. */
		function diagnosticReference(message) {
			if (message === void 0) return void 0;
			return message.match(/acperr-\d{8}T\d{6}Z-[0-9a-z]+-[0-9a-f]{6,16}\b/i)?.[0] ?? message.match(/\bACP_[A-Z0-9_]+\b/)?.[0];
		}
		/** Render an optional diagnostic reference as a locale-neutral suffix. */
		function diagnosticReferenceSuffix(message) {
			const reference = diagnosticReference(message);
			return reference === void 0 ? "" : ` (${reference})`;
		}
		/**
		* Localize an operation failure without interpolating arbitrary host prose.
		* Agent-authored messages are not passed through this helper.
		*/
		function localizedDiagnostic(t, key, rawMessage, params = {}) {
			return t(key, {
				...params,
				reference: diagnosticReferenceSuffix(rawMessage)
			});
		}
		//#endregion
		//#region \0dsh-css:C:\Users\liaoz\Documents\interests\development\dsh-plugins\dsh-acp-adapter\src\client\ui\AcpSection.module.css.mjs
		const css$2 = ".nr3ipG_section{width:100%;min-width:0;color:var(--dsw-alias-label-primary);flex-direction:column;gap:12px;display:flex}.nr3ipG_sectionTitle{flex-wrap:wrap;align-items:center;gap:8px;margin:0;font-size:14px;font-weight:500;line-height:20px;display:flex}.nr3ipG_preferences{border-top:.5px solid var(--dsw-alias-border-l2);flex-direction:column;gap:10px;min-width:0;padding-top:16px;display:flex}.nr3ipG_preferencesTitle{margin:0;font-size:14px;font-weight:500;line-height:20px}.nr3ipG_notice{color:var(--dsw-alias-state-warn-label);margin:0;font-size:12px;line-height:18px}.nr3ipG_error{color:var(--dsw-alias-state-error-primary);margin:0;font-size:12px;line-height:18px}.nr3ipG_hint{color:var(--dsw-alias-label-tertiary);margin:0;font-size:12px;line-height:18px}.nr3ipG_addActions{flex-wrap:wrap;gap:8px;min-width:0;display:flex}.nr3ipG_addMenu{flex:1 1 0;min-width:180px}.nr3ipG_catalogGeometryProbe{width:0;height:max(12px, var(--dsh-frame-overlay-top,12px));visibility:hidden;pointer-events:none;contain:strict;position:fixed;top:0;left:-10000px}.nr3ipG_catalogMenu{width:min(var(--acp-catalog-menu-width,180px), calc(100vw - 24px));min-width:0;max-width:calc(100vw - 24px);max-height:var(--acp-catalog-menu-max-height,calc(100vh - 12px - max(12px, var(--dsh-frame-overlay-top,12px))))}.nr3ipG_catalogEntry{justify-content:space-between;align-items:baseline;gap:12px;min-width:0;display:flex}.nr3ipG_catalogName{text-overflow:ellipsis;white-space:nowrap;min-width:0;overflow:hidden}.nr3ipG_catalogVersion{color:var(--dsw-alias-label-tertiary);flex:none;font-size:12px}.nr3ipG_addButton{box-sizing:border-box;border:1px dashed var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-md);min-width:min(180px,100%);height:40px;color:var(--dsw-alias-label-primary);font:inherit;cursor:pointer;background:0 0;flex:1 1 0;justify-content:center;align-items:center;gap:6px;padding:0 12px;font-size:14px;line-height:22px;display:inline-flex}.nr3ipG_addMenu .nr3ipG_addButton{width:100%;min-width:0}.nr3ipG_addButton:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}.nr3ipG_addButton:disabled{opacity:.4;cursor:default}.nr3ipG_addButton:focus-visible{box-shadow:0 0 0 2px var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline:none}.nr3ipG_approvalButton{box-sizing:border-box;border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-layer-1);width:min(100%,360px);min-height:40px;color:var(--dsw-alias-label-primary);font:inherit;text-align:left;cursor:pointer;justify-content:space-between;align-items:center;gap:12px;padding:8px 12px;font-size:14px;line-height:22px;display:inline-flex}.nr3ipG_approvalButton:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}.nr3ipG_approvalButton:focus-visible{box-shadow:0 0 0 2px var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline:none}.nr3ipG_approvalButton:disabled{opacity:.5;cursor:default}.nr3ipG_chevron{transition:transform var(--ds-transition-duration-fast) var(--ds-ease-in-out);display:inline-flex}.nr3ipG_chevronFlip{transform:rotate(180deg)}@media (prefers-reduced-motion:reduce){.nr3ipG_chevron{transition:none}}.nr3ipG_rows{flex-direction:column;gap:8px;margin:0;padding:0;list-style:none;display:flex}.nr3ipG_rowCard{border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md);flex-direction:column;gap:12px;padding:12px 14px;display:flex}.nr3ipG_rowHead{flex-wrap:wrap;align-items:center;gap:10px;display:flex}.nr3ipG_rowIdentity{flex-wrap:wrap;align-items:center;gap:6px;min-width:0;display:inline-flex}.nr3ipG_rowName{overflow-wrap:anywhere;min-width:0;font-size:14px;font-weight:500;line-height:22px}.nr3ipG_rowActions{flex-wrap:wrap;align-items:center;gap:4px;margin-left:auto;display:inline-flex}.nr3ipG_healthMuted{color:var(--dsw-alias-label-tertiary)}.nr3ipG_maskedEnvRows{flex-direction:column;gap:4px;margin:0;padding:0;list-style:none;display:flex}.nr3ipG_maskedEnvRow{align-items:center;gap:8px;font-size:12px;line-height:18px;display:flex}.nr3ipG_maskedEnvKey{font-family:var(--ds-font-family-code,monospace);color:var(--dsw-alias-label-primary);overflow-wrap:anywhere}.nr3ipG_editor{border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-module-platform);flex-direction:column;gap:14px;padding:14px 16px;display:flex}.nr3ipG_editorHeader{align-items:baseline;gap:8px;display:flex}.nr3ipG_editorTitle{font-size:14px;font-weight:500;line-height:22px}.nr3ipG_field{flex-direction:column;gap:6px;display:flex}.nr3ipG_advancedToggle{color:var(--dsw-alias-label-secondary);font:inherit;cursor:pointer;background:0 0;border:none;align-self:flex-start;align-items:center;gap:4px;padding:0;font-size:12px;line-height:18px;display:inline-flex}.nr3ipG_advancedToggle:hover{color:var(--dsw-alias-label-primary)}.nr3ipG_advancedToggle:focus-visible{box-shadow:0 0 0 2px var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline:none}.nr3ipG_advancedFields{flex-direction:column;gap:14px;min-width:0;padding-top:2px;display:flex}.nr3ipG_fieldLabel{color:var(--dsw-alias-label-secondary);font-size:12px;font-weight:500;line-height:18px}.nr3ipG_input{min-width:0}.nr3ipG_input:has(input:disabled){opacity:.6}.nr3ipG_input.nr3ipG_inputInvalid{border-color:var(--dsw-alias-state-error-primary)}.nr3ipG_textarea{box-sizing:border-box;border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);width:100%;min-height:64px;font-family:var(--ds-font-family-code,monospace);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);resize:vertical;padding:6px 10px;font-size:12px;line-height:18px}.nr3ipG_textarea:focus{border-color:var(--dsw-alias-brand-primary)}.nr3ipG_textarea:disabled{opacity:.6;cursor:default}.nr3ipG_textareaInvalid{border-color:var(--dsw-alias-state-error-primary)}.nr3ipG_editorActions{justify-content:flex-end;gap:8px;display:flex}.nr3ipG_dangerButton{color:var(--dsw-alias-state-error-primary)}.nr3ipG_dangerButton:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover-danger)}.nr3ipG_deleteBlock{border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);flex-wrap:wrap;align-items:center;gap:8px;padding:8px 10px;display:flex}.nr3ipG_deleteText{color:var(--dsw-alias-state-error-primary);flex:100%;margin:0;font-size:12px;line-height:18px}";
		const tagId$2 = "@zaimokuza/dsh-acp-adapter/AcpSection.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$2) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@zaimokuza/dsh-acp-adapter";
			tag.dataset.pluginCss = tagId$2;
			tag.textContent = css$2;
			document.head.appendChild(tag);
		}
		var AcpSection_module_css_default = {
			"addActions": "nr3ipG_addActions",
			"addButton": "nr3ipG_addButton",
			"addMenu": "nr3ipG_addMenu",
			"advancedFields": "nr3ipG_advancedFields",
			"advancedToggle": "nr3ipG_advancedToggle",
			"approvalButton": "nr3ipG_approvalButton",
			"catalogEntry": "nr3ipG_catalogEntry",
			"catalogGeometryProbe": "nr3ipG_catalogGeometryProbe",
			"catalogMenu": "nr3ipG_catalogMenu",
			"catalogName": "nr3ipG_catalogName",
			"catalogVersion": "nr3ipG_catalogVersion",
			"chevron": "nr3ipG_chevron",
			"chevronFlip": "nr3ipG_chevronFlip",
			"dangerButton": "nr3ipG_dangerButton",
			"deleteBlock": "nr3ipG_deleteBlock",
			"deleteText": "nr3ipG_deleteText",
			"editor": "nr3ipG_editor",
			"editorActions": "nr3ipG_editorActions",
			"editorHeader": "nr3ipG_editorHeader",
			"editorTitle": "nr3ipG_editorTitle",
			"error": "nr3ipG_error",
			"field": "nr3ipG_field",
			"fieldLabel": "nr3ipG_fieldLabel",
			"healthMuted": "nr3ipG_healthMuted",
			"hint": "nr3ipG_hint",
			"input": "nr3ipG_input",
			"inputInvalid": "nr3ipG_inputInvalid",
			"maskedEnvKey": "nr3ipG_maskedEnvKey",
			"maskedEnvRow": "nr3ipG_maskedEnvRow",
			"maskedEnvRows": "nr3ipG_maskedEnvRows",
			"notice": "nr3ipG_notice",
			"preferences": "nr3ipG_preferences",
			"preferencesTitle": "nr3ipG_preferencesTitle",
			"rowActions": "nr3ipG_rowActions",
			"rowCard": "nr3ipG_rowCard",
			"rowHead": "nr3ipG_rowHead",
			"rowIdentity": "nr3ipG_rowIdentity",
			"rowName": "nr3ipG_rowName",
			"rows": "nr3ipG_rows",
			"section": "nr3ipG_section",
			"sectionTitle": "nr3ipG_sectionTitle",
			"textarea": "nr3ipG_textarea",
			"textareaInvalid": "nr3ipG_textareaInvalid"
		};
		//#endregion
		//#region src/client/ui/AcpSection.ts
		/**
		* The ACP plugin detail panel component tree.
		*
		* Thin presentation only: every decision (validation, parsing, health/login
		* derivation, CRUD semantics) lives in logic.ts, and every side effect
		* (settings writes, dshAcp Remote calls) in controller.ts. Components
		* receive the `t`/`useStore`/`panel` inject face and keep only interactive
		* state (open editor, staged draft text, delete confirmation, busy flags) —
		* the ModelsSection/CustomProviderCard precedent. : state rides the
		* entry's store seat (`useStore` over AcpPanelSnapshot; the PropsStore
		* `actions` share is the glue-only write set, unused here); the wire
		* callbacks arrive as the `panel` member so the reserved PropsStore `actions`
		* seat is never shadowed. Written with createElement because the frozen
		* tsconfig has no `jsx` option (see react.d.ts); classes come from
		* AcpSection.module.css ( CSS Modules).
		* @module @zaimokuza/dsh-acp-adapter/client/AcpSection
		*/
		/**
		* Render the ACP section content column.
		* @param props - slot-delivered inject face.
		* @returns the section, or null while the shell has not injected yet (ModelsSection precedent).
		*/
		function AcpSection(props) {
			const { t, useStore, panel } = props;
			if (t === void 0 || useStore === void 0 || panel === void 0) return null;
			return (0, react.createElement)(Loaded, {
				t,
				useStore,
				panel
			});
		}
		/**
		* Owns only the catalog anchor's measurement lifecycle. The actual menu stays
		* the native Menu primitive; this Fragment adds a zero-layout probe so the
		* resolved frame overlay token, rather than a copied host formula, drives its
		* available height.
		*/
		function CatalogAnchor({ open, disabled, menuId, className, probeClassName, icon, label, onToggle, onMeasure, onClear }) {
			const buttonRef = (0, react.useRef)(null);
			const probeRef = (0, react.useRef)(null);
			const lastSide = (0, react.useRef)(null);
			(0, react.useLayoutEffect)(() => {
				if (!open) return;
				const button = buttonRef.current;
				const probe = probeRef.current;
				if (button === null || probe === null) return;
				let eventFrame;
				let animationFrame;
				let stopped = false;
				let lastWidth = "";
				let lastHeight = "";
				let lastList = null;
				const measure = () => {
					const rect = button.getBoundingClientRect();
					const resolvedOverlayTop = Number.parseFloat(getComputedStyle(probe).height);
					const overlayTop = Number.isFinite(resolvedOverlayTop) ? resolvedOverlayTop : 12;
					const below = Math.max(0, window.innerHeight - rect.bottom - 16);
					const above = Math.max(0, rect.top - overlayTop - 4);
					const side = below >= above ? "bottom" : "top";
					const width = `${rect.width}px`;
					const height = `${side === "bottom" ? below : above}px`;
					if (lastList !== null && !lastList.isConnected) lastList = null;
					const list = lastList ?? document.getElementsByClassName(menuId).item(0);
					if (list !== null) {
						if (list !== lastList) {
							lastWidth = "";
							lastHeight = "";
							lastList = list;
						}
						if (width !== lastWidth) {
							if (list.style.getPropertyValue("--acp-catalog-menu-width") !== width) list.style.setProperty("--acp-catalog-menu-width", width);
							lastWidth = width;
						}
						if (height !== lastHeight) {
							if (list.style.getPropertyValue("--acp-catalog-menu-max-height") !== height) list.style.setProperty("--acp-catalog-menu-max-height", height);
							lastHeight = height;
						}
					}
					const sideChanged = lastSide.current !== side;
					if (sideChanged) lastSide.current = side;
					onMeasure(rect, side, sideChanged);
				};
				const schedule = () => {
					if (eventFrame === void 0) eventFrame = window.requestAnimationFrame(() => {
						eventFrame = void 0;
						measure();
					});
				};
				const tick = () => {
					if (stopped) return;
					measure();
					animationFrame = window.requestAnimationFrame(tick);
				};
				measure();
				animationFrame = window.requestAnimationFrame(tick);
				const observer = typeof ResizeObserver === "undefined" ? void 0 : new ResizeObserver(schedule);
				observer?.observe(button);
				observer?.observe(probe);
				window.addEventListener("scroll", schedule, true);
				window.addEventListener("resize", schedule);
				return () => {
					stopped = true;
					if (eventFrame !== void 0) window.cancelAnimationFrame(eventFrame);
					if (animationFrame !== void 0) window.cancelAnimationFrame(animationFrame);
					observer?.disconnect();
					window.removeEventListener("scroll", schedule, true);
					window.removeEventListener("resize", schedule);
					onClear();
				};
			}, [
				menuId,
				onClear,
				onMeasure,
				open
			]);
			return (0, react.createElement)(react.Fragment, null, (0, react.createElement)("div", {
				ref: probeRef,
				className: probeClassName,
				"aria-hidden": true
			}), (0, react.createElement)("button", {
				type: "button",
				className,
				ref: buttonRef,
				disabled,
				"aria-haspopup": "menu",
				"aria-expanded": open,
				onClick: onToggle
			}, icon, label));
		}
		function Loaded({ t, useStore, panel }) {
			const snapshot = useStore((value) => value);
			const [editor, setEditor] = (0, react.useState)(null);
			const editorKey = (0, react.useRef)(0);
			const [approvalSaving, setApprovalSaving] = (0, react.useState)(false);
			const [approvalSaveFailed, setApprovalSaveFailed] = (0, react.useState)(false);
			const [approvalMenuOpen, setApprovalMenuOpen] = (0, react.useState)(false);
			const [addMenuOpen, setAddMenuOpen] = (0, react.useState)(false);
			const [addMenuSide, setAddMenuSide] = (0, react.useState)("bottom");
			const addAnchorRect = (0, react.useRef)(null);
			const catalogMenuId = `acp-catalog-${(0, react.useId)().replaceAll(":", "")}`;
			const onCatalogMeasure = (0, react.useCallback)((rect, side, sideChanged) => {
				addAnchorRect.current = rect;
				if (sideChanged) setAddMenuSide(side);
			}, []);
			const clearCatalogAnchor = (0, react.useCallback)(() => {
				addAnchorRect.current = null;
			}, []);
			(0, react.useEffect)(() => {
				panel.refreshHealth();
			}, [panel]);
			const closeEditor = (key, changed) => {
				setEditor((previous) => previous?.key === key ? null : previous);
				if (changed) panel.notifyOutcome?.("saved");
			};
			const openAdd = (seed) => {
				setEditor({
					key: ++editorKey.current,
					mode: "add",
					seed
				});
			};
			const openEdit = (id) => {
				if (editor?.mode === "edit" && editor.id === id) setEditor(null);
				else setEditor({
					key: ++editorKey.current,
					mode: "edit",
					id
				});
			};
			const onDeleted = (id) => {
				setEditor((previous) => previous?.mode === "edit" && previous.id === id ? null : previous);
				panel.notifyOutcome?.("deleted");
			};
			const openExisting = (id) => {
				setEditor({
					key: ++editorKey.current,
					mode: "edit",
					id
				});
			};
			const settings = snapshot.settings;
			const children = [];
			if (settings.status !== "ready") {
				const key = settings.status === "loading" ? "settingsLoading" : settings.status === "unavailable" ? "settingsUnavailable" : "settingsInvalid";
				const cls = settings.status === "invalid" ? AcpSection_module_css_default.error : AcpSection_module_css_default.hint;
				children.push((0, react.createElement)("p", {
					key: "status",
					className: cls
				}, t(key)));
				return (0, react.createElement)("div", {
					className: AcpSection_module_css_default.section,
					"data-dsh-acp-panel": ""
				}, children);
			}
			const readOnly = !settings.writable;
			const agents = settings.agents;
			const ids = sortedAgentIds(agents);
			children.push((0, react.createElement)("h2", {
				key: "agents-title",
				className: AcpSection_module_css_default.sectionTitle
			}, t("agentConfiguration")));
			const onApprovalDefaultChange = async (policy) => {
				if (policy !== "auto" && policy !== "ask") return;
				setApprovalSaving(true);
				setApprovalSaveFailed(false);
				try {
					if (await panel.setToolApprovalDefault(policy) !== void 0) setApprovalSaveFailed(true);
				} catch {
					setApprovalSaveFailed(true);
				} finally {
					setApprovalSaving(false);
				}
			};
			if (readOnly) children.push((0, react.createElement)("p", {
				key: "ro",
				className: AcpSection_module_css_default.notice
			}, t("readOnly")));
			if (snapshot.health.status === "unreachable") {
				children.push((0, react.createElement)("p", {
					key: "unreachable",
					className: AcpSection_module_css_default.notice
				}, t("healthUnreachable")));
				if (snapshot.health.message !== void 0) children.push((0, react.createElement)("p", {
					key: "unreachable-detail",
					className: AcpSection_module_css_default.hint
				}, localizedDiagnostic(t, "healthCheckTransportFailed", snapshot.health.message)));
			}
			const refreshing = snapshot.health.status === "loading";
			const checkingAnyAgent = snapshot.health.checkingAgentIds.length > 0;
			if (ids.length === 0 && editor?.mode !== "add") children.push((0, react.createElement)("p", {
				key: "empty",
				className: AcpSection_module_css_default.hint
			}, t("emptyAgents")));
			if (ids.length > 0) children.push((0, react.createElement)("ul", {
				key: "rows",
				className: AcpSection_module_css_default.rows
			}, ids.map((id) => {
				const config = agents[id];
				const editing = editor?.mode === "edit" && editor.id === id;
				return (0, react.createElement)(AgentCard, {
					key: id,
					t,
					id,
					config,
					health: snapshot.health,
					readOnly,
					editing,
					agents,
					panel,
					editorKey: editor?.mode === "edit" && editor.id === id ? editor.key : -1,
					onEdit: () => {
						openEdit(id);
					},
					onDeleted,
					onCloseEditor: (changed) => closeEditor(editor?.key ?? -1, changed),
					onOpenAgent: openExisting
				});
			})));
			if (editor?.mode === "add") children.push((0, react.createElement)("div", {
				key: "add",
				className: AcpSection_module_css_default.rowCard
			}, (0, react.createElement)(AgentForm, {
				key: `add-form-${editor.key}`,
				t,
				initial: editor.seed,
				editingId: void 0,
				agents,
				readOnly,
				panel,
				editorKey: editor.key,
				onClose: closeEditor,
				onOpenAgent: openExisting
			})));
			const customAgentItemId = "custom";
			const verified = ACP_CATALOG_ENTRIES.filter((entry) => entry.verification === "adapter-tested");
			const unverified = ACP_CATALOG_ENTRIES.filter((entry) => entry.verification === "unverified");
			const catalogItem = (entry) => ({
				id: entry.id,
				label: (0, react.createElement)("span", {
					className: AcpSection_module_css_default.catalogEntry,
					title: entry.name
				}, (0, react.createElement)("span", { className: AcpSection_module_css_default.catalogName }, entry.name), entry.version === void 0 ? null : (0, react.createElement)("span", { className: AcpSection_module_css_default.catalogVersion }, ` · ${entry.version}`))
			});
			children.push((0, react.createElement)("div", {
				key: "actions",
				className: AcpSection_module_css_default.addActions
			}, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
				open: addMenuOpen,
				portal: true,
				dense: true,
				autoFocus: true,
				className: AcpSection_module_css_default.addMenu ?? "",
				listClassName: `${AcpSection_module_css_default.catalogMenu ?? ""} ${catalogMenuId}`,
				side: addMenuSide,
				items: [
					...verified.length === 0 ? [] : [{
						type: "label",
						id: "verified-label",
						text: t("catalogVerified", { count: verified.length })
					}],
					...verified.map(catalogItem),
					...verified.length === 0 || unverified.length === 0 ? [] : [{
						type: "separator",
						id: "verification-divider"
					}],
					...unverified.length === 0 ? [] : [{
						type: "label",
						id: "unverified-label",
						text: t("catalogUnverified", { count: unverified.length })
					}],
					...unverified.map(catalogItem)
				],
				footer: [{
					type: "label",
					id: "verification-scope",
					text: t("catalogVerificationScope")
				}, {
					id: customAgentItemId,
					label: (0, react.createElement)("span", { className: AcpSection_module_css_default.catalogEntry }, t("addCustom"))
				}],
				onClose: () => {
					setAddMenuOpen(false);
				},
				onSelect: (id) => {
					setAddMenuOpen(false);
					if (id === customAgentItemId) {
						openAdd(emptyDraft());
						return;
					}
					const seed = draftFromCatalogEntry(id);
					if (seed !== void 0) openAdd(seed);
				},
				anchor: (0, react.createElement)(CatalogAnchor, {
					open: addMenuOpen,
					disabled: readOnly,
					menuId: catalogMenuId,
					className: AcpSection_module_css_default.addButton ?? "",
					probeClassName: AcpSection_module_css_default.catalogGeometryProbe ?? "",
					icon: (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutlineMedium, { size: 14 }),
					label: t("addAgent"),
					onToggle: () => setAddMenuOpen((previous) => !previous),
					onMeasure: onCatalogMeasure,
					onClear: clearCatalogAnchor
				})
			}), (0, react.createElement)("button", {
				type: "button",
				className: AcpSection_module_css_default.addButton,
				disabled: refreshing || checkingAnyAgent,
				onClick: () => {
					panel.refreshHealth(true);
				}
			}, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.IconRefreshOutlineMedium, { size: 14 }), t(refreshing ? "refreshing" : "refresh"))));
			children.push((0, react.createElement)("section", {
				key: "tool-approval",
				className: AcpSection_module_css_default.preferences,
				"aria-labelledby": "dsh-acp-approval-title"
			}, (0, react.createElement)("h2", {
				id: "dsh-acp-approval-title",
				className: AcpSection_module_css_default.preferencesTitle
			}, t("toolApprovalDefault")), (0, react.createElement)("p", { className: AcpSection_module_css_default.hint }, t("toolApprovalDefaultHelp")), (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Menu, {
				open: approvalMenuOpen,
				portal: true,
				dense: true,
				autoFocus: true,
				side: "bottom",
				align: "start",
				selectedId: settings.toolApprovalDefault,
				items: [{
					id: "auto",
					label: (0, react.createElement)("span", { className: AcpSection_module_css_default.catalogEntry }, t("toolApprovalAuto"))
				}, {
					id: "ask",
					label: (0, react.createElement)("span", { className: AcpSection_module_css_default.catalogEntry }, t("toolApprovalAsk"))
				}],
				onClose: () => setApprovalMenuOpen(false),
				onSelect: (id) => {
					setApprovalMenuOpen(false);
					onApprovalDefaultChange(id);
				},
				anchor: (0, react.createElement)("button", {
					type: "button",
					className: AcpSection_module_css_default.approvalButton,
					disabled: readOnly || approvalSaving,
					"aria-label": t("toolApprovalDefault"),
					"aria-haspopup": "menu",
					"aria-expanded": approvalMenuOpen,
					onClick: () => setApprovalMenuOpen((value) => !value)
				}, t(settings.toolApprovalDefault === "auto" ? "toolApprovalAuto" : "toolApprovalAsk"), (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutlineMedium, null))
			}), approvalSaveFailed ? (0, react.createElement)("p", {
				className: AcpSection_module_css_default.error,
				role: "alert"
			}, t("toolApprovalSaveFailed")) : null));
			return (0, react.createElement)("div", {
				className: AcpSection_module_css_default.section,
				"data-dsh-acp-panel": ""
			}, children);
		}
		/** 一个已配置 Agent：默认只展示名称、可操作状态和管理动作。 */
		function AgentCard(props) {
			const { t, id, config, panel } = props;
			const [confirming, setConfirming] = (0, react.useState)(false);
			const [deleting, setDeleting] = (0, react.useState)(false);
			const [failure, setFailure] = (0, react.useState)(void 0);
			const [boundCount, setBoundCount] = (0, react.useState)(void 0);
			const boundCountGeneration = (0, react.useRef)(0);
			(0, react.useEffect)(() => () => {
				boundCountGeneration.current += 1;
			}, []);
			const checking = props.health.status === "loading" || props.health.checkingAgentIds.includes(id);
			const checkError = props.health.agentErrors[id];
			const confirmDelete = () => {
				setDeleting(true);
				setFailure(void 0);
				panel.deleteAgent(id).then((message) => {
					if (message !== void 0) {
						panel.notifyOutcome?.("delete-failed");
						setFailure(localizedDiagnostic(t, "actionDeleteFailed", message));
						return;
					}
					props.onDeleted(id);
				}).catch((error) => {
					panel.notifyOutcome?.("delete-failed");
					setFailure(localizedDiagnostic(t, "actionDeleteFailed", errorMessageOf(error)));
				}).finally(() => {
					setDeleting(false);
				});
			};
			const healthRow = healthRowOf(props.health.rows, id);
			const state = healthRow?.state;
			const statusText = state === void 0 ? t("stateSavedUnverified") : stateText(t, state);
			const statusTone = state === "ready" ? "success" : "neutral";
			const diagnostic = healthDiagnostic(t, config.command, healthRow, checkError);
			const children = [(0, react.createElement)("div", {
				key: "head",
				className: AcpSection_module_css_default.rowHead
			}, (0, react.createElement)("span", { className: AcpSection_module_css_default.rowIdentity }, (0, react.createElement)("span", { className: AcpSection_module_css_default.rowName }, config.name), (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Tag, { tone: statusTone }, statusText)), (0, react.createElement)("span", { className: AcpSection_module_css_default.rowActions }, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				variant: "outline",
				size: "sm",
				disabled: checking,
				onClick: () => {
					panel.refreshAgentHealth(id);
				}
			}, t(checking ? "refreshing" : "refresh")), (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				variant: "outline",
				size: "sm",
				onClick: props.onEdit
			}, t("edit")), (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				variant: "ghost",
				size: "sm",
				className: AcpSection_module_css_default.dangerButton,
				disabled: props.readOnly || deleting,
				onClick: () => {
					setFailure(void 0);
					setBoundCount(void 0);
					setConfirming(true);
					const generation = ++boundCountGeneration.current;
					panel.countBoundSessions(id).then((count) => {
						if (boundCountGeneration.current === generation) setBoundCount(count);
					}).catch(() => {
						if (boundCountGeneration.current === generation) setBoundCount(void 0);
					});
				}
			}, t("remove"))))];
			if (healthRow?.probe.status === "ok" && healthRow.probe.versionCompatibility === "different") {
				const reference = catalogEntryOf(catalogIdOf(id, config))?.version;
				children.push((0, react.createElement)("p", {
					key: "version-reference",
					className: AcpSection_module_css_default.hint
				}, t("catalogVersionDifferent", {
					actual: healthRow.probe.agentInfo?.version ?? healthRow.version ?? "—",
					reference: reference ?? "—"
				})));
			}
			if (diagnostic !== void 0) children.push((0, react.createElement)("p", {
				key: "diagnostic",
				className: AcpSection_module_css_default.error,
				role: "alert"
			}, diagnostic));
			if (state === "auth-required") {
				const hint = agentLoginHint(id, config);
				children.push((0, react.createElement)("p", {
					key: "login-hint",
					className: AcpSection_module_css_default.hint
				}, hint === void 0 ? t("loginGenericInstruction") : t("loginInstruction", { hint })));
			}
			if (state === "incompatible") children.push((0, react.createElement)("p", {
				key: "incompatible-hint",
				className: AcpSection_module_css_default.hint
			}, t("incompatibleInstruction")));
			if (confirming) children.push((0, react.createElement)("div", {
				key: "delete",
				className: AcpSection_module_css_default.deleteBlock
			}, (0, react.createElement)("p", { className: AcpSection_module_css_default.deleteText }, t("removeConfirm", { name: config.name })), boundCount === void 0 || boundCount === 0 ? null : (0, react.createElement)("p", { className: AcpSection_module_css_default.deleteText }, t("removeConfirmBound", { count: boundCount })), failure === void 0 ? null : (0, react.createElement)("p", { className: AcpSection_module_css_default.error }, failure), (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				variant: "ghost",
				className: AcpSection_module_css_default.dangerButton,
				disabled: deleting,
				onClick: confirmDelete
			}, t(deleting ? "removing" : "remove")), (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				variant: "outline",
				disabled: deleting,
				onClick: () => {
					boundCountGeneration.current += 1;
					setConfirming(false);
				}
			}, t("cancel"))));
			if (props.editing) children.push((0, react.createElement)(AgentForm, {
				key: `edit-${id}-${props.editorKey}`,
				t,
				initial: draftFromAgent(id, config),
				editingId: id,
				agents: props.agents,
				readOnly: props.readOnly,
				panel,
				editorKey: props.editorKey,
				onClose: (_key, changed) => props.onCloseEditor(changed),
				onOpenAgent: props.onOpenAgent
			}));
			return (0, react.createElement)("li", {
				className: AcpSection_module_css_default.rowCard,
				"data-dsh-acp-agent": props.id
			}, children);
		}
		/** Localize product-owned probe failures from stable facts; never render host prose verbatim. */
		function healthDiagnostic(t, command, health, transportError) {
			if (transportError !== void 0) return localizedDiagnostic(t, "healthCheckTransportFailed", transportError);
			if (health?.probe.status !== "error") return void 0;
			return localizedDiagnostic(t, health.probe.failureKind === "spawn-failure" ? "probeNotInstalled" : health.probe.failureKind === "auth_required" ? "probeAuthRequired" : health.probe.failureKind === "resource-exhausted" ? "probeResourceExhausted" : health.probe.failureKind === "timeout" ? "probeTimeout" : health.probe.failureKind === "crash" ? "probeCrash" : health.probe.failureKind === "aborted" ? "probeCancelled" : "probeProtocolError", health.probe.message, { command });
		}
		/**
		* 产品状态只承诺“未探测 / 协议可用”。失败类别仍通过下方诊断和登录
		* 指引展示，但不会伪装成可持续跟踪的外部登录状态。
		*/
		function stateText(t, state) {
			return t(state === "ready" ? "stateReady" : "stateSavedUnverified");
		}
		/** The add/edit editor card: staged text fields validated live, saved through the controller. */
		function AgentForm(props) {
			const { t } = props;
			const [draft, setDraft] = (0, react.useState)(() => props.initial);
			const [busy, setBusy] = (0, react.useState)(false);
			const [attempted, setAttempted] = (0, react.useState)(false);
			const [failure, setFailure] = (0, react.useState)(void 0);
			const [advancedOpen, setAdvancedOpen] = (0, react.useState)(() => props.initial.runtime === void 0);
			const [optionsOpen, setOptionsOpen] = (0, react.useState)(false);
			const disabled = props.readOnly || busy;
			const validation = validateAgentDraft(draft, props.agents, props.editingId);
			const scope = props.editingId ?? "new";
			const edit = (patch) => {
				setDraft((previous) => ({
					...previous,
					...patch
				}));
				setFailure(void 0);
			};
			const save = () => {
				setAttempted(true);
				if (validation.config === void 0) return;
				setBusy(true);
				setFailure(void 0);
				props.panel.saveAgent(props.editingId, draft).then((message) => {
					if (message !== void 0) {
						props.panel.notifyOutcome?.("save-failed");
						setFailure(localizedDiagnostic(t, "actionSaveFailed", message));
						return;
					}
					props.onClose(props.editorKey, true);
				}).catch((error) => {
					props.panel.notifyOutcome?.("save-failed");
					setFailure(localizedDiagnostic(t, "actionSaveFailed", errorMessageOf(error)));
				}).finally(() => {
					setBusy(false);
				});
			};
			const shown = (error, value) => error !== void 0 && (attempted || value.trim() !== "") ? error : void 0;
			const seededEntry = props.editingId === void 0 ? catalogEntryOf(draft.catalogId ?? draft.id) : void 0;
			const loginHint = agentLoginHint(draft.id, draft);
			const envCount = draft.envText.split("\n").filter((line) => line.trim()).length + Object.keys(draft.maskedEnv ?? {}).length;
			return (0, react.createElement)("div", { className: AcpSection_module_css_default.editor }, (0, react.createElement)("div", { className: AcpSection_module_css_default.editorHeader }, (0, react.createElement)("span", { className: AcpSection_module_css_default.editorTitle }, t(props.editingId === void 0 ? "editorTitleAdd" : "editorTitleEdit"))), props.editingId === void 0 && seededEntry !== void 0 ? (0, react.createElement)("p", {
				key: "install-hint",
				className: AcpSection_module_css_default.hint
			}, t("catalogInstallHint", { hint: seededEntry.installHint })) : null, seededEntry?.requiresCommand ? (0, react.createElement)("p", { className: AcpSection_module_css_default.hint }, t("catalogManualCommand")) : null, textField({
				t,
				id: `dsh-acp-${scope}-name`,
				label: t("fieldName"),
				hint: t("fieldNameHint"),
				error: shown(validation.name, draft.name),
				value: draft.name,
				disabled,
				placeholder: "Devin",
				onChange: (value) => {
					edit({ name: value });
				}
			}), (0, react.createElement)("button", {
				type: "button",
				className: AcpSection_module_css_default.advancedToggle,
				"aria-expanded": advancedOpen,
				onClick: () => {
					setAdvancedOpen((previous) => !previous);
				}
			}, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutlineMedium, {
				size: 14,
				className: advancedOpen ? `${AcpSection_module_css_default.chevron} ${AcpSection_module_css_default.chevronFlip}` : AcpSection_module_css_default.chevron
			}), t("advancedSettings")), advancedOpen ? (0, react.createElement)("div", { className: AcpSection_module_css_default.advancedFields }, textField({
				t,
				id: `dsh-acp-${scope}-id`,
				label: t("fieldId"),
				hint: t("fieldIdHint"),
				error: shown(validation.id, draft.id),
				value: draft.id,
				disabled,
				placeholder: "devin",
				onChange: (value) => {
					edit({ id: value });
				}
			}), textField({
				t,
				id: `dsh-acp-${scope}-command`,
				label: t("fieldCommand"),
				hint: t("fieldCommandHint"),
				error: shown(validation.command, draft.command),
				value: draft.command,
				disabled,
				placeholder: "devin",
				onChange: (value) => {
					edit({ command: value });
				}
			}), textField({
				t,
				id: `dsh-acp-${scope}-args`,
				label: t("fieldArgs"),
				hint: t("fieldArgsHint"),
				value: draft.argsText,
				disabled,
				multiline: true,
				placeholder: "acp",
				onChange: (value) => {
					edit({ argsText: value });
				}
			}), (0, react.createElement)("p", { className: AcpSection_module_css_default.hint }, loginHint === void 0 ? t("loginGenericInstruction") : t("loginSetupInstruction", { hint: loginHint }))) : null, (0, react.createElement)("button", {
				type: "button",
				className: AcpSection_module_css_default.advancedToggle,
				"aria-expanded": optionsOpen,
				onClick: () => {
					setOptionsOpen((previous) => !previous);
				}
			}, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutlineMedium, {
				size: 14,
				className: optionsOpen ? `${AcpSection_module_css_default.chevron} ${AcpSection_module_css_default.chevronFlip}` : AcpSection_module_css_default.chevron
			}), t("advancedOptions")), envCount === 0 ? null : (0, react.createElement)("p", { className: AcpSection_module_css_default.hint }, t("advancedOptionsConfigured", { envCount })), optionsOpen ? (0, react.createElement)("div", { className: AcpSection_module_css_default.advancedFields }, (0, react.createElement)("p", { className: AcpSection_module_css_default.hint }, t("advancedOptionsHint")), textField({
				t,
				id: `dsh-acp-${scope}-env`,
				label: t("fieldEnv"),
				hint: t("fieldEnvHint"),
				error: validation.env,
				value: draft.envText,
				disabled,
				multiline: true,
				placeholder: "NO_COLOR=1",
				onChange: (value) => {
					edit({ envText: value });
				}
			}), draft.maskedEnv === void 0 ? null : (0, react.createElement)("div", { className: AcpSection_module_css_default.field }, (0, react.createElement)("span", { className: AcpSection_module_css_default.fieldLabel }, t("fieldEnvMasked")), (0, react.createElement)("ul", { className: AcpSection_module_css_default.maskedEnvRows }, Object.keys(draft.maskedEnv).sort().map((key) => (0, react.createElement)("li", {
				key,
				className: AcpSection_module_css_default.maskedEnvRow
			}, (0, react.createElement)("code", { className: AcpSection_module_css_default.maskedEnvKey }, key), (0, react.createElement)("span", { className: AcpSection_module_css_default.healthMuted }, t("envMaskedConfigured")), (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				variant: "outline",
				size: "sm",
				disabled,
				onClick: () => {
					setDraft((previous) => dropMaskedEnvKey(previous, key));
					setFailure(void 0);
				}
			}, t("envMaskedRemove"))))))) : null, validation.runtime === void 0 ? null : (0, react.createElement)("div", { className: AcpSection_module_css_default.field }, (0, react.createElement)("p", {
				className: AcpSection_module_css_default.error,
				role: "alert"
			}, t(validation.runtime.key, validation.runtime.params)), (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				variant: "outline",
				onClick: () => {
					props.onOpenAgent(String(validation.runtime?.params?.["id"] ?? ""));
				}
			}, t("openExisting"))), failure === void 0 ? null : (0, react.createElement)("p", { className: AcpSection_module_css_default.error }, failure), (0, react.createElement)("div", { className: AcpSection_module_css_default.editorActions }, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				variant: "outline",
				disabled: busy,
				onClick: () => {
					props.onClose(props.editorKey, false);
				}
			}, t("cancel")), (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				variant: "primary",
				disabled: disabled || validation.config === void 0,
				onClick: save
			}, t(busy ? "saving" : "save"))));
		}
		/** One labelled text/textarea control with its hint-or-error line (fields.tsx precedent). */
		function textField(props) {
			const invalid = props.error !== void 0;
			const control = props.multiline === true ? (0, react.createElement)("textarea", {
				id: props.id,
				className: invalid ? `${AcpSection_module_css_default.textarea} ${AcpSection_module_css_default.textareaInvalid}` : AcpSection_module_css_default.textarea,
				value: props.value,
				disabled: props.disabled,
				placeholder: props.placeholder ?? "",
				rows: 3,
				...invalid ? { "aria-invalid": true } : {},
				onChange: (event) => {
					props.onChange(event.target.value);
				}
			}) : (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Input, {
				id: props.id,
				className: invalid ? `${AcpSection_module_css_default.input} ${AcpSection_module_css_default.inputInvalid}` : AcpSection_module_css_default.input,
				type: "text",
				value: props.value,
				disabled: props.disabled,
				placeholder: props.placeholder ?? "",
				...invalid ? { "aria-invalid": true } : {},
				onChange: (event) => {
					props.onChange(event.target.value);
				}
			});
			return (0, react.createElement)("div", { className: AcpSection_module_css_default.field }, (0, react.createElement)("label", {
				className: AcpSection_module_css_default.fieldLabel,
				htmlFor: props.id
			}, props.label), control, (0, react.createElement)("p", { className: invalid ? AcpSection_module_css_default.error : AcpSection_module_css_default.hint }, props.error !== void 0 ? props.t(props.error.key, props.error.params) : props.hint));
		}
		//#endregion
		//#region \0dsh-css:C:\Users\liaoz\Documents\interests\development\dsh-plugins\dsh-acp-adapter\src\client\ui\AcpPermissionQuestion.module.css.mjs
		const css$1 = ".YeHG4a_frame{padding:6px calc(var(--dsh-composer-side-clearance) + 16px) 10px;justify-content:center;display:flex}.YeHG4a_card{width:100%;max-width:var(--dsh-chat-content-width);--dsw-elevation-stroke-color:var(--dsw-alias-border-l2-darkmode-thin);border-radius:var(--dsw-radius-xl);background:var(--dsw-specific-input-major);max-height:min(70vh,640px);box-shadow:var(--dsw-elevation-panel);color:var(--dsw-alias-label-primary);--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2);border:0;flex-direction:column;padding:0 0 10px;display:flex;overflow:hidden}.YeHG4a_card,.YeHG4a_card *{box-sizing:border-box}.YeHG4a_header{overscroll-behavior:contain;flex:none;min-width:0;max-height:min(24vh,240px);padding:16px 16px 8px 24px;overflow-y:auto}.YeHG4a_heading{color:var(--dsw-alias-label-primary);overflow-wrap:anywhere;white-space:pre-wrap;margin:0;font-size:14px;font-weight:400;line-height:22px}.YeHG4a_source{color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere;margin:0 0 6px;font-size:13px;font-weight:500;line-height:20px}.YeHG4a_content{overscroll-behavior:contain;flex-direction:column;flex:auto;gap:12px;min-height:0;padding:0 12px 4px;display:flex;overflow-y:auto}.YeHG4a_detail{min-width:0;margin-left:12px}.YeHG4a_detail [data-disclosure-row]{color:var(--dsw-alias-label-secondary)}.YeHG4a_detail [data-markdown-variant=compact]{color:var(--dsw-alias-label-primary)}.YeHG4a_detail [data-markdown-variant=compact] pre{font-size:var(--dsh-content-font-size-secondary,13px);line-height:calc(20px + var(--dsh-content-font-delta-secondary,0px))}.YeHG4a_question{flex-direction:column;gap:8px;min-width:0;display:flex}.YeHG4a_options{flex-direction:column;gap:1px;min-width:0;margin:0;padding:4px 0;display:flex}.YeHG4a_card .YeHG4a_option{border-radius:var(--dsw-radius-md);width:100%;height:auto;min-height:40px;color:inherit;cursor:pointer;font:inherit;text-align:left;white-space:normal;overflow-wrap:anywhere;background:0 0;border:.5px solid #0000;flex-shrink:0;justify-content:flex-start;align-items:flex-start;gap:8px;padding:8px 12px 8px 8px;transition:background-color .12s,border-color .12s;display:flex}.YeHG4a_card .YeHG4a_option[aria-checked=true]{background:var(--dsw-alias-interactive-bg-hover)}@media (hover:hover){.YeHG4a_card .YeHG4a_option:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}}.YeHG4a_card .YeHG4a_option[aria-checked=true]{border-color:var(--dsw-alias-border-l2)}.YeHG4a_card .YeHG4a_option:focus-visible{outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline-offset:1px}.YeHG4a_card .YeHG4a_option:disabled{cursor:default}.YeHG4a_optionLabel{min-width:0;color:var(--dsw-alias-label-primary);overflow-wrap:anywhere;white-space:normal;font-size:14px;font-weight:500;line-height:24px}.YeHG4a_number{border-radius:var(--dsw-radius-xs);background:var(--dsw-alias-bg-overlay);width:20px;height:20px;color:var(--dsw-alias-label-secondary);flex:0 0 20px;place-items:center;margin-top:2px;font-size:12px;font-weight:500;line-height:18px;display:grid}.YeHG4a_card .YeHG4a_option[aria-checked=true] .YeHG4a_number{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-state-business-primary)}.YeHG4a_footer{flex:none;align-items:center;gap:12px;padding:8px 16px 0;display:flex}.YeHG4a_status{min-width:0;min-height:36px;color:var(--dsw-alias-state-error-primary);overflow-wrap:anywhere;flex:auto;margin:0;font-size:12px;line-height:18px}.YeHG4a_actions{flex:none;justify-content:flex-end;gap:8px;display:flex}@media (width<=36rem){.YeHG4a_frame{padding-right:calc(var(--dsh-composer-side-clearance) + 8px);padding-left:calc(var(--dsh-composer-side-clearance) + 8px)}.YeHG4a_header{padding-left:16px}.YeHG4a_detail{margin-left:4px}.YeHG4a_footer{flex-direction:column;align-items:stretch;gap:8px}.YeHG4a_actions>button{flex:1 1 0}}";
		const tagId$1 = "@zaimokuza/dsh-acp-adapter/AcpPermissionQuestion.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$1) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@zaimokuza/dsh-acp-adapter";
			tag.dataset.pluginCss = tagId$1;
			tag.textContent = css$1;
			document.head.appendChild(tag);
		}
		var AcpPermissionQuestion_module_css_default = {
			"actions": "YeHG4a_actions",
			"card": "YeHG4a_card",
			"content": "YeHG4a_content",
			"detail": "YeHG4a_detail",
			"footer": "YeHG4a_footer",
			"frame": "YeHG4a_frame",
			"header": "YeHG4a_header",
			"heading": "YeHG4a_heading",
			"number": "YeHG4a_number",
			"option": "YeHG4a_option",
			"optionLabel": "YeHG4a_optionLabel",
			"options": "YeHG4a_options",
			"question": "YeHG4a_question",
			"source": "YeHG4a_source",
			"status": "YeHG4a_status"
		};
		//#endregion
		//#region src/client/ui/acp-permission-question.ts
		/** Fixed-choice composer for ACP permission questions carried by DSH. */
		/** Session-scoped choices keyed by the Host request ID, which survives client reconnects. */
		function createAcpPermissionQuestionStore() {
			return (0, _deepseek_ai_dsh_client_store.defineStore)({
				init: () => ({ byRequest: {} }),
				persist: "dsh.acp-permission.questions.v1",
				actions: {
					select: (draft, questionId, label) => {
						const recent = Object.entries(draft.byRequest).filter(([key]) => key.startsWith("acp-permission:") && key !== questionId).slice(-127);
						draft.byRequest = Object.fromEntries([...recent, [questionId, { selectedByQuestion: { [questionId]: label } }]]);
					},
					clear: (draft, questionId) => {
						delete draft.byRequest[questionId];
					}
				}
			});
		}
		/** Match only the blocking, fixed-option questions created by this adapter. */
		function isAcpPermissionQuestion(value) {
			if (typeof value !== "object" || value === null) return false;
			const pending = value;
			const isRecord = (input) => typeof input === "object" && input !== null && !Array.isArray(input);
			return pending.kind === "question" && typeof pending.key === "string" && pending.key.length > 0 && Array.isArray(pending.questions) && pending.questions.length === 1 && pending.questions.every((question) => {
				if (!isRecord(question) || typeof question.id !== "string" || !question.id.startsWith("acp-permission:")) return false;
				if (!Array.isArray(question.options) || question.options.length === 0 || question.multiSelect === true) return false;
				return question.options.every((option) => isRecord(option) && typeof option.label === "string" && option.label.length > 0);
			}) && pending.callId === void 0 && pending.review === void 0 && typeof pending.subscribe === "function" && typeof pending.snapshot === "function" && typeof pending.answer === "function" && typeof pending.dismiss === "function";
		}
		function answerable(pending) {
			const snapshot = pending.snapshot();
			return snapshot.channel !== "none" && !snapshot.closed && pending.review === void 0;
		}
		/** An explicit, fixed-option answer surface; no free-text or implicit choice. */
		function AcpPermissionQuestion(props) {
			return (0, react.createElement)("div", { className: AcpPermissionQuestion_module_css_default.frame }, (0, react.createElement)(PermissionQuestionSurface, {
				...props,
				key: props.matched.questions[0].id
			}));
		}
		function PermissionQuestionSurface(props) {
			const pending = props.matched;
			const question = pending.questions[0];
			const snapshot = (0, react.useSyncExternalStore)(pending.subscribe, pending.snapshot, pending.snapshot);
			const draft = props.useStore((state) => state.byRequest[question.id]);
			const [busy, setBusy] = (0, react.useState)(false);
			const [failed, setFailed] = (0, react.useState)(false);
			const canAnswer = snapshot.channel !== "none" && !snapshot.closed && pending.review === void 0;
			const selected = draft?.selectedByQuestion ?? {};
			const optionRefs = (0, react.useRef)([]);
			const [detailsOpen, setDetailsOpen] = (0, react.useState)(question.header === void 0);
			const options = question.options ?? [];
			const selectedIndex = options.findIndex((option) => selected[question.id] === option.label);
			const [focusedIndex, setFocusedIndex] = (0, react.useState)(selectedIndex >= 0 ? selectedIndex : 0);
			const complete = pending.questions.every((question) => question.options?.some((option) => option.label === selected[question.id]) === true);
			(0, react.useEffect)(() => {
				if (snapshot.closed) {
					props.actions.clear(question.id);
					setBusy(false);
				}
			}, [
				question.id,
				props.actions,
				snapshot.closed
			]);
			const submit = async () => {
				if (busy || !complete || !answerable(pending)) return;
				const answers = pending.questions.map((question) => ({
					id: question.id,
					selected: [selected[question.id]]
				}));
				setBusy(true);
				setFailed(false);
				try {
					await pending.answer({ answers });
					props.actions.clear(question.id);
				} catch {
					setFailed(true);
					setBusy(false);
				}
			};
			const cancel = async () => {
				if (busy || !answerable(pending)) return;
				setBusy(true);
				setFailed(false);
				try {
					await pending.dismiss();
					props.actions.clear(question.id);
				} catch {
					setFailed(true);
					setBusy(false);
				}
			};
			const moveFocus = (index, event) => {
				if (!canAnswer || busy || options.length === 0) return;
				event.preventDefault();
				const next = (index + options.length) % options.length;
				const option = options[next];
				setFocusedIndex(next);
				props.actions.select(question.id, option.label);
				setFailed(false);
				optionRefs.current[next]?.focus();
			};
			const onOptionKeyDown = (index, event) => {
				switch (event.key) {
					case "ArrowRight":
					case "ArrowDown":
						moveFocus(index + 1, event);
						break;
					case "ArrowLeft":
					case "ArrowUp":
						moveFocus(index - 1, event);
						break;
					case "Home":
						moveFocus(0, event);
						break;
					case "End": moveFocus(options.length - 1, event);
				}
			};
			return (0, react.createElement)("section", {
				className: AcpPermissionQuestion_module_css_default.card,
				"aria-label": question.header ?? question.question,
				"data-question-key": pending.key
			}, (0, react.createElement)("header", { className: AcpPermissionQuestion_module_css_default.header }, question.header === void 0 ? null : (0, react.createElement)("h2", {
				className: AcpPermissionQuestion_module_css_default.source,
				"data-question-source": ""
			}, question.header), (0, react.createElement)("div", {
				className: AcpPermissionQuestion_module_css_default.heading,
				"data-question-operation": ""
			}, question.question)), (0, react.createElement)("div", {
				className: AcpPermissionQuestion_module_css_default.content,
				"data-question-scroll": ""
			}, ...pending.questions.map((question) => (0, react.createElement)("div", {
				className: AcpPermissionQuestion_module_css_default.question,
				key: question.id
			}, question.detail ? (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.DisclosureRow, {
				className: AcpPermissionQuestion_module_css_default.detail,
				icon: (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.IconInfoOutlineMedium),
				title: props.t("acpQuestionDetails"),
				open: detailsOpen,
				expandable: true,
				expandOnRowClick: true,
				onToggle: () => setDetailsOpen((open) => !open)
			}, (0, react.createElement)("div", { "data-question-detail": "" }, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.MarkdownText, {
				text: question.detail,
				variant: "compact",
				labels: {
					code: {
						copyLabel: props.t("acpQuestionCopy"),
						copiedLabel: props.t("acpQuestionCopied")
					},
					footnotes: props.t("acpQuestionFootnotes")
				}
			}))) : null, (0, react.createElement)("div", {
				className: AcpPermissionQuestion_module_css_default.options,
				role: "radiogroup",
				"aria-label": props.t("acpQuestionChoices")
			}, ...(question.options ?? []).map((option, optionIndex) => {
				const checked = selected[question.id] === option.label;
				return (0, react.createElement)("button", {
					key: `${option.label}:${optionIndex}`,
					type: "button",
					className: AcpPermissionQuestion_module_css_default.option,
					role: "radio",
					"aria-checked": checked,
					"aria-label": option.label,
					tabIndex: optionIndex === focusedIndex ? 0 : -1,
					ref: (element) => {
						optionRefs.current[optionIndex] = element;
					},
					disabled: !canAnswer || busy,
					onClick: () => {
						setFocusedIndex(optionIndex);
						props.actions.select(question.id, option.label);
						setFailed(false);
					},
					onFocus: () => setFocusedIndex(optionIndex),
					onKeyDown: (event) => onOptionKeyDown(optionIndex, event)
				}, (0, react.createElement)("span", {
					className: AcpPermissionQuestion_module_css_default.number,
					"aria-hidden": true
				}, String(optionIndex + 1)), (0, react.createElement)("span", { className: AcpPermissionQuestion_module_css_default.optionLabel }, option.label));
			}))))), (0, react.createElement)("footer", { className: AcpPermissionQuestion_module_css_default.footer }, (0, react.createElement)("p", {
				className: AcpPermissionQuestion_module_css_default.status,
				role: "status"
			}, failed ? props.t("acpQuestionFailed") : canAnswer ? "" : props.t("acpQuestionUnavailable")), (0, react.createElement)("div", { className: AcpPermissionQuestion_module_css_default.actions }, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				variant: "ghost",
				disabled: !canAnswer || busy,
				onClick: () => void cancel()
			}, props.t("acpQuestionCancel")), (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				variant: "primary",
				disabled: !canAnswer || busy || !complete,
				onClick: () => void submit()
			}, busy ? props.t("acpQuestionSubmitting") : props.t("acpQuestionSubmit")))));
		}
		//#endregion
		//#region src/contract/diagnostics.ts
		/** Presentation scopes do not change the durable audit or recovery policy. */
		function matchesDiagnosticView(entry, view) {
			if (view === "issues") return entry.severity !== "info";
			const operation = entry.kind === "permission" || entry.kind === "filesystem" || entry.kind === "terminal";
			return view === "operations" ? operation : !operation && entry.severity === "info";
		}
		//#endregion
		//#region src/client/data/acp-support-export.ts
		const ACP_SUPPORT_EXPORT_SCHEMA = "dsh-acp-support";
		const ACP_SUPPORT_EXPORT_MAX_AUDIT_ROWS = 5e3;
		const ACP_SUPPORT_EXPORT_MAX_ACTIVITY_ROWS = 5e3;
		const supportExportReadRetryDelays = [
			250,
			500,
			1e3,
			2e3,
			4e3,
			8e3
		];
		const stableSupportExportReadCodes = /* @__PURE__ */ new Set([
			"dsh-acp/config",
			"dsh-acp/not-installed",
			"dsh-acp/auth-required",
			"dsh-acp/protocol-incompatible",
			"dsh-acp/user-rejected",
			"gateway/bad-request"
		]);
		const safeStatuses = /* @__PURE__ */ new Set([
			"ok",
			"error",
			"aborted",
			"timeout",
			"concurrent-change",
			"selected",
			"cancelled",
			"auto-approved",
			"approval-required",
			"policy-unavailable",
			"bridge-unavailable",
			"inactive-connection",
			"inactive-prompt",
			"identity-unmatched",
			"invalid-tool-name",
			"not-coordination",
			"allow-once-unavailable",
			"allow_once",
			"allow_always",
			"reject_once",
			"reject_always",
			"inherited",
			"blank",
			"agent-does-not-advertise-fork",
			"parent-not-idle",
			"parent-recovery-required",
			"parent-binding-unavailable",
			"parent-binding-mismatch",
			"seed-not-latest-semantic-boundary",
			"candidate-not-available",
			"started",
			"running",
			"exited",
			"killed",
			"released",
			"output-summary",
			"stop-requested",
			"exit-unverified"
		]);
		const safeAuditKinds = /* @__PURE__ */ new Set([
			"binding",
			"permission",
			"reconciliation",
			"replay-assessment",
			"degradation",
			"session-fork",
			"filesystem",
			"terminal"
		]);
		const safeRecoveryCauses = /* @__PURE__ */ new Set([
			"cwd-changed",
			"profile-changed",
			"agent-changed",
			"protocol-changed",
			"capability-missing",
			"id-not-found",
			"load-failed",
			"replay-overflow",
			"replay-diverged",
			"dsh-log-diverged",
			"dsh-log-truncated",
			"binding-in-use",
			"binding-missing",
			"binding-outdated",
			"backend-conflict"
		]);
		const safeRecoveryLocalStatuses = /* @__PURE__ */ new Set([
			"finishing-tools",
			"saving-results",
			"storage-error"
		]);
		var AcpSupportExportError = class extends Error {
			code;
			constructor(code) {
				super(code);
				this.code = code;
				this.name = "AcpSupportExportError";
			}
		};
		function assertCurrent(isCurrent, signal) {
			if (signal?.aborted || !isCurrent()) throw new AcpSupportExportError("session-changed");
		}
		function valueOf(result) {
			if (!result.ok) throw Object.assign(/* @__PURE__ */ new Error("ACP support export read failed"), { code: result.error?.code });
			if (result.value === void 0) throw new AcpSupportExportError("invalid-page");
			return result.value;
		}
		function stableReadFailure(error) {
			return typeof error === "object" && error !== null && "code" in error && typeof error.code === "string" && stableSupportExportReadCodes.has(error.code);
		}
		function waitForReadRetry(delayMs, isCurrent, signal) {
			assertCurrent(isCurrent, signal);
			return new Promise((resolve, reject) => {
				let timer;
				const finish = (failure) => {
					if (timer !== void 0) clearTimeout(timer);
					signal?.removeEventListener("abort", abort);
					if (failure === void 0) resolve();
					else reject(failure);
				};
				const abort = () => finish(new AcpSupportExportError("session-changed"));
				timer = setTimeout(() => {
					if (signal?.aborted || !isCurrent()) abort();
					else finish();
				}, delayMs);
				signal?.addEventListener("abort", abort, { once: true });
				if (signal?.aborted || !isCurrent()) abort();
			});
		}
		async function readPageWithRetry(read, isCurrent, signal) {
			let attempt = 0;
			while (true) {
				assertCurrent(isCurrent, signal);
				try {
					const result = await read();
					assertCurrent(isCurrent, signal);
					return valueOf(result);
				} catch (error) {
					assertCurrent(isCurrent, signal);
					if (error instanceof AcpSupportExportError && error.code !== "unavailable") throw error;
					if (stableReadFailure(error)) throw new AcpSupportExportError("unavailable");
					const delay = supportExportReadRetryDelays[Math.min(attempt, supportExportReadRetryDelays.length - 1)];
					attempt++;
					await waitForReadRetry(delay, isCurrent, signal);
				}
			}
		}
		function safeAuditRow(entry) {
			return {
				session: "session-1",
				sequence: entry.seq,
				time: entry.time,
				kind: safeAuditKinds.has(entry.kind) ? entry.kind : "other",
				severity: entry.severity,
				category: entry.category,
				summaryCode: entry.summaryCode,
				status: entry.status !== null && safeStatuses.has(entry.status) ? entry.status : null
			};
		}
		function safeActivityRow(entry) {
			return {
				session: "session-1",
				activity: `activity-${String(entry.activitySeq)}`,
				revision: entry.revisionSeq,
				time: entry.time,
				kind: entry.kind,
				status: entry.status
			};
		}
		function safeRecovery(recovery, capturedAt) {
			if (recovery === void 0) return {
				status: "unavailable",
				capturedAt,
				kind: null,
				cause: null,
				localStatus: null,
				updatedAt: null
			};
			return {
				status: "available",
				capturedAt,
				kind: recovery.kind,
				cause: recovery.cause !== null && safeRecoveryCauses.has(recovery.cause) ? recovery.cause : null,
				localStatus: recovery.localStatus !== void 0 && safeRecoveryLocalStatuses.has(recovery.localStatus) ? recovery.localStatus : null,
				updatedAt: recovery.updatedAt
			};
		}
		/** Read a fixed, bounded snapshot of safe ACP diagnostics for local preview/export. */
		async function collectAcpSupportExport(remote, sessionId, adapterVersion, isCurrent = () => true, now = Date.now, signal) {
			assertCurrent(isCurrent, signal);
			const startedAt = now();
			const auditRows = [];
			let auditCursor = 0;
			let auditScannedRecords = 0;
			let auditUnreadableRecords = 0;
			let auditHead;
			let auditComplete = false;
			while (auditScannedRecords < ACP_SUPPORT_EXPORT_MAX_AUDIT_ROWS) {
				assertCurrent(isCurrent, signal);
				const request = {
					afterSeq: auditCursor,
					limit: Math.min(100, ACP_SUPPORT_EXPORT_MAX_AUDIT_ROWS - auditScannedRecords),
					...auditHead === void 0 ? { captureSnapshot: true } : { snapshotHead: auditHead }
				};
				const page = await readPageWithRetry(() => remote.auditTimeline(sessionId, request), isCurrent, signal);
				assertCurrent(isCurrent, signal);
				if (page.sessionId !== sessionId || page.entries.length > 100 || page.scannedRecords === null || page.scannedRecords > 100 || page.entries.length + page.unreadableRecords !== page.scannedRecords || page.scannedThrough < auditCursor || page.hasMore && page.scannedRecords === 0) throw new AcpSupportExportError("invalid-page");
				if (auditHead === void 0) auditHead = page.snapshotHead ?? void 0;
				if (auditHead === void 0 || page.snapshotHead !== auditHead) throw new AcpSupportExportError("invalid-page");
				let previousAuditSeq = auditCursor;
				for (const entry of page.entries) {
					if (entry.seq <= previousAuditSeq || entry.seq > auditHead || entry.seq > page.scannedThrough) throw new AcpSupportExportError("invalid-page");
					previousAuditSeq = entry.seq;
					if (auditRows.length < 5e3) auditRows.push(safeAuditRow(entry));
				}
				auditScannedRecords += page.scannedRecords;
				auditUnreadableRecords += page.unreadableRecords;
				if (page.scannedThrough > auditHead) throw new AcpSupportExportError("invalid-page");
				if (!page.hasMore) {
					auditCursor = page.scannedThrough;
					auditComplete = true;
					break;
				}
				if (page.nextCursor === null || page.nextCursor !== page.scannedThrough || page.nextCursor <= auditCursor) throw new AcpSupportExportError("invalid-page");
				if (page.nextCursor > auditHead) throw new AcpSupportExportError("invalid-page");
				auditCursor = page.nextCursor;
			}
			const activityRows = [];
			let activityCursor = 0;
			let activityPages = 0;
			let activityHead;
			let activityComplete = false;
			const maxActivityPages = Math.ceil(ACP_SUPPORT_EXPORT_MAX_ACTIVITY_ROWS / 100);
			while (activityRows.length < 5e3 && activityPages < maxActivityPages) {
				assertCurrent(isCurrent, signal);
				const request = {
					afterRevision: activityCursor,
					limit: 100,
					...activityHead === void 0 ? { captureSnapshot: true } : { snapshotHead: activityHead }
				};
				const page = await readPageWithRetry(() => remote.activityPage(sessionId, request), isCurrent, signal);
				assertCurrent(isCurrent, signal);
				activityPages += 1;
				if (page.sessionId !== sessionId || page.activities.length > 100) throw new AcpSupportExportError("invalid-page");
				if (activityHead === void 0) activityHead = page.head;
				if (activityHead === void 0 || page.head !== activityHead) throw new AcpSupportExportError("invalid-page");
				let previousActivityRevision = activityCursor;
				for (const entry of page.activities) {
					if (entry.revisionSeq <= previousActivityRevision || entry.revisionSeq > activityHead) throw new AcpSupportExportError("invalid-page");
					previousActivityRevision = entry.revisionSeq;
					if (activityRows.length < 5e3) activityRows.push(safeActivityRow(entry));
				}
				if (!page.hasMore) {
					activityComplete = true;
					break;
				}
				if (page.nextCursor === null || page.nextCursor <= activityCursor || page.nextCursor < previousActivityRevision) throw new AcpSupportExportError("invalid-page");
				if (page.nextCursor > activityHead) throw new AcpSupportExportError("invalid-page");
				activityCursor = page.nextCursor;
			}
			assertCurrent(isCurrent, signal);
			const recoveryCapturedAt = now();
			const recoveryResult = await remote.recoverySnapshot(sessionId);
			assertCurrent(isCurrent, signal);
			const recovery = safeRecovery(recoveryResult.ok ? recoveryResult.value : void 0, recoveryCapturedAt);
			const exportedAt = now();
			const fixedAuditHead = auditHead ?? 0;
			const fixedActivityHead = activityHead ?? 0;
			return {
				schema: ACP_SUPPORT_EXPORT_SCHEMA,
				schemaVersion: 1,
				adapterVersion,
				captureStartedAt: startedAt,
				exportedAt,
				runtimeHostVersion: null,
				sessionAlias: "session-1",
				recovery,
				audit: {
					snapshotHead: fixedAuditHead,
					rows: auditRows,
					unreadableRecords: auditUnreadableRecords,
					storedRecordsReachedHead: auditComplete && auditCursor >= fixedAuditHead,
					truncated: !auditComplete,
					possibleHistoricalLoss: true
				},
				activity: {
					snapshotHead: fixedActivityHead,
					rows: activityRows,
					storedRecordsReachedHead: activityComplete && (activityRows.at(-1)?.revision ?? 0) >= fixedActivityHead,
					truncated: !activityComplete,
					historicalLoss: "unknown"
				},
				unavailable: {
					providerPromptTrace: true,
					providerUsage: true,
					nativeSessionLog: true,
					crossMemberCorrelation: true
				}
			};
		}
		/** JSON filename does not contain the host session id. */
		function acpSupportExportFilename(at) {
			return `dsh-acp-diagnostics-${new Date(at).toISOString().replace(/[:.]/gu, "-")}.json`;
		}
		/** Start a local browser download in response to the user's explicit export action. */
		function downloadAcpSupportExport(value) {
			const url = URL.createObjectURL(new Blob([`${JSON.stringify(value, null, 2)}\n`], { type: "application/json" }));
			const anchor = document.createElement("a");
			anchor.href = url;
			anchor.download = acpSupportExportFilename(value.exportedAt);
			anchor.click();
			setTimeout(() => URL.revokeObjectURL(url), 0);
		}
		//#endregion
		//#region \0dsh-css:C:\Users\liaoz\Documents\interests\development\dsh-plugins\dsh-acp-adapter\src\client\ui\AcpAuditHeaderAction.module.css.mjs
		const css = ".oYLBhG_root{--dsh-audit-toolbar-height:32px;--dsh-audit-bottom-clearance:calc(var(--dsh-composer-height,152px) + 16px);box-sizing:border-box;width:100%;min-width:0;height:100%;min-height:0;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-1);flex-direction:column;display:flex;overflow:hidden}.oYLBhG_toolbar{z-index:4;box-sizing:border-box;width:100%;height:var(--dsh-audit-toolbar-height);border-bottom:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);flex:none;padding:0;position:sticky;top:0}.oYLBhG_toolbarInner{box-sizing:border-box;align-items:center;gap:8px;width:100%;height:100%;padding:0 6px;display:flex}.oYLBhG_filters,.oYLBhG_toolbarEnd{align-items:center;gap:2px;min-width:0;display:flex}.oYLBhG_filters{flex:none;overflow-x:auto}.oYLBhG_toolbarEnd{flex:none;gap:6px;margin-left:auto}.oYLBhG_filter,.oYLBhG_filterActive,.oYLBhG_refresh,.oYLBhG_more,.oYLBhG_close{box-sizing:border-box;border-radius:var(--dsw-radius-xs);color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxs-12);cursor:pointer;background:0 0;border:0}.oYLBhG_filter,.oYLBhG_filterActive,.oYLBhG_refresh{border-radius:var(--dsw-radius-xs);flex:none;height:20px;padding:0 5px}.oYLBhG_filterActive{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}.oYLBhG_filter:hover,.oYLBhG_filterActive:hover,.oYLBhG_refresh:hover:not(:disabled),.oYLBhG_more:hover:not(:disabled),.oYLBhG_close:hover{background:var(--dsw-alias-interactive-bg-hover)}.oYLBhG_filter:focus-visible,.oYLBhG_filterActive:focus-visible,.oYLBhG_refresh:focus-visible,.oYLBhG_more:focus-visible,.oYLBhG_close:focus-visible,.oYLBhG_table tr:focus-visible{box-shadow:inset 0 0 0 1px var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary));outline:none}.oYLBhG_refresh:disabled,.oYLBhG_more:disabled{cursor:default;opacity:.45}.oYLBhG_search{flex:0 164px;min-width:84px;margin-left:auto}.oYLBhG_split{--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2);background:var(--dsw-alias-bg-layer-1);flex:1;width:100%;min-width:0;min-height:0;display:flex;position:relative;overflow:hidden;container-type:inline-size}.oYLBhG_tablePane{min-width:0;min-height:0;padding-bottom:var(--dsh-audit-bottom-clearance);box-sizing:border-box;flex:1;position:relative;overflow:hidden auto;container:oYLBhG_audit-table/inline-size}.oYLBhG_table{border-spacing:0;table-layout:fixed;width:100%;min-width:0;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-1);font:var(--dsw-font-xxs-12)}.oYLBhG_eventColumn{width:122px}.oYLBhG_contentColumn{width:auto}.oYLBhG_table tr{cursor:pointer;outline:none;height:30px}.oYLBhG_table tr:hover{background:var(--dsw-alias-interactive-bg-hover)}.oYLBhG_table tr[data-selected=true]{background:var(--dsw-alias-interactive-bg-active)}.oYLBhG_event,.oYLBhG_content{border-bottom:.5px solid var(--dsw-alias-border-l1);box-sizing:border-box;min-width:0;height:30px;padding:0 8px;overflow:hidden}.oYLBhG_event{position:relative;padding-left:36px!important;padding-right:4px!important;overflow:visible!important}.oYLBhG_content{color:var(--dsw-alias-label-primary);padding-left:4px!important}.oYLBhG_eventInner,.oYLBhG_contentInner{align-items:center;min-width:0;height:100%;display:flex}.oYLBhG_contentInner{justify-content:space-between;gap:12px}.oYLBhG_kindSlot{flex:none;justify-content:flex-end;align-items:flex-end;width:76px;display:flex}.oYLBhG_summary{text-overflow:ellipsis;white-space:nowrap;min-width:0;color:var(--dsw-alias-label-primary);font:var(--dsw-font-xxs-12);overflow:hidden}.oYLBhG_time{color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxs-12);font-variant-numeric:tabular-nums;white-space:nowrap;flex:none}.oYLBhG_details{border-left:.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);flex-direction:column;flex:none;width:clamp(320px,38%,440px);min-width:0;max-width:calc(100% - 280px);min-height:0;display:flex;position:relative}.oYLBhG_detailsHeader{border-bottom:.5px solid var(--dsw-alias-border-l2);box-sizing:border-box;flex:none;justify-content:space-between;align-items:center;gap:8px;height:42px;padding:0 8px 0 12px;display:flex}.oYLBhG_detailsTitle{align-items:center;gap:8px;min-width:0;display:flex}.oYLBhG_detailsLocation{text-overflow:ellipsis;white-space:nowrap;min-width:0;color:var(--dsw-alias-label-tertiary);font:11px/16px var(--ds-font-family-code);overflow:hidden}.oYLBhG_close{border-radius:var(--dsw-radius-sm);flex:none;justify-content:center;align-items:center;width:28px;height:28px;padding:0;font-size:18px;line-height:18px;display:inline-flex}.oYLBhG_close:hover{color:var(--dsw-alias-label-primary)}.oYLBhG_detailsBody{min-width:0;min-height:0;padding:0 0 var(--dsh-audit-bottom-clearance);box-sizing:border-box;scrollbar-gutter:stable;flex-direction:column;flex:1;display:flex;overflow:hidden auto}.oYLBhG_detailsSummary{color:var(--dsw-alias-label-primary);font:var(--dsw-font-xs-13);overflow-wrap:anywhere;flex:none;margin:0;padding:12px 14px 6px}.oYLBhG_overview{font:var(--dsw-font-xs-13);flex:none;margin:0;padding:0 0 8px}.oYLBhG_overview>div{grid-template-columns:94px minmax(0,1fr);align-items:center;min-height:22px;padding:0 14px;display:grid}.oYLBhG_overview dt{color:var(--dsw-alias-label-tertiary)}.oYLBhG_overview dd{min-width:0;color:var(--dsw-alias-label-primary);text-overflow:ellipsis;white-space:nowrap;margin:0;overflow:hidden}.oYLBhG_jsonPayload.oYLBhG_jsonPayload{flex:none;min-width:0;overflow:visible}.oYLBhG_detailPayload{box-sizing:border-box;background:var(--dsw-alias-bg-layer-1);width:100%;max-width:100%;min-height:100%;color:var(--dsw-alias-label-primary);white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word;font:var(--dsw-font-markdown-code-block-small);margin:0;padding:14px;overflow:auto}.oYLBhG_more{height:24px;margin:8px auto;padding:2px 8px;display:block}.oYLBhG_muted,.oYLBhG_end,.oYLBhG_error{font:var(--dsw-font-xxs-12);margin:12px}.oYLBhG_muted,.oYLBhG_end,.oYLBhG_noDetails{color:var(--dsw-alias-label-tertiary)}.oYLBhG_end{text-align:center}.oYLBhG_error{color:var(--dsw-alias-state-error-primary);overflow-wrap:anywhere}.oYLBhG_currentIssue{border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);font:var(--dsw-font-xs-13);margin:12px;padding:12px}.oYLBhG_currentIssue p{margin:8px 0}.oYLBhG_noDetails{margin:0}@media (width<=720px){.oYLBhG_toolbar{height:auto;min-height:32px}.oYLBhG_toolbarInner{align-items:flex-start;padding:5px 8px}.oYLBhG_filters{flex:1}.oYLBhG_toolbarEnd{align-items:flex-start}.oYLBhG_search{width:112px}.oYLBhG_eventColumn{width:98px}.oYLBhG_event{padding-left:12px!important}.oYLBhG_kindSlot{width:78px}.oYLBhG_details{border-left:0;width:100%;max-width:none;position:absolute;inset:0}}";
		const tagId = "@zaimokuza/dsh-acp-adapter/AcpAuditHeaderAction.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@zaimokuza/dsh-acp-adapter";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var AcpAuditHeaderAction_module_css_default = {
			"audit-table": "oYLBhG_audit-table",
			"close": "oYLBhG_close",
			"content": "oYLBhG_content",
			"contentColumn": "oYLBhG_contentColumn",
			"contentInner": "oYLBhG_contentInner",
			"currentIssue": "oYLBhG_currentIssue",
			"detailPayload": "oYLBhG_detailPayload",
			"details": "oYLBhG_details",
			"detailsBody": "oYLBhG_detailsBody",
			"detailsHeader": "oYLBhG_detailsHeader",
			"detailsLocation": "oYLBhG_detailsLocation",
			"detailsSummary": "oYLBhG_detailsSummary",
			"detailsTitle": "oYLBhG_detailsTitle",
			"end": "oYLBhG_end",
			"error": "oYLBhG_error",
			"event": "oYLBhG_event",
			"eventColumn": "oYLBhG_eventColumn",
			"eventInner": "oYLBhG_eventInner",
			"filter": "oYLBhG_filter",
			"filterActive": "oYLBhG_filterActive",
			"filters": "oYLBhG_filters",
			"jsonPayload": "oYLBhG_jsonPayload",
			"kindSlot": "oYLBhG_kindSlot",
			"more": "oYLBhG_more",
			"muted": "oYLBhG_muted",
			"noDetails": "oYLBhG_noDetails",
			"overview": "oYLBhG_overview",
			"refresh": "oYLBhG_refresh",
			"root": "oYLBhG_root",
			"search": "oYLBhG_search",
			"split": "oYLBhG_split",
			"summary": "oYLBhG_summary",
			"table": "oYLBhG_table",
			"tablePane": "oYLBhG_tablePane",
			"time": "oYLBhG_time",
			"toolbar": "oYLBhG_toolbar",
			"toolbarEnd": "oYLBhG_toolbarEnd",
			"toolbarInner": "oYLBhG_toolbarInner"
		};
		//#endregion
		//#region src/client/ui/AcpAuditHeaderAction.ts
		/** ACP 诊断的会话视图与条件注册门。 */
		function auditHeaderVisible(backend, ownsRoute) {
			return backend?.state === "established" && ownsRoute(backend.provider);
		}
		/** 原生模型会话在本地投影门直接旁路，不发 ACP Remote 请求。 */
		function auditProjectionIsAcp(selection, ownsRoute) {
			if (typeof selection !== "object" || selection === null || !("lastUsed" in selection)) return false;
			const provider = selection.lastUsed?.provider;
			return typeof provider === "string" && ownsRoute(provider);
		}
		/** 首轮建立 binding 或宿主恢复后触发一次可见性复核。 */
		function auditSessionRefreshKeyOf(snapshot) {
			if (snapshot === null || snapshot === void 0) return "absent";
			return [
				snapshot.blank,
				snapshot.promptAttempted,
				snapshot.awaitingFirstTurn,
				snapshot.running,
				snapshot.openState,
				snapshot.lastAgentError ?? ""
			].join("|");
		}
		function auditEntryMatchesFilter(entry, filter) {
			return matchesDiagnosticView(entry, filter);
		}
		/** Search only user-meaningful audit facts; compact raw JSON stays in details. */
		function auditEntryMatchesQuery(t, entry, query) {
			const normalized = query.trim().toLocaleLowerCase();
			if (normalized === "") return true;
			return [
				categoryLabel(t, entry.category),
				auditSummaryOf(t, entry),
				entry.subject ?? "",
				entry.status ?? "",
				auditRecordedCause(entry) ?? ""
			].some((value) => value.toLocaleLowerCase().includes(normalized));
		}
		/** Display only explicit recorded reasons, never infer a cause from an outcome. */
		function auditRecordedCause(entry) {
			if (entry.detail === null) return null;
			try {
				const value = JSON.parse(entry.detail);
				const reason = [
					value?.reason,
					value?.detail,
					value?.cause,
					value?.note
				].find((candidate) => typeof candidate === "string" && candidate.trim() !== "");
				if (reason !== void 0) return reason;
				if (Array.isArray(value?.items)) {
					const reasons = value.items.flatMap((item) => {
						if (typeof item !== "object" || item === null || !("reason" in item)) return [];
						return typeof item.reason === "string" && item.reason.trim() !== "" ? [item.reason] : [];
					});
					return reasons.length === 0 ? null : [...new Set(reasons)].join("\n");
				}
				return null;
			} catch {
				return null;
			}
		}
		const summaryKeys = {
			"binding.established": "auditSummaryBinding",
			"permission.asked": "auditSummaryPermissionAsked",
			"permission.bridge": "auditSummaryPermissionBridge",
			"permission.decided": "auditSummaryPermissionDecided",
			"reconciliation.required": "auditSummaryReconciliation",
			"replay.matched": "auditSummaryReplayMatched",
			"replay.different": "auditSummaryReplayDifferent",
			"replay.overflow": "auditSummaryReplayOverflow",
			"replay.not-compared": "auditSummaryReplayNotCompared",
			"restore.reused": "auditSummaryRestoreReused",
			"restore.resumed": "auditSummaryRestoreResumed",
			"restore.loaded": "auditSummaryRestoreLoaded",
			"replay.unavailable": "auditSummaryReplayUnavailable",
			"degradation.recorded": "auditSummaryDegradation",
			"filesystem.operation": "auditSummaryFilesystem",
			"filesystem.read": "auditSummaryRead",
			"filesystem.write": "auditSummaryWrite",
			"terminal.operation": "auditSummaryTerminal",
			"session-fork.completed": "auditSummarySessionFork",
			"agent.event": "auditSummaryAgentEvent"
		};
		function auditSummaryOf(t, entry) {
			return [
				t(summaryKeys[entry.summaryCode]),
				entry.subject !== null && entry.summaryCode === "session-fork.completed" ? auditStatusOf(t, entry.subject) : entry.subject,
				entry.status === null ? null : auditStatusOf(t, entry.status)
			].filter((value) => value !== null && value !== "").join(" · ");
		}
		function auditStatusOf(t, status) {
			const localeKey = {
				"auto-approved": "auditAutoApproved",
				"approval-required": "auditApprovalRequired",
				"policy-unavailable": "auditPolicyUnavailable",
				"bridge-unavailable": "auditBridgeUnavailable",
				"inactive-connection": "auditBridgeInactive",
				"inactive-prompt": "auditPromptInactive",
				"identity-unmatched": "auditIdentityUnmatched",
				"invalid-tool-name": "auditInvalidToolName",
				"not-coordination": "auditNotCoordination",
				"allow-once-unavailable": "auditAllowOnceMissing",
				"danger-full-access": "auditStatusNativeAccess",
				set_config_option: "auditStatusConfigSync",
				"session-setup": "auditStatusSessionSetup",
				ok: "auditStatusOk",
				error: "auditStatusError",
				aborted: "auditStatusAborted",
				timeout: "auditStatusTimeout",
				"concurrent-change": "auditStatusConcurrentChange",
				selected: "auditStatusSelected",
				cancelled: "auditStatusCancelled",
				started: "auditStatusStarted",
				running: "auditStatusRunning",
				exited: "auditStatusExited",
				killed: "auditStatusKilled",
				released: "auditStatusReleased",
				"output-summary": "auditStatusOutputSummary",
				"stop-requested": "auditStatusStopRequested",
				"exit-unverified": "auditStatusExitUnverified",
				allow_once: "auditAllowOnce",
				allow_always: "auditAllowAlways",
				reject_once: "auditRejectOnce",
				reject_always: "auditRejectAlways",
				inherited: "auditForkInherited",
				blank: "auditForkBlank",
				"agent-does-not-advertise-fork": "auditForkUnsupported",
				"parent-not-idle": "auditForkParentNotIdle",
				"parent-recovery-required": "auditForkParentRecoveryRequired",
				"parent-binding-unavailable": "auditForkParentUnavailable",
				"parent-binding-mismatch": "auditForkParentMismatch",
				"seed-not-latest-semantic-boundary": "auditForkOlderBoundary",
				"candidate-not-available": "auditForkCandidateUnavailable"
			}[status];
			return localeKey === void 0 ? status : t(localeKey);
		}
		function categoryLabel(t, category) {
			return t({
				recovery: "auditCategoryRecovery",
				permission: "auditCategoryPermission",
				agent: "auditCategoryAgent",
				files: "auditCategoryFiles"
			}[category]);
		}
		function entryTone(entry) {
			return entry.severity === "info" ? "neutral" : entry.severity === "error" ? "danger" : "warning";
		}
		function timeOf(epoch) {
			try {
				return new Date(epoch).toLocaleString();
			} catch {
				return String(epoch);
			}
		}
		/** Parse structured records into DSH's native JSON inspector; preserve non-JSON text verbatim. */
		function auditDetailOf(detail) {
			try {
				const value = JSON.parse(detail);
				if (typeof value === "object" && value !== null) return {
					kind: "json",
					value
				};
			} catch {}
			return {
				kind: "text",
				value: detail
			};
		}
		/**
		* 只由 mainView 决定 ACP 诊断 Tab；侧栏引用不能夺取或撤销主区域入口。
		* `conversation.view` 仍是全局 roster，以主区域的标准投影决定可见性，
		* 避免原生会话被插件增加无意义的 Tab。
		*/
		function AcpAuditVisibilityGate(props) {
			const { sessionId, useSession, useSessionRetainInfo, useProjection, remote, onVisibilityChange, ownsRoute } = props;
			const mainView = useSessionRetainInfo((value) => (value?.retainedBy.mainView ?? 0) > 0);
			const sessionRefreshKey = useSession === void 0 ? "absent" : useSession((snapshot) => auditSessionRefreshKeyOf(snapshot));
			const projectionSelection = useProjection("modelSelection");
			const [verifiedSessionId, setVerifiedSessionId] = (0, react.useState)(void 0);
			const projectedAcp = mainView && sessionId !== void 0 && auditProjectionIsAcp(projectionSelection, ownsRoute);
			const visible = projectedAcp && verifiedSessionId === sessionId;
			(0, react.useEffect)(() => {
				let disposed = false;
				if (sessionId === void 0 || remote === void 0 || !projectedAcp) {
					setVerifiedSessionId(void 0);
					return;
				}
				remote.backendOf(sessionId).then((result) => {
					if (!disposed) setVerifiedSessionId(result.ok && auditHeaderVisible(result.value, ownsRoute) ? sessionId : void 0);
				}).catch(() => {
					if (!disposed) setVerifiedSessionId(void 0);
				});
				return () => {
					disposed = true;
				};
			}, [
				sessionId,
				remote,
				projectedAcp,
				sessionRefreshKey,
				ownsRoute
			]);
			(0, react.useEffect)(() => {
				if (sessionId === void 0) return;
				onVisibilityChange(sessionId, visible);
				return () => {
					onVisibilityChange(sessionId, false);
				};
			}, [
				sessionId,
				visible,
				onVisibilityChange
			]);
			return null;
		}
		/** 与轨迹同级的全高会话视图；筛选和详情均在页面内完成。 */
		function AcpAuditView(props) {
			if (props.t === void 0) return null;
			return (0, react.createElement)(AcpAuditLoadedView, {
				...props,
				t: props.t
			});
		}
		function AcpAuditLoadedView(props) {
			const { sessionId, remote, t, jsonStringWrapping } = props;
			const [loading, setLoading] = (0, react.useState)(false);
			const [entries, setEntries] = (0, react.useState)([]);
			const [cursor, setCursor] = (0, react.useState)(0);
			const [hasMore, setHasMore] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)(null);
			const [filter, setFilter] = (0, react.useState)("issues");
			const [recovery, setRecovery] = (0, react.useState)(null);
			const [recoveryUnavailable, setRecoveryUnavailable] = (0, react.useState)(false);
			const [query, setQuery] = (0, react.useState)("");
			const [copyState, setCopyState] = (0, react.useState)("idle");
			const [exportState, setExportState] = (0, react.useState)("idle");
			const [supportExport, setSupportExport] = (0, react.useState)(null);
			const [exportError, setExportError] = (0, react.useState)(null);
			const exportEpoch = (0, react.useRef)(0);
			const exportLoading = (0, react.useRef)(false);
			const exportController = (0, react.useRef)(void 0);
			const currentSessionId = (0, react.useRef)(sessionId);
			currentSessionId.current = sessionId;
			const copyEpoch = (0, react.useRef)(0);
			const [selectedSeq, setSelectedSeq] = (0, react.useState)(null);
			const requestEpoch = (0, react.useRef)(0);
			const recoveryEpoch = (0, react.useRef)(0);
			const loadingRef = (0, react.useRef)(false);
			const load = (0, react.useCallback)((reset) => {
				if (sessionId === void 0 || remote === void 0 || loadingRef.current) return;
				requestEpoch.current += 1;
				const epoch = requestEpoch.current;
				loadingRef.current = true;
				setLoading(true);
				setError(null);
				const afterSeq = reset ? 0 : cursor ?? 0;
				if (reset) {
					const statusEpoch = ++recoveryEpoch.current;
					remote.recoverySnapshot(sessionId).then((result) => {
						if (statusEpoch !== recoveryEpoch.current) return;
						setRecoveryUnavailable(!result.ok);
						setRecovery(result.ok && result.value.kind !== "healthy" ? result.value : null);
					}).catch(() => {
						if (statusEpoch === recoveryEpoch.current) {
							setRecoveryUnavailable(true);
							setRecovery(null);
						}
					});
				}
				remote.auditTimeline(sessionId, {
					afterSeq,
					limit: 50,
					view: filter
				}).then((result) => {
					if (epoch !== requestEpoch.current) return;
					if (!result.ok) {
						setError(t("auditUnavailable"));
						return;
					}
					setEntries((previous) => reset ? result.value.entries : [...previous, ...result.value.entries]);
					setCursor(result.value.nextCursor);
					setHasMore(result.value.hasMore);
				}).catch(() => {
					if (epoch === requestEpoch.current) setError(t("auditUnavailable"));
				}).finally(() => {
					if (epoch === requestEpoch.current) {
						loadingRef.current = false;
						setLoading(false);
					}
				});
			}, [
				sessionId,
				remote,
				cursor,
				t,
				filter
			]);
			(0, react.useEffect)(() => {
				exportEpoch.current += 1;
				exportLoading.current = false;
				setExportState("idle");
				setSupportExport(null);
				setExportError(null);
				setFilter("issues");
				return () => {
					exportEpoch.current += 1;
					exportController.current?.abort();
					exportController.current = void 0;
				};
			}, [sessionId, remote]);
			(0, react.useEffect)(() => {
				requestEpoch.current += 1;
				loadingRef.current = false;
				setEntries([]);
				setCursor(0);
				setHasMore(false);
				setError(null);
				setRecovery(null);
				setRecoveryUnavailable(false);
				setQuery("");
				setSelectedSeq(null);
				load(true);
				return () => {
					requestEpoch.current += 1;
					recoveryEpoch.current += 1;
				};
			}, [
				sessionId,
				remote,
				filter
			]);
			const visible = (0, react.useMemo)(() => entries.filter((entry) => auditEntryMatchesFilter(entry, filter) && auditEntryMatchesQuery(t, entry, query)), [
				entries,
				filter,
				query,
				t
			]);
			const selected = (0, react.useMemo)(() => entries.find((entry) => entry.seq === selectedSeq) ?? null, [entries, selectedSeq]);
			(0, react.useEffect)(() => {
				++copyEpoch.current;
				setCopyState("idle");
				return () => {
					++copyEpoch.current;
				};
			}, [sessionId, selectedSeq]);
			const copySelected = async () => {
				if (selected === null) return;
				const generation = copyEpoch.current;
				try {
					const copied = await (0, _deepseek_ai_dsh_client_ui_primitives.writeClipboard)(JSON.stringify({
						adapterVersion: "0.2.2-rc.3.1",
						sessionId,
						record: selected
					}, null, 2));
					if (generation === copyEpoch.current) setCopyState(copied ? "copied" : "failed");
				} catch {
					if (generation === copyEpoch.current) setCopyState("failed");
				}
			};
			const startSupportExport = async () => {
				if (sessionId === void 0 || remote === void 0 || exportLoading.current) return;
				const epoch = ++exportEpoch.current;
				const selectedSession = sessionId;
				const controller = new AbortController();
				exportController.current = controller;
				exportLoading.current = true;
				setExportState("loading");
				setSupportExport(null);
				setExportError(null);
				try {
					const result = await collectAcpSupportExport(remote, selectedSession, "0.2.2-rc.3.1", () => exportEpoch.current === epoch && currentSessionId.current === selectedSession && !controller.signal.aborted, Date.now, controller.signal);
					if (exportEpoch.current !== epoch || currentSessionId.current !== selectedSession || controller.signal.aborted) return;
					downloadAcpSupportExport(result);
					setSupportExport(result);
					setExportState("downloaded");
				} catch (error) {
					if (exportEpoch.current !== epoch || currentSessionId.current !== selectedSession || controller.signal.aborted) return;
					setExportError(error instanceof AcpSupportExportError ? error.code : "unavailable");
					setExportState("failed");
				} finally {
					if (exportController.current === controller) exportController.current = void 0;
					if (exportEpoch.current === epoch) exportLoading.current = false;
				}
			};
			return (0, react.createElement)("section", {
				className: AcpAuditHeaderAction_module_css_default.root,
				"data-conversation-composer-overlay": "",
				"aria-label": t("auditTitle")
			}, (0, react.createElement)("div", {
				className: AcpAuditHeaderAction_module_css_default.toolbar,
				role: "toolbar",
				"aria-label": t("auditTitle")
			}, (0, react.createElement)("div", { className: AcpAuditHeaderAction_module_css_default.toolbarInner }, (0, react.createElement)("div", { className: AcpAuditHeaderAction_module_css_default.filters }, ...[
				["issues", "auditIssues"],
				["operations", "auditOperations"],
				["technical", "auditTechnical"]
			].map(([value, key]) => (0, react.createElement)("button", {
				key: value,
				type: "button",
				className: value === filter ? AcpAuditHeaderAction_module_css_default.filterActive : AcpAuditHeaderAction_module_css_default.filter,
				"aria-pressed": value === filter,
				onClick: () => setFilter(value)
			}, t(key)))), (0, react.createElement)("div", { className: AcpAuditHeaderAction_module_css_default.toolbarEnd }, (0, react.createElement)("button", {
				type: "button",
				className: AcpAuditHeaderAction_module_css_default.refresh,
				disabled: loading,
				onClick: () => load(true)
			}, t(loading ? "auditLoadingShort" : "auditRefresh")), (0, react.createElement)("button", {
				type: "button",
				className: AcpAuditHeaderAction_module_css_default.refresh,
				disabled: sessionId === void 0 || remote === void 0 || exportState === "loading",
				onClick: () => void startSupportExport()
			}, t("auditExport")), (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Input, {
				icon: (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.IconSearchOutlineMedium, { size: 16 }),
				type: "search",
				className: AcpAuditHeaderAction_module_css_default.search,
				value: query,
				placeholder: t("auditSearchPlaceholder"),
				"aria-label": t("auditSearch"),
				onChange: (event) => setQuery(event.currentTarget.value)
			})))), (0, react.createElement)("div", { className: AcpAuditHeaderAction_module_css_default.split }, (0, react.createElement)("div", {
				className: AcpAuditHeaderAction_module_css_default.tablePane,
				"data-audit-scroll": true
			}, (0, react.createElement)("p", { className: AcpAuditHeaderAction_module_css_default.muted }, t("auditScope")), recoveryUnavailable ? (0, react.createElement)("p", {
				className: AcpAuditHeaderAction_module_css_default.error,
				role: "alert"
			}, t("auditRecoveryUnavailable")) : null, recovery === null ? null : (0, react.createElement)("div", {
				className: AcpAuditHeaderAction_module_css_default.currentIssue,
				role: "status"
			}, (0, react.createElement)("strong", null, t("auditCurrentState")), (0, react.createElement)("p", null, recoveryText((key) => t(key), recovery)), (0, react.createElement)("p", null, t("auditRecoveryAction")), (0, react.createElement)("details", null, (0, react.createElement)("summary", null, t("auditTechnical")), (0, react.createElement)("pre", { className: AcpAuditHeaderAction_module_css_default.detailPayload }, recovery.detail ?? recovery.cause ?? t("auditNoCause")))), loading && entries.length === 0 ? (0, react.createElement)("p", { className: AcpAuditHeaderAction_module_css_default.muted }, t("auditLoading")) : null, error === null ? null : (0, react.createElement)("p", {
				className: AcpAuditHeaderAction_module_css_default.error,
				role: "alert"
			}, error), !loading && error === null && visible.length === 0 ? (0, react.createElement)("p", { className: AcpAuditHeaderAction_module_css_default.muted }, query.trim() !== "" ? t("auditNoMatch") : hasMore ? t("auditScanMore") : filter === "issues" ? t("auditNoIssues") : t("auditEmpty")) : null, (0, react.createElement)("table", {
				className: AcpAuditHeaderAction_module_css_default.table,
				"aria-label": t("auditTimeline")
			}, (0, react.createElement)("colgroup", null, (0, react.createElement)("col", { className: AcpAuditHeaderAction_module_css_default.eventColumn }), (0, react.createElement)("col", { className: AcpAuditHeaderAction_module_css_default.contentColumn })), (0, react.createElement)("tbody", null, ...visible.map((entry) => {
				const isSelected = entry.seq === selectedSeq;
				const select = () => setSelectedSeq(isSelected ? null : entry.seq);
				return (0, react.createElement)("tr", {
					key: `${entry.seq}-${entry.kind}`,
					tabIndex: 0,
					"data-selected": isSelected || void 0,
					"aria-selected": isSelected,
					onClick: select,
					onKeyDown: (event) => {
						if (event.key !== "Enter" && event.key !== " ") return;
						event.preventDefault();
						select();
					}
				}, (0, react.createElement)("td", { className: AcpAuditHeaderAction_module_css_default.event }, (0, react.createElement)("div", { className: AcpAuditHeaderAction_module_css_default.eventInner }, (0, react.createElement)("div", { className: AcpAuditHeaderAction_module_css_default.kindSlot }, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Tag, { tone: entryTone(entry) }, categoryLabel(t, entry.category))))), (0, react.createElement)("td", { className: AcpAuditHeaderAction_module_css_default.content }, (0, react.createElement)("div", { className: AcpAuditHeaderAction_module_css_default.contentInner }, (0, react.createElement)("span", { className: AcpAuditHeaderAction_module_css_default.summary }, auditSummaryOf(t, entry)), (0, react.createElement)("time", {
					className: AcpAuditHeaderAction_module_css_default.time,
					dateTime: new Date(entry.time).toISOString()
				}, timeOf(entry.time)))));
			}))), hasMore ? (0, react.createElement)("button", {
				type: "button",
				className: AcpAuditHeaderAction_module_css_default.more,
				disabled: loading,
				onClick: () => load(false)
			}, t("auditLoadMore")) : null, !hasMore && entries.length > 0 ? (0, react.createElement)("p", { className: AcpAuditHeaderAction_module_css_default.end }, t("auditPageEnd")) : null), selected === null ? null : (0, react.createElement)("aside", {
				className: AcpAuditHeaderAction_module_css_default.details,
				"aria-label": t("auditDetails")
			}, (0, react.createElement)("div", { className: AcpAuditHeaderAction_module_css_default.detailsHeader }, (0, react.createElement)("div", { className: AcpAuditHeaderAction_module_css_default.detailsTitle }, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Tag, { tone: entryTone(selected) }, categoryLabel(t, selected.category)), (0, react.createElement)("span", { className: AcpAuditHeaderAction_module_css_default.detailsLocation }, `#${String(selected.seq)}`), (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.Button, {
				variant: "ghost",
				onClick: () => {
					copySelected();
				}
			}, t(copyState === "copied" ? "auditCopied" : "auditCopy")), copyState === "failed" ? (0, react.createElement)("span", { role: "status" }, t("auditCopyFailed")) : null), (0, react.createElement)("button", {
				type: "button",
				className: AcpAuditHeaderAction_module_css_default.close,
				"aria-label": t("auditClose"),
				onClick: () => setSelectedSeq(null)
			}, (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.IconCloseOutlineMedium, { size: 14 }))), (0, react.createElement)("div", {
				key: selected.seq,
				className: AcpAuditHeaderAction_module_css_default.detailsBody,
				"data-audit-detail-scroll": true
			}, (0, react.createElement)("p", { className: AcpAuditHeaderAction_module_css_default.detailsSummary }, auditSummaryOf(t, selected)), selected.severity !== "info" ? (0, react.createElement)("p", { className: AcpAuditHeaderAction_module_css_default.detailsSummary }, auditRecordedCause(selected) ?? t("auditNoCause")) : null, selected.status === "exit-unverified" ? (0, react.createElement)("p", { className: AcpAuditHeaderAction_module_css_default.detailsSummary }, t("auditLegacyExitExplanation")) : null, selected.summaryCode === "replay.not-compared" ? (0, react.createElement)("p", { className: AcpAuditHeaderAction_module_css_default.detailsSummary }, t("auditReplayExplanation")) : null, (0, react.createElement)("dl", { className: AcpAuditHeaderAction_module_css_default.overview }, (0, react.createElement)("div", null, (0, react.createElement)("dt", null, t("auditTime")), (0, react.createElement)("dd", null, timeOf(selected.time))), (0, react.createElement)("div", null, (0, react.createElement)("dt", null, t("auditSequence")), (0, react.createElement)("dd", null, String(selected.seq)))), selected.detail === null ? (0, react.createElement)("p", { className: AcpAuditHeaderAction_module_css_default.noDetails }, t("auditNoDetails")) : (() => {
				const detail = auditDetailOf(selected.detail);
				return detail.kind === "json" ? (0, react.createElement)(_deepseek_ai_dsh_client_ui_primitives.JsonTree, {
					data: detail.value,
					label: t("auditDetailJson"),
					className: AcpAuditHeaderAction_module_css_default.jsonPayload,
					labels: acpJsonTreeLabels(t),
					...jsonStringWrapping === void 0 ? {} : { stringWrapping: {
						...jsonStringWrapping,
						label: t("auditWrapLines")
					} },
					expandTopLevel: true
				}) : (0, react.createElement)("pre", { className: AcpAuditHeaderAction_module_css_default.detailPayload }, detail.value);
			})()))), exportState === "loading" ? (0, react.createElement)("p", { role: "status" }, t("auditExportLoading")) : exportState === "failed" ? (0, react.createElement)("p", {
				role: "alert",
				className: AcpAuditHeaderAction_module_css_default.error
			}, t(exportError === "session-changed" ? "auditExportSessionChanged" : "auditExportFailed")) : exportState === "downloaded" && supportExport !== null ? (0, react.createElement)("div", { "data-support-export-summary": true }, (0, react.createElement)("p", { role: "status" }, t("auditExportComplete")), (0, react.createElement)("p", null, t("auditExportPrivacy")), (0, react.createElement)("p", null, t("auditExportCounts", {
				audit: supportExport.audit.rows.length,
				activity: supportExport.activity.rows.length
			})), (0, react.createElement)("p", null, t("auditExportScopeNote"))) : null);
		}
		function createAcpAuditView(remote, jsonStringWrapping) {
			return (props) => (0, react.createElement)(AcpAuditView, {
				...props,
				remote,
				...jsonStringWrapping === void 0 ? {} : { jsonStringWrapping }
			});
		}
		//#endregion
		//#region src/client/ui/locales.ts
		/**
		* Copy dictionaries for ACP configuration, conversations, Teams, and diagnostics. Precedent:
		* ui-settings-models/src/client/locales.ts — one flat template-string map per
		* locale, keyed by a union type each component's `t` seat is narrowed to.
		*
		* 用户可见文案保持简短；协议和产品边界由 README 维护。
		*/
		const zh = {
			acpQuestionSubmit: "提交选择",
			acpQuestionSubmitting: "提交中",
			acpQuestionCancel: "取消请求",
			acpQuestionUnavailable: "问题已不能回答",
			acpQuestionFailed: "提交失败，请重试",
			acpQuestionCopy: "复制",
			acpQuestionDetails: "请求详情",
			acpQuestionChoices: "授权选项",
			acpQuestionCopied: "已复制",
			acpQuestionFootnotes: "脚注",
			auditSummaryPermissionBridge: "工具桥审批判断",
			auditAutoApproved: "已自动批准 DSH 工具请求",
			auditBridgeUnavailable: "没有工具桥连接",
			auditPolicyUnavailable: "无法读取审批策略，未自动批准",
			auditBridgeInactive: "连接已失效",
			auditPromptInactive: "请求已不在执行中",
			auditIdentityUnmatched: "无法匹配当前连接的工具身份",
			auditInvalidToolName: "已拒绝当前连接中不存在的工具调用",
			auditNotCoordination: "普通工具，保留 Agent 审批",
			auditApprovalRequired: "按会话策略转交审批",
			auditAllowOnceMissing: "Agent 未提供允许一次选项",
			"activity.code": "代码",
			"activity.wrap": "自动换行",
			"activity.unwrap": "取消自动换行",
			recoveryUnavailable: "暂时无法读取恢复状态。",
			recoveryReconnecting: "正在重新连接恢复状态…",
			recoveryFinishingTools: "正在等待工具收尾…",
			recoverySavingResults: "正在保存本轮结果…",
			recoveryStorageError: "本轮结果暂未保存；本地存储可用后会自动重试。",
			recoveryActionFailed: "恢复操作失败，请重试",
			toastProfileSaved: "已保存",
			toastProfileSaveFailed: "无法保存 Agent，请检查配置详情",
			toastProfileDeleted: "已删除",
			toastProfileDeleteFailed: "无法删除 Agent，请查看配置详情",
			toastSessionOutcome: "{message}（会话：{session}）",
			agentControlRunning: "运行中可查看设置；停止后可修改。",
			agentControlReadOnly: "当前设置只读。",
			teamMemberOpen: "查看 {name} 的会话",
			teamResultDetails: "查看各成员结果",
			teamResultApplied: "已保存",
			teamResultInactive: "成员正在运行或创建中",
			teamResultMissing: "成员已移除或类型已改变",
			teamResultStale: "会话状态暂不可修改",
			teamResultUnsupported: "不支持此模式",
			teamResultSelected: "已选择此模式",
			teamResultChanged: "当前会话已切换",
			teamResultFailed: "保存失败，请重试",
			auditCopy: "复制所选记录",
			settingsWriteRefused: "配置保存未被接受，已重新加载最新配置，请检查后重试。",
			teamManage: "成员管理",
			teamBatchMode: "批量调整模式",
			teamInterruptAll: "中断所有成员",
			teamInterrupting: "正在中断…",
			teamInterruptHint: "中断所有成员的当前执行，保留主会话和会话记录。",
			teamInterruptResult: "已向 {accepted} 个成员发送中断，跳过 {skipped} 个，失败 {failed} 个。",
			teamInterruptFailed: "无法读取成员状态，未发送中断，请重试。",
			teamProfileUnknown: "ACP 类型未知",
			teamModeUnknown: "模式暂不可用",
			teamModePending: "下次请求生效；当前：{mode}",
			teamModeResult: "已保存 {applied} 个，跳过 {skipped} 个，失败 {failed} 个。",
			teamManageClose: "关闭成员管理",
			teamRefresh: "刷新",
			teamModelLabel: "模型",
			teamModeLabel: "模式",
			teamModelUnknown: "模型暂不可用",
			teamModelChoose: "选择 {name} 的模型",
			teamModelLoading: "正在读取模型目录…",
			teamModelLoadFailed: "无法读取模型目录，请重试。",
			teamModelSaveFailed: "无法更改成员模型，请重试。",
			teamModelEmpty: "暂无可选模型。",
			teamMemberModelPending: "下次请求生效；当前：{model}",
			teamStatusrunning: "运行中",
			teamStatusinactive: "未运行",
			teamStatusprovisioning: "创建中",
			teamStatusfailed: "失败",
			teamManageError: "无法读取成员状态，请刷新重试。",
			teamMetadataLoading: "正在读取 ACP 成员设置…",
			teamProjectionFailed: "团队记录读取失败，成员操作已停用。",
			teamStatusunknown: "运行状态暂不可用",
			teamAllowOnce: "允许一次",
			teamReject: "拒绝",
			teamAllowAll: "全部允许",
			teamRejectAll: "全部拒绝",
			teamBatchHint: "仅处理当前 {count} 个普通审批；允许仅限本次。其他问题需单独处理。",
			teamAnswerFailed: "{count} 个请求提交失败，请查看仍待处理的请求后重试。",
			teamPendingTitle: "需要你处理 · {count} 个子会话",
			teamPendingLoading: "正在加载待处理请求…",
			teamPendingUncounted: "待处理请求（数量暂不可用）",
			teamPendingHint: "待审批的操作已暂停。你仍可与主会话交流；发送消息不会批准这些请求。",
			teamPendingCollapse: "收起",
			teamPendingExpand: "展开",
			teamPendingApproval: "等待审批",
			teamPendingQuestion: "等待回答",
			teamPendingOther: "等待处理",
			teamPendingOpen: "查看会话",
			teamApprovalEntry: "{name} · 待处理请求",
			teamApprovalLoadFailed: "暂时无法确认子会话待处理请求",
			teamApprovalRechecking: "正在重新确认待处理请求…",
			teamApprovalOpenFailed: "无法打开子会话，请从子会话列表重试",
			agentConfiguration: "Agent 配置",
			toolApprovalDefault: "DSH 工具默认审批",
			toolApprovalDefaultHelp: "新会话初始化时使用此默认值；已有会话保持原策略。仅处理 Agent 使用 DSH 工具的授权请求，不改变 Agent 模式或 DSH 工具权限。Agent 自带工具和其他 MCP 服务不受此设置影响；Devin 请求仍需手动确认。",
			toolApprovalAuto: "自动批准",
			toolApprovalAsk: "询问",
			toolApprovalSaveFailed: "无法保存默认审批设置，请重试。",
			toolApprovalSession: "DSH 工具审批",
			toolApprovalAutoDescription: "可自动确认 Agent 使用 DSH 工具的授权请求；Devin 请求仍需手动确认。",
			toolApprovalAskDescription: "Agent 请求授权使用 DSH 工具时，由你确认。",
			toolApprovalScope: "仅影响后续授权请求；Agent 模式和 DSH 工具权限不变，已挂起的请求仍需手动处理。",
			toolApprovalInherited: "继承 Lead 的当前策略，只读。",
			toolApprovalUnavailable: "无法读取 DSH 工具审批设置，请重试。",
			toolApprovalRetry: "重试读取 DSH 工具审批设置",
			toolApprovalChangeFailed: "无法保存 DSH 工具审批设置，请重试。",
			settingsLoading: "正在读取设置…",
			settingsUnavailable: "当前环境不提供设置服务，ACP 面板不可用。",
			settingsInvalid: "dsh-acp-adapter 配置无效，请检查配置文件后重试；面板已拒绝编辑无效配置。",
			readOnly: "当前设置文档为只读，无法保存修改。",
			healthUnreachable: "无法连接 ACP 插件的宿主服务，服务可能尚未加载。暂时无法读取 Agent 状态，仍可编辑配置",
			emptyAgents: "还没有配置任何 ACP Agent",
			addAgent: "添加 Agent",
			addCustom: "手动添加",
			refresh: "重新检查",
			refreshing: "检查中…",
			healthCheckTransportFailed: "检查请求失败，请重试。{reference}",
			probeNotInstalled: "无法启动命令「{command}」；请检查是否已安装，以及可执行命令和参数是否正确。{reference}",
			probeAuthRequired: "Agent 尚未登录；请先在终端完成登录，再重新检查。{reference}",
			probeResourceExhausted: "Agent 的资源或使用配额已耗尽；请查看 Agent 的用量限制后再继续。{reference}",
			probeTimeout: "Agent 未在限时内完成 ACP 握手；请确认命令可正常启动后重试。{reference}",
			probeCrash: "Agent 在 ACP 检查期间意外退出；请检查 Agent 自身日志后重试。{reference}",
			probeCancelled: "ACP 检查已取消。{reference}",
			probeProtocolError: "Agent 未能完成 ACP 协议交互；请检查 Agent 版本和启动配置。{reference}",
			actionSaveFailed: "保存失败，请重试。{reference}",
			actionDeleteFailed: "删除失败，请重试。{reference}",
			loginInstruction: "请先在终端完成登录：{hint}",
			loginSetupInstruction: "如需登录，请在 Agent 所在主机的终端运行：{hint}。此处仅提供指引，不会执行命令或更改认证配置。",
			loginGenericInstruction: "登录和 API 配置由 Agent 自己管理；如需配置，请在 Agent 所在主机按其官方说明操作。",
			auditSummaryRestoreReused: "继续使用当前 Agent 连接",
			auditSummaryRestoreResumed: "已恢复 Agent 会话（resume）",
			auditSummaryRestoreLoaded: "已加载 Agent 会话，回放仅用于诊断",
			"activity.detailLoading": "正在加载详情…",
			"activity.detailLoadFailed": "详情加载失败，已有对话不受影响。",
			"activity.detailRetry": "重试",
			catalogVersionDifferent: "Agent 版本 {actual} 与目录参考 {reference} 不同；这不表示版本过旧，也不影响使用。",
			catalogVerified: "已验证适配 · {count}",
			catalogUnverified: "目录收录 · 未验证 · {count}",
			catalogVerificationScope: "验证针对适配能力，不覆盖每个版本或平台。",
			catalogInstallHint: "安装指引：{hint}",
			catalogManualCommand: "请按 Agent 所在主机的平台安装二进制，并填写已安装的命令路径；浏览器平台不用于选择 Agent 程序。",
			edit: "编辑",
			remove: "删除",
			removeConfirm: "删除 Agent「{name}」？其模型路由将一并移除",
			removeConfirmBound: "{count} 个既有会话正在使用此 Agent 配置；删除后这些会话将无法使用该 Agent，也不会自动改用其他 Agent",
			removing: "删除中…",
			cancel: "取消",
			save: "保存",
			saving: "保存中…",
			editorTitleAdd: "新增 ACP Agent",
			editorTitleEdit: "编辑 ACP Agent",
			advancedSettings: "连接设置",
			advancedOptions: "高级选项",
			advancedOptionsHint: "可选。仅在 Agent 需要额外环境变量时填写。",
			advancedOptionsConfigured: "已配置 {envCount} 个环境变量。",
			fieldId: "ID",
			fieldIdHint: "小写字母开头，可含数字与连字符；会成为模型路由 acp-<id> 与健康端点路径段。",
			fieldName: "显示名称",
			fieldNameHint: "模型选择器中显示为「<名称> · ACP」",
			fieldCommand: "可执行命令",
			fieldCommandHint: "PATH 上的命令名或绝对路径。",
			fieldArgs: "启动参数",
			fieldArgsHint: "每行一个参数，空行忽略。",
			fieldEnv: "环境变量",
			fieldEnvHint: "传给此 Agent 进程的配置，每行 KEY=VALUE。可设置 API 地址、密钥或配置目录，可能覆盖 Agent 原有设置；留空不添加覆盖。已保存的疑似密钥不回显。",
			fieldEnvMasked: "已配置的密钥（值不回显）",
			envMaskedConfigured: "已配置",
			envMaskedRemove: "移除",
			errorIdRequired: "ID 不能为空。",
			errorIdInvalid: "ID 必须以小写字母开头，只能含小写字母、数字与连字符。",
			errorIdTaken: "该 ID 已被另一个 Agent 占用",
			errorNameRequired: "显示名称不能为空。",
			errorCommandRequired: "可执行命令不能为空。",
			errorEnvKey: "第 {line} 行不是合法的 KEY=VALUE（键需为 shell 标识符）。",
			errorEnvDuplicate: "第 {line} 行的键与前面重复。",
			errorRuntimeTaken: "内置 Agent 类型「{runtime}」已配置为「{name}」（ID：{id}）；每种类型只允许一份配置，请编辑已有配置",
			openExisting: "打开已有配置",
			stateSavedUnverified: "未探测",
			stateReady: "协议可用",
			"subagent.openRecord": "打开只读记录",
			incompatibleInstruction: "ACP 路由已停用；请将 DSH 调整到插件支持的版本后重载插件。普通模型会话不受影响。",
			recoveryTitle: "ACP 会话需要恢复",
			recoveryOutcomeUnknown: "上一次 Agent 执行结果未知，请先恢复会话或明确放弃上下文。",
			recoveryReconnectRequired: "Agent 会话需要重新连接。",
			recoverySessionLost: "原 Agent 会话已不可用。",
			recoveryHistoryDamaged: "本地 ACP 恢复记录损坏，已阻止继续执行。",
			recoveryHistoryMismatch: "Agent 历史与 DSH 历史无法证明一致。为保护两侧历史，已暂停发送。",
			recoveryGeneric: "ACP 会话需要恢复。",
			recoveryDetails: "处理恢复问题",
			recoveryClose: "关闭",
			recoveryReconnect: "重新连接原会话",
			recoveryReconnectExplanation: "继续使用原 Agent 上下文，不会重新发送上次的请求",
			recoveryRebind: "放弃上下文并继续",
			recoveryRebindExplanation: "Agent 将从空白上下文开始，DSH 中已显示的历史会保留",
			recoveryNew: "新建会话",
			recoveryNewExplanation: "在新 DSH 会话中继续，当前会话保持不变",
			recoveryBusy: "处理中…",
			recoveryChoiceHelp: "选择一种继续方式",
			recoveryDiagnostics: "查看恢复诊断",
			recoveryHistoryPreserved: "无论选择哪一项，DSH 中已经显示的对话都不会被删除。",
			agentControlTitle: "会话",
			agentControlMode: "模式",
			agentControlMixed: "多个当前值",
			agentControlBack: "返回会话设置",
			agentControlOn: "开启",
			agentControlOff: "关闭",
			agentControlDefault: "默认",
			agentControlUnavailable: "Agent 控制当前不可用",
			agentControlRetry: "点击重新连接 Agent 选项",
			agentControlTooltip: "设置当前 Agent 会话的模式和选项",
			agentContextUsage: "上下文：{used} / {size}（{percent}%）",
			agentSessionCost: "Agent 报告的会话累计成本：{amount} {currency}",
			agentStateStale: "上次 Agent 上报",
			auditIssues: "异常",
			auditOperations: "操作记录",
			auditTechnical: "技术记录",
			auditNoIssues: "暂无已记录的 ACP 异常。",
			auditScanMore: "已检查范围内暂无匹配记录，仍有记录待检查。",
			auditScope: "仅展示 ACP 适配器已记录的信息；Agent 内部错误可能不在此处。",
			auditCurrentState: "最近刷新时的恢复状态",
			auditRecoveryUnavailable: "无法读取当前恢复状态，请刷新重试。",
			auditRecoveryAction: "处理选项见输入栏旁的恢复提示。",
			auditNoCause: "未记录具体原因。",
			auditReplayExplanation: "此记录未区分连接复用与实际恢复，也未比较外部回放和 DSH 历史；不表示恢复失败。",
			auditSummaryRead: "读取文件",
			auditSummaryWrite: "写入文件",
			auditStatusStopRequested: "已请求终止",
			auditStatusExitUnverified: "退出原因待确认",
			auditLegacyExitExplanation: "此旧记录包含非零退出码或退出信号，但未记录是否主动终止；不能据此确定是操作取消还是进程故障。",
			auditAllowOnce: "已允许本次操作",
			auditAllowAlways: "已选择持续允许（范围由 Agent 定义）",
			auditRejectOnce: "已拒绝本次操作",
			auditRejectAlways: "已选择持续拒绝（范围由 Agent 定义）",
			auditOpen: "ACP 诊断",
			auditTitle: "ACP 诊断",
			auditLoading: "正在读取诊断记录…",
			auditLoadingShort: "读取中…",
			auditRefresh: "刷新",
			auditExport: "导出安全摘要",
			auditExportLoading: "正在收集并下载有界摘要…",
			auditExportComplete: "JSON 下载已开始。",
			auditExportFailed: "无法创建诊断导出。点击“导出安全摘要”可重试。",
			auditExportSessionChanged: "会话已切换。请重新打开诊断面板再试。",
			auditExportPrivacy: "文件仅包含固定诊断代码、状态和计数，不含消息正文、命令、路径或原始会话 ID。时间与数量仍属于元数据。",
			auditExportCounts: "诊断记录：{audit}；活动修订：{activity}。",
			auditExportScopeNote: "详细范围和快照限制已写入下载的 JSON。",
			auditSearch: "搜索已加载记录",
			auditSearchPlaceholder: "搜索已加载记录",
			auditTimeline: "ACP 诊断记录",
			auditTime: "时间",
			auditSequence: "序号",
			auditNoDetails: "无更多详情。",
			auditDetailJson: "诊断记录 JSON",
			auditCopyValue: "复制值",
			auditCopyJson: "复制 JSON",
			auditCopyPath: "复制路径",
			auditCopyPrettyJson: "复制格式化 JSON",
			auditCopyCompactJson: "复制紧凑 JSON",
			auditCopied: "已复制",
			auditCopyFailed: "复制失败",
			auditCollapseNode: "收起节点",
			auditExpandNode: "展开节点",
			auditCopyOptions: "复制选项：{action}",
			auditWrapLines: "自动换行",
			auditUnavailable: "无法读取 ACP 诊断记录，请刷新重试。",
			auditEmpty: "此视图暂无记录。",
			auditNoMatch: "已加载记录中没有匹配项。",
			auditLoadMore: "加载更多",
			auditCategoryRecovery: "诊断",
			auditCategoryPermission: "权限",
			auditCategoryAgent: "会话",
			auditCategoryFiles: "文件与终端",
			auditDetails: "查看详情",
			auditClose: "关闭",
			auditPageEnd: "已显示当前分类全部记录",
			auditSummaryBinding: "会话连续性记录",
			auditSummaryPermissionAsked: "Agent 请求权限",
			auditSummaryPermissionDecided: "权限决定已记录",
			auditSummaryReconciliation: "恢复事件已记录",
			auditSummaryReplayMatched: "历史回放已匹配",
			auditSummaryReplayDifferent: "历史回放存在差异",
			auditSummaryReplayOverflow: "历史回放超出暂存上限",
			auditSummaryReplayNotCompared: "会话复用或恢复记录",
			auditSummaryReplayUnavailable: "历史回放比较不可用",
			auditSummaryDegradation: "展示或活动记录存在限制",
			auditSummaryFilesystem: "文件操作已记录",
			auditSummaryTerminal: "终端操作已记录",
			auditSummarySessionFork: "会话分叉结果已记录",
			auditSummaryAgentEvent: "Agent 事件已记录",
			auditStatusNativeAccess: "原生 Agent 访问",
			auditStatusConfigSync: "配置同步",
			auditStatusSessionSetup: "会话建立",
			auditStatusOk: "成功",
			auditStatusError: "失败",
			auditStatusAborted: "已中止",
			auditStatusTimeout: "超时",
			auditStatusConcurrentChange: "发生并发修改",
			auditStatusSelected: "已选择",
			auditStatusCancelled: "已取消",
			auditStatusStarted: "已启动",
			auditStatusRunning: "运行中",
			auditStatusExited: "已退出",
			auditStatusOutputSummary: "已读取输出",
			auditStatusKilled: "已终止",
			auditStatusReleased: "已释放",
			auditForkInherited: "已继承 Agent 上下文",
			auditForkBlank: "未继承 Agent 上下文",
			auditForkUnsupported: "Agent 不支持会话分叉",
			auditForkParentNotIdle: "原会话仍在执行",
			auditForkParentRecoveryRequired: "原会话需要先完成恢复",
			auditForkParentUnavailable: "无法读取原会话绑定",
			auditForkParentMismatch: "原会话绑定不匹配",
			auditForkOlderBoundary: "分叉点不是最新语义边界",
			auditForkCandidateUnavailable: "缺少可验证的分叉信息",
			"activity.unavailable": "Agent 活动暂时不可用。",
			"activity.initialReadRetrying": "暂时无法读取活动记录，正在重试…",
			"activity.reconnecting": "正在重新连接活动记录…",
			"activity.retry": "重试",
			"activity.detailTooLarge": "内容过大，未显示完整详情；审计摘要不能用于比较完整文件。",
			"activity.detailInvalid": "完整详情已损坏，无法展示；审计摘要不能用于比较完整文件。",
			"activity.output.image": "图片无法在此工具记录中预览。{metadata}",
			"activity.output.audio": "音频无法在此工具记录中播放。{metadata}",
			"activity.output.resource": "此工具记录仅包含资源引用，无法直接打开。{metadata}",
			"activity.output.embeddedText": "嵌入的文本资源：{metadata}",
			"activity.output.binaryResource": "二进制资源无法在此工具记录中预览。{metadata}",
			"activity.output.diff": "文件差异：{path}",
			"activity.output.terminal": "终端引用，无法在此工具记录中打开：{id}",
			"activity.output.unknown": "此工具输出类型无法展示：{type}",
			"activity.output.truncated": "资源文本过长，已省略后续内容",
			"activity.status.pending": "待处理",
			"activity.status.running": "进行中",
			"activity.status.completed": "已完成",
			"activity.status.failed": "失败",
			"activity.status.cancelled": "已取消",
			"activity.status.unfinished": "工具未报告结果",
			"activity.control.waitTitle": "等待团队回信",
			"activity.control.notExecuted": "未执行",
			"activity.control.teamReplyQueued": "已有团队回信排队，DSH 会在当前回复结束后交给 Agent 继续处理",
			"activity.externalAgent": "外部 Agent",
			"activity.externalAgentStatus.running": "运行中",
			"activity.externalAgentStatus.completed": "已完成",
			"activity.externalAgentStatus.failed": "失败",
			"activity.externalAgentStatus.cancelled": "已取消",
			"activity.externalAgentStatus.unfinished": "状态未确认",
			"activity.copy": "复制",
			"activity.copied": "已复制",
			"activity.collapse": "收起",
			"activity.expandCount": "展开其余 {count} 行",
			"activity.read.window": "显示 {shown} / {total} 行",
			"activity.terminal.signal": "信号 {signal}",
			"activity.terminal.commandLine": "命令第 {line} 行",
			"activity.terminal.exitCode": "退出码 {code}",
			"activity.terminal.noExitCode": "未提供退出码",
			"activity.terminal.noOutput": "无输出",
			"activity.terminal.outputNotProvided": "此工具记录未提供输出",
			"activity.terminal.collapseAria": "收起输出",
			"activity.terminal.expandAria": "展开其余 {count} 行输出",
			"activity.tool.plan": "更新计划",
			"activity.kind.tool": "工具调用详情",
			"activity.kind.plan": "计划详情",
			"activity.kind.terminal": "终端详情",
			"activity.kind.diff": "文件变更详情",
			"activity.kind.resource": "资源详情",
			"activity.kind.delegated": "子智能体详情",
			"activity.kind.other": "Agent 活动详情",
			"subagent.task": "委派任务",
			"subagent.result": "最终输出",
			"subagent.summary": "Agent 报告的摘要",
			"subagent.readOnlyTitle": "外部 Agent 只读记录",
			"subagent.readOnlyBody": "这里仅保留 Agent 返回的任务和结果，不包含完整的内部执行过程，也不支持后续消息",
			"subagent.unavailable": "该信息不可用。",
			"subagent.observedTiming": "目录耗时是 DSH 观察到的委派时间，不代表模型或 Agent 自报耗时。",
			crossBackendTitle: "需要新建会话",
			crossBackendDescription: "当前会话将保持不变，新的后端将在新 DSH 会话中运行。",
			crossBackendCancel: "取消",
			crossBackendContinue: "继续",
			crossBackendWorking: "处理中…",
			crossBackendNoLocation: "找不到新会话的工作区或工作目录。",
			crossBackendFailureRestore: "无法恢复当前会话原先使用的模型",
			crossBackendFailureCreate: "无法创建新会话",
			crossBackendFailureSelect: "无法为新会话选择模型",
			crossBackendFailureOpen: "无法打开新会话",
			crossBackendFailureUnknown: "操作失败，请重试",
			crossBackendDiagnostics: "查看技术详情",
			crossBackendFromTo: "将从 {source} 切换到 {target}。",
			crossBackendExistingHistory: "当前对话已有历史，但没有记录可恢复的原模型。继续会在新 DSH 会话中运行智能体并保留原对话；取消后当前会话仍选中该智能体，若要继续原对话，请重新选择模型。"
		};
		const en = {
			acpQuestionSubmit: "Submit",
			acpQuestionSubmitting: "Sending…",
			acpQuestionCancel: "Cancel",
			acpQuestionUnavailable: "This question is no longer available",
			acpQuestionFailed: "Could not submit; try again",
			acpQuestionCopy: "Copy",
			acpQuestionDetails: "Request details",
			acpQuestionChoices: "Authorization options",
			acpQuestionCopied: "Copied",
			acpQuestionFootnotes: "Footnotes",
			auditSummaryPermissionBridge: "Tool bridge permission check",
			auditAutoApproved: "DSH tool request approved automatically",
			auditBridgeUnavailable: "No tool bridge connection",
			auditPolicyUnavailable: "Approval policy unavailable; not auto-approved",
			auditBridgeInactive: "Connection is no longer active",
			auditPromptInactive: "Prompt is no longer active",
			auditIdentityUnmatched: "Tool identity did not match the current connection",
			auditInvalidToolName: "Rejected a tool call absent from the current connection",
			auditNotCoordination: "Ordinary tool; Agent approval is preserved",
			auditApprovalRequired: "Approval follows the session policy",
			auditAllowOnceMissing: "Agent did not offer allow once",
			"activity.code": "Code",
			"activity.wrap": "Wrap lines",
			"activity.unwrap": "Unwrap lines",
			recoveryUnavailable: "Recovery status is unavailable.",
			recoveryReconnecting: "Reconnecting to recovery status…",
			recoveryFinishingTools: "Waiting for tools to finish…",
			recoverySavingResults: "Saving this turn’s results…",
			recoveryStorageError: "This turn’s results have not been saved yet. Local saving will retry automatically when storage is available.",
			recoveryActionFailed: "The recovery action failed. Please retry.",
			toastProfileSaved: "Saved",
			toastProfileSaveFailed: "Could not save this Agent. Review the configuration details",
			toastProfileDeleted: "Deleted",
			toastProfileDeleteFailed: "Could not delete this Agent. Review the configuration details",
			toastSessionOutcome: "{message} (Session: {session})",
			agentControlRunning: "Settings are read-only while running. Stop to make changes.",
			agentControlReadOnly: "These settings are currently read-only.",
			teamMemberOpen: "Open {name}’s session",
			teamResultDetails: "View member results",
			teamResultApplied: "Saved",
			teamResultInactive: "Member is running or starting",
			teamResultMissing: "Member was removed or its profile changed",
			teamResultStale: "Session settings are currently read-only",
			teamResultUnsupported: "Mode is not supported",
			teamResultSelected: "Mode is already selected",
			teamResultChanged: "The active conversation changed",
			teamResultFailed: "Save failed; please retry",
			auditCopy: "Copy selected record",
			settingsWriteRefused: "The configuration change was refused. Latest values have been reloaded; review them and retry.",
			teamManage: "Manage members",
			teamBatchMode: "Change modes together",
			teamInterruptAll: "Interrupt all members",
			teamInterrupting: "Interrupting…",
			teamInterruptHint: "Interrupt every teammate’s current turn, preserving the main session and session history.",
			teamInterruptResult: "Interrupt sent to {accepted}, skipped {skipped}, failed {failed}.",
			teamInterruptFailed: "Could not read member status. No interrupts sent; please retry.",
			teamProfileUnknown: "Unknown ACP profile",
			teamModeUnknown: "Mode unavailable",
			teamModePending: "Applies next request; current: {mode}",
			teamModeResult: "Saved {applied}, skipped {skipped}, failed {failed}.",
			teamManageClose: "Close member management",
			teamRefresh: "Refresh",
			teamModelLabel: "Model",
			teamModeLabel: "Mode",
			teamModelUnknown: "Model unavailable",
			teamModelChoose: "Choose a model for {name}",
			teamModelLoading: "Loading model catalog…",
			teamModelLoadFailed: "Could not load the model catalog. Retry.",
			teamModelSaveFailed: "Could not change the member’s model. Please retry.",
			teamModelEmpty: "No models available.",
			teamMemberModelPending: "Applies next request; current: {model}",
			teamStatusrunning: "Running",
			teamStatusinactive: "Inactive",
			teamStatusprovisioning: "Starting",
			teamStatusfailed: "Failed",
			teamManageError: "Cannot read member state. Refresh to retry.",
			teamMetadataLoading: "Loading ACP member settings…",
			teamProjectionFailed: "Team records could not be read. Member actions are disabled.",
			teamStatusunknown: "Runtime status unavailable",
			teamAllowOnce: "Allow once",
			teamReject: "Reject",
			teamAllowAll: "Allow all",
			teamRejectAll: "Reject all",
			teamBatchHint: "Only the current {count} approvals, once each. Handle other requests individually.",
			teamAnswerFailed: "{count} requests could not be submitted. Review the remaining requests and retry.",
			teamPendingTitle: "Child sessions needing your attention · {count}",
			teamPendingLoading: "Loading pending requests…",
			teamPendingUncounted: "Pending requests (count unavailable)",
			teamPendingHint: "Operations awaiting approval are paused. You can still talk to this session; sending a message does not approve these requests.",
			teamPendingCollapse: "Collapse",
			teamPendingExpand: "Expand",
			teamPendingApproval: "Awaiting approval",
			teamPendingQuestion: "Awaiting answer",
			teamPendingOther: "Pending request",
			teamPendingOpen: "View session",
			teamApprovalEntry: "{name} · Pending request",
			teamApprovalLoadFailed: "Child pending requests could not be verified.",
			teamApprovalRechecking: "Rechecking pending requests…",
			teamApprovalOpenFailed: "Could not open the child session. Retry from the child session list.",
			agentConfiguration: "Agent configuration",
			toolApprovalDefault: "Default DSH tool approval",
			toolApprovalDefaultHelp: "Used when new sessions initialize; existing sessions keep their policy. Only handles Agent requests for permission to use DSH tools. Agent mode and DSH tool permissions stay unchanged. Agent tools and other MCP servers are excluded; Devin requests still need your approval.",
			toolApprovalAuto: "Auto approve",
			toolApprovalAsk: "Ask",
			toolApprovalSaveFailed: "Could not save the default approval setting. Please retry.",
			toolApprovalSession: "DSH tool approval",
			toolApprovalAutoDescription: "Can automatically confirm requests to use DSH tools. Devin requests still need your approval.",
			toolApprovalAskDescription: "Ask you when the Agent requests permission to use DSH tools.",
			toolApprovalScope: "Applies to future authorization requests. Agent mode and DSH tool permissions stay unchanged; pending requests still need your approval.",
			toolApprovalInherited: "Following the Lead’s current policy; read-only.",
			toolApprovalUnavailable: "Could not read DSH tool approval settings. Please retry.",
			toolApprovalRetry: "Retry reading DSH tool approval settings",
			toolApprovalChangeFailed: "Could not save the DSH tool approval setting. Please retry.",
			settingsLoading: "Loading settings…",
			settingsUnavailable: "No settings service in this environment; the ACP panel is unavailable.",
			settingsInvalid: "The dsh-acp-adapter configuration is invalid. Fix the config file and retry; the panel refuses to edit an invalid document.",
			readOnly: "The settings document is read-only; changes cannot be saved.",
			healthUnreachable: "Cannot connect to the ACP plugin’s host service; it may not be loaded. Agent status is unavailable, but you can still edit the configuration.",
			emptyAgents: "No ACP Agents configured yet.",
			addAgent: "Add Agent",
			addCustom: "Add manually",
			refresh: "Re-check",
			refreshing: "Checking…",
			healthCheckTransportFailed: "The check request failed. Try again.{reference}",
			probeNotInstalled: "Cannot start \"{command}\". Check that it is installed and that its executable and arguments are correct.{reference}",
			probeAuthRequired: "The Agent is not signed in. Complete login in your terminal, then re-check it.{reference}",
			probeResourceExhausted: "The Agent has exhausted an available resource or usage quota. Check its usage limits before continuing.{reference}",
			probeTimeout: "The Agent did not complete the ACP handshake in time. Verify that the command starts correctly, then retry.{reference}",
			probeCrash: "The Agent exited during the ACP check. Inspect the Agent logs, then retry.{reference}",
			probeCancelled: "The ACP check was cancelled.{reference}",
			probeProtocolError: "The Agent could not complete the ACP protocol exchange. Check the Agent version and launch configuration.{reference}",
			actionSaveFailed: "Saving failed. Try again.{reference}",
			actionDeleteFailed: "Deleting failed. Try again.{reference}",
			loginInstruction: "Complete login in your terminal first: {hint}",
			loginSetupInstruction: "If sign-in is needed, run this in a terminal on the Agent host: {hint}. This is guidance only; it does not run commands or change authentication settings.",
			loginGenericInstruction: "The Agent manages its own sign-in and API configuration. Follow its official instructions on the Agent host if setup is needed.",
			auditSummaryRestoreReused: "Continued on the active Agent connection",
			auditSummaryRestoreResumed: "Agent session resumed",
			auditSummaryRestoreLoaded: "Agent session loaded; replay kept for diagnostics",
			"activity.detailLoading": "Loading details…",
			"activity.detailLoadFailed": "Could not load details. Your conversation is unaffected.",
			"activity.detailRetry": "Retry",
			catalogVersionDifferent: "Agent version {actual} differs from catalog reference {reference}. This does not mean it is outdated and does not block use.",
			catalogVerified: "Verified adapters · {count}",
			catalogUnverified: "Catalog entries · Unverified · {count}",
			catalogVerificationScope: "Adapter coverage does not certify every version or platform.",
			catalogInstallHint: "Install: {hint}",
			catalogManualCommand: "Install the binary for the Agent host and enter its installed command path. The browser platform is not used to select the Agent executable.",
			edit: "Edit",
			remove: "Delete",
			removeConfirm: "Delete Agent \"{name}\"? Its model route is removed with it.",
			removeConfirmBound: "{count} existing sessions use this Agent configuration. Deleting it makes that Agent unavailable to those sessions; they will not switch to another Agent automatically.",
			removing: "Deleting…",
			cancel: "Cancel",
			save: "Save",
			saving: "Saving…",
			editorTitleAdd: "Add ACP Agent",
			editorTitleEdit: "Edit ACP Agent",
			advancedSettings: "Connection settings",
			advancedOptions: "Advanced options",
			advancedOptionsHint: "Optional. Use this when the Agent needs additional environment variables.",
			advancedOptionsConfigured: "{envCount} environment variables configured.",
			fieldId: "ID",
			fieldIdHint: "Starts with a lowercase letter, may contain digits and dashes; becomes the model route acp-<id> and a health-endpoint path segment.",
			fieldName: "Display name",
			fieldNameHint: "Shown in the model picker as “<name> · ACP”.",
			fieldCommand: "Executable",
			fieldCommandHint: "A command name on PATH, or an absolute path.",
			fieldArgs: "Arguments",
			fieldArgsHint: "One argument per line; blank lines are ignored.",
			fieldEnv: "Environment",
			fieldEnvHint: "Configuration passed to this Agent process, one KEY=VALUE per line. API endpoints, keys or configuration directories may override its existing settings; leave empty for no extra overrides. Saved secret-looking values are hidden.",
			fieldEnvMasked: "Configured secrets (values never shown)",
			envMaskedConfigured: "Configured",
			envMaskedRemove: "Remove",
			errorIdRequired: "ID must not be empty.",
			errorIdInvalid: "ID must start with a lowercase letter and contain only lowercase letters, digits, and dashes.",
			errorIdTaken: "This ID is already taken by another Agent.",
			errorNameRequired: "Display name must not be empty.",
			errorCommandRequired: "Executable must not be empty.",
			errorEnvKey: "Line {line} is not a valid KEY=VALUE entry (the key must be a shell identifier).",
			errorEnvDuplicate: "Line {line} repeats an earlier key.",
			errorRuntimeTaken: "The built-in Agent type \"{runtime}\" is already configured as \"{name}\" (ID: {id}). Only one configuration is allowed for each built-in Agent type; edit the existing configuration.",
			openExisting: "Open existing configuration",
			stateSavedUnverified: "not probed",
			stateReady: "protocol available",
			"subagent.openRecord": "Open read-only record",
			incompatibleInstruction: "ACP routes are disabled. Move DSH to a plugin-supported version and reload the plugin; native model sessions are unaffected.",
			recoveryTitle: "ACP session recovery required",
			recoveryOutcomeUnknown: "The previous Agent outcome is unknown. Reconnect or explicitly abandon the context before continuing.",
			recoveryReconnectRequired: "The Agent session needs to be reconnected.",
			recoverySessionLost: "The original Agent session is unavailable.",
			recoveryHistoryDamaged: "Local ACP recovery data is damaged; execution is blocked.",
			recoveryHistoryMismatch: "The Agent history and the DSH history could not be proven to match. Sending is paused to protect both histories.",
			recoveryGeneric: "The ACP session requires recovery.",
			recoveryDetails: "Resolve recovery issue",
			recoveryClose: "Close",
			recoveryReconnect: "Reconnect original session",
			recoveryReconnectExplanation: "Reuse the original Agent context; the previous request will not be sent again.",
			recoveryRebind: "Abandon context and continue",
			recoveryRebindExplanation: "Start the Agent with blank context while keeping the DSH history shown here.",
			recoveryNew: "New session",
			recoveryNewExplanation: "Continue in a new DSH session; the current session stays unchanged.",
			recoveryBusy: "Working…",
			recoveryChoiceHelp: "Choose how to continue",
			recoveryDiagnostics: "View recovery diagnostics",
			recoveryHistoryPreserved: "The conversation already shown in DSH is not deleted by any of these choices.",
			agentControlTitle: "Session",
			agentControlMode: "Mode",
			agentControlMixed: "Mixed values",
			agentControlBack: "Back to session settings",
			agentControlOn: "On",
			agentControlOff: "Off",
			agentControlDefault: "Default",
			agentControlUnavailable: "Agent controls are unavailable",
			agentControlRetry: "Click to reconnect Agent controls",
			agentControlTooltip: "Configure modes and options for this Agent session.",
			agentContextUsage: "Context: {used} / {size} ({percent}%)",
			agentSessionCost: "Agent-reported cumulative session cost: {amount} {currency}",
			agentStateStale: "Last Agent report",
			auditIssues: "Issues",
			auditOperations: "Operations",
			auditTechnical: "Technical records",
			auditNoIssues: "No recorded ACP issues.",
			auditScanMore: "No matching records in the checked range; more records remain to be checked.",
			auditScope: "Only information recorded by the ACP adapter is shown; internal Agent errors may not appear here.",
			auditCurrentState: "Recovery status at last refresh",
			auditRecoveryUnavailable: "Current recovery status could not be read. Refresh to retry.",
			auditRecoveryAction: "Use the recovery notice beside the composer to choose the next step.",
			auditNoCause: "No specific cause was recorded.",
			auditReplayExplanation: "This record does not distinguish connection reuse from restoration or compare external replay with DSH history. It does not indicate a restoration failure.",
			auditSummaryRead: "Read file",
			auditSummaryWrite: "Write file",
			auditStatusStopRequested: "Termination requested",
			auditStatusExitUnverified: "Exit cause unconfirmed",
			auditLegacyExitExplanation: "This older record has a nonzero exit code or exit signal but no termination intent. It cannot distinguish cancellation from a process failure.",
			auditAllowOnce: "Allowed this operation",
			auditAllowAlways: "Persistent allow selected (scope defined by Agent)",
			auditRejectOnce: "Rejected this operation",
			auditRejectAlways: "Persistent reject selected (scope defined by Agent)",
			auditOpen: "ACP Diagnostics",
			auditTitle: "ACP Diagnostics",
			auditLoading: "Loading diagnostic records…",
			auditLoadingShort: "Loading…",
			auditRefresh: "Refresh",
			auditExport: "Export safe summary",
			auditExportLoading: "Collecting and downloading a bounded summary…",
			auditExportComplete: "The JSON download has started.",
			auditExportFailed: "The diagnostic export could not be created. Click Export safe summary to try again.",
			auditExportSessionChanged: "The session changed. Reopen diagnostics and try again.",
			auditExportPrivacy: "The file contains fixed diagnostic codes, statuses, and counts. It excludes message bodies, commands, paths, and raw session IDs. Timestamps and counts remain metadata.",
			auditExportCounts: "Audit records: {audit}; activity revisions: {activity}.",
			auditExportScopeNote: "Detailed scope and snapshot limits are included in the downloaded JSON.",
			auditSearch: "Search loaded records",
			auditSearchPlaceholder: "Search loaded records",
			auditTimeline: "ACP diagnostic records",
			auditTime: "Time",
			auditSequence: "Sequence",
			auditNoDetails: "No additional details.",
			auditDetailJson: "Diagnostic record JSON",
			auditCopyValue: "Copy value",
			auditCopyJson: "Copy JSON",
			auditCopyPath: "Copy path",
			auditCopyPrettyJson: "Copy formatted JSON",
			auditCopyCompactJson: "Copy compact JSON",
			auditCopied: "Copied",
			auditCopyFailed: "Copy failed",
			auditCollapseNode: "Collapse node",
			auditExpandNode: "Expand node",
			auditCopyOptions: "Copy options: {action}",
			auditWrapLines: "Wrap lines",
			auditUnavailable: "ACP diagnostic records could not be read. Refresh to retry.",
			auditEmpty: "No records in this view.",
			auditNoMatch: "No matching loaded records.",
			auditLoadMore: "Load more",
			auditCategoryRecovery: "Diagnostics",
			auditCategoryPermission: "Permissions",
			auditCategoryAgent: "Session",
			auditCategoryFiles: "Files and terminal",
			auditDetails: "View details",
			auditClose: "Close",
			auditPageEnd: "All records in this view are shown",
			auditSummaryBinding: "Session continuity record",
			auditSummaryPermissionAsked: "Agent requested permission",
			auditSummaryPermissionDecided: "Permission decision recorded",
			auditSummaryReconciliation: "Recovery event recorded",
			auditSummaryReplayMatched: "History replay matched",
			auditSummaryReplayDifferent: "History replay differs",
			auditSummaryReplayOverflow: "History replay exceeded the staging limit",
			auditSummaryReplayNotCompared: "Session reuse or restoration record",
			auditSummaryReplayUnavailable: "History replay comparison unavailable",
			auditSummaryDegradation: "Display or activity records have limitations",
			auditSummaryFilesystem: "Filesystem operation recorded",
			auditSummaryTerminal: "Terminal operation recorded",
			auditSummarySessionFork: "Session fork result recorded",
			auditSummaryAgentEvent: "Agent event recorded",
			auditStatusNativeAccess: "Native Agent access",
			auditStatusConfigSync: "Configuration sync",
			auditStatusSessionSetup: "Session setup",
			auditStatusOk: "Succeeded",
			auditStatusError: "Failed",
			auditStatusAborted: "Aborted",
			auditStatusTimeout: "Timed out",
			auditStatusConcurrentChange: "Concurrent change detected",
			auditStatusSelected: "Selected",
			auditStatusCancelled: "Cancelled",
			auditStatusStarted: "Started",
			auditStatusRunning: "Running",
			auditStatusExited: "Exited",
			auditStatusOutputSummary: "Output read",
			auditStatusKilled: "Terminated",
			auditStatusReleased: "Released",
			auditForkInherited: "Agent context inherited",
			auditForkBlank: "Agent context not inherited",
			auditForkUnsupported: "Agent does not support session fork",
			auditForkParentNotIdle: "Parent session is still running",
			auditForkParentRecoveryRequired: "Parent session requires recovery first",
			auditForkParentUnavailable: "Parent session binding unavailable",
			auditForkParentMismatch: "Parent session binding does not match",
			auditForkOlderBoundary: "Fork point is not the latest semantic boundary",
			auditForkCandidateUnavailable: "Verifiable fork information unavailable",
			"activity.unavailable": "Agent activity is temporarily unavailable.",
			"activity.initialReadRetrying": "Activity history could not be read. Retrying…",
			"activity.reconnecting": "Reconnecting to activity history…",
			"activity.retry": "Retry",
			"activity.detailTooLarge": "Content is too large to display in full. The audit summary cannot be used to compare complete files.",
			"activity.detailInvalid": "Complete details are corrupted and cannot be displayed. The audit summary cannot be used to compare complete files.",
			"activity.output.image": "This image cannot be previewed in this tool record. {metadata}",
			"activity.output.audio": "This audio cannot be played in this tool record. {metadata}",
			"activity.output.resource": "This tool record contains a resource reference that cannot be opened here. {metadata}",
			"activity.output.embeddedText": "Embedded text resource: {metadata}",
			"activity.output.binaryResource": "This binary resource cannot be previewed in this tool record. {metadata}",
			"activity.output.diff": "File difference: {path}",
			"activity.output.terminal": "Terminal reference that cannot be opened in this tool record: {id}",
			"activity.output.unknown": "This tool output type cannot be displayed: {type}",
			"activity.output.truncated": "Resource text is too long; the remaining content is omitted.",
			"activity.status.pending": "Pending",
			"activity.status.running": "Running",
			"activity.status.completed": "Completed",
			"activity.status.failed": "Failed",
			"activity.status.cancelled": "Cancelled",
			"activity.status.unfinished": "Tool did not report a result",
			"activity.control.waitTitle": "Wait for team reply",
			"activity.control.notExecuted": "Not executed",
			"activity.control.teamReplyQueued": "A team reply is queued. DSH will deliver it to the Agent after this response ends.",
			"activity.externalAgent": "External agent",
			"activity.externalAgentStatus.running": "Running",
			"activity.externalAgentStatus.completed": "Completed",
			"activity.externalAgentStatus.failed": "Failed",
			"activity.externalAgentStatus.cancelled": "Cancelled",
			"activity.externalAgentStatus.unfinished": "State unconfirmed",
			"activity.copy": "Copy",
			"activity.copied": "Copied",
			"activity.collapse": "Collapse",
			"activity.expandCount": "Expand {count} more lines",
			"activity.read.window": "Showing {shown} of {total} lines",
			"activity.terminal.signal": "signal {signal}",
			"activity.terminal.commandLine": "Command line {line}",
			"activity.terminal.exitCode": "exit code {code}",
			"activity.terminal.noExitCode": "No exit code",
			"activity.terminal.noOutput": "No output",
			"activity.terminal.outputNotProvided": "Output was not provided in this tool record.",
			"activity.terminal.collapseAria": "Collapse output",
			"activity.terminal.expandAria": "Expand the remaining {count} output lines",
			"activity.tool.plan": "Updated plan",
			"activity.kind.tool": "Tool call details",
			"activity.kind.plan": "Plan details",
			"activity.kind.terminal": "Terminal details",
			"activity.kind.diff": "File change details",
			"activity.kind.resource": "Resource details",
			"activity.kind.delegated": "Subagent details",
			"activity.kind.other": "Agent activity details",
			"subagent.task": "Delegated task",
			"subagent.result": "Final output",
			"subagent.summary": "Agent-reported summary",
			"subagent.readOnlyTitle": "External Agent record",
			"subagent.readOnlyBody": "This read-only record contains the task and result reported by the Agent, not its full internal history. Follow-up messages are unavailable.",
			"subagent.unavailable": "This information is unavailable.",
			"subagent.observedTiming": "Catalog duration is the delegation wall time observed by DSH, not model or Agent-reported time.",
			crossBackendTitle: "New session required",
			crossBackendDescription: "The current session will stay unchanged; the new backend will run in a new DSH session.",
			crossBackendCancel: "Cancel",
			crossBackendContinue: "Continue",
			crossBackendWorking: "Working…",
			crossBackendNoLocation: "No workspace or working directory is available for the new session.",
			crossBackendFailureRestore: "Could not restore the model used by the current session.",
			crossBackendFailureCreate: "Could not create the new session.",
			crossBackendFailureSelect: "Could not select a model for the new session.",
			crossBackendFailureOpen: "Could not open the new session.",
			crossBackendFailureUnknown: "The operation failed. Please retry.",
			crossBackendDiagnostics: "View technical details",
			crossBackendFromTo: "Switch from {source} to {target}.",
			crossBackendExistingHistory: "This session has conversation history but no recorded model to restore. Continuing runs the Agent in a new DSH session and keeps the original conversation. Cancel leaves this Agent selected in the current session; choose another model to continue that conversation."
		};
		//#endregion
		//#region node_modules/.pnpm/@deepseek-ai+dsh-typert-pro_2f8178087ff5b29d6de54290762a244a/node_modules/@deepseek-ai/dsh-typert-protocol/lib/types/remote-info.js
		/** Lazy assembly of generated Remote definitions using caller-supplied Zod; no runtime imports. */
		/**
		* Retain one generated definition per endpoint without constructing parsers or projections.
		* The class instance builds its shared descriptor/method index on first access;
		* input schemas and JSON Schema projections are cached only when requested.
		* @param spec - compiler-produced method facts and Zod factories.
		* @param zod - the generated artifact's Zod runtime for named-input parsers.
		* @returns a lazy, mountable info instance with no registration or transport effects.
		*/
		function createTypertRemoteInfo(spec, zod) {
			return new RemoteInfo(spec, zod);
		}
		var RemoteInfo = class {
			spec;
			zod;
			index;
			constructor(spec, zod) {
				this.spec = spec;
				this.zod = zod;
			}
			get package() {
				return this.spec.package;
			}
			get descriptors() {
				return this.resolve().descriptors;
			}
			get methods() {
				return this.resolve().methods;
			}
			resolve() {
				if (this.index !== void 0) return this.index;
				const zod = this.zod;
				const descriptors = [];
				const methods = Object.create(null);
				for (const [endpoint, definition] of Object.entries(this.spec.methods)) {
					const separator = endpoint.indexOf("/");
					const namespace = endpoint.slice(0, separator);
					const method = endpoint.slice(separator + 1);
					const parameters = definition.parameters.map((parameter) => ({
						...parameter,
						wire: parameter.wire ?? parameter.name
					}));
					const descriptor = {
						...definition,
						id: `${this.spec.package}#${endpoint}`,
						namespace,
						method,
						parameters,
						result: definition.result.description === void 0 ? definition.result : new ResultValue(definition.result)
					};
					if (definition.invocation.kind === "direct") {
						const inputs = [];
						methods[endpoint] = Object.assign(descriptor, {
							input(options) {
								const strict = options?.strict === true;
								return inputs[strict ? 1 : 0] ??= new NamedInput(parameters, strict, zod);
							},
							invoke(remote, input, signal) {
								const named = input;
								const values = parameters.map((parameter) => named[parameter.wire]);
								if (definition.cancellation !== void 0) values.push(signal);
								const receiver = Reflect.get(remote, namespace);
								return Reflect.get(receiver, method).apply(receiver, values);
							}
						});
					}
					descriptors.push(descriptor);
				}
				return this.index = {
					descriptors,
					methods
				};
			}
		};
		function optional(parameter) {
			return parameter.source === "json" && parameter.acceptsUndefined === true;
		}
		var NamedInput = class {
			parameters;
			strict;
			zod;
			schema;
			projection;
			constructor(parameters, strict, zod) {
				this.parameters = parameters;
				this.strict = strict;
				this.zod = zod;
			}
			codec(parameter) {
				return this.strict ? parameter.strictCodec : parameter.codec;
			}
			create = () => this.schema ??= this.zod.strictObject(Object.fromEntries(this.parameters.map((parameter) => {
				const value = this.codec(parameter).create();
				return [parameter.wire, optional(parameter) ? value.optional() : value.nonoptional()];
			})));
			get jsonSchema() {
				return this.project().jsonSchema;
			}
			get jsonSchemaError() {
				return this.project().jsonSchemaError;
			}
			project() {
				if (this.projection !== void 0) return this.projection;
				const unavailable = this.parameters.find((parameter) => this.codec(parameter).jsonSchema === void 0);
				if (unavailable !== void 0) return this.projection = { jsonSchemaError: this.codec(unavailable).jsonSchemaError ?? `No JSON Schema for parameter ${unavailable.wire}` };
				return this.projection = { jsonSchema: {
					type: "object",
					properties: Object.fromEntries(this.parameters.map((parameter) => [parameter.wire, {
						...this.codec(parameter).jsonSchema,
						...parameter.description === void 0 ? {} : { description: parameter.description }
					}])),
					required: this.parameters.filter((parameter) => !optional(parameter)).map((parameter) => parameter.wire),
					additionalProperties: false
				} };
			}
		};
		var ResultValue = class {
			spec;
			projection;
			constructor(spec) {
				this.spec = spec;
			}
			get mode() {
				return this.spec.mode;
			}
			get typeSymbol() {
				return this.spec.typeSymbol;
			}
			get create() {
				return this.spec.create;
			}
			get decode() {
				return this.spec.decode;
			}
			get encode() {
				return this.spec.encode;
			}
			get description() {
				return this.spec.description;
			}
			get jsonSchemaError() {
				return this.spec.jsonSchemaError;
			}
			get jsonSchema() {
				if (this.projection === void 0) {
					const schema = this.spec.jsonSchema;
					this.projection = { value: schema === void 0 ? void 0 : {
						...schema,
						description: this.spec.description
					} };
				}
				return this.projection.value;
			}
		};
		//#endregion
		//#region lib/typert.remote-client.js
		let _zaimokuza_dsh_acp_adapter_dshAcp_activityDetail_parameter_0$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_activityDetail_parameter_0$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_activityDetail_parameter_0$schema$value ??= zod.z.string();
		let _zaimokuza_dsh_acp_adapter_dshAcp_activityDetail_parameter_1$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_activityDetail_parameter_1$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_activityDetail_parameter_1$schema$value ??= zod.z.object({
			"activityId": zod.z.string().readonly(),
			"revisionSeq": zod.z.number().readonly(),
			"ownerDshSessionId": zod.z.string().readonly()
		});
		let _zaimokuza_dsh_acp_adapter_dshAcp_activityDetail_result$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_activityDetail_result$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_activityDetail_result$schema$value ??= zod.z.object({
			"detailDeferred": zod.z.boolean().readonly().optional().describe("Large detail is fetched on expansion, at this exact revision."),
			"detailPaths": zod.z.array(zod.z.string()).readonly().optional().describe("Small file metadata for a stable collapsed tool summary. No file contents."),
			"display": zod.z.object({
				"diffs": zod.z.union([zod.z.undefined(), zod.z.array(zod.z.object({
					"path": zod.z.string().readonly(),
					"oldText": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly(),
					"newText": zod.z.string().readonly()
				}))]).readonly().optional(),
				"plan": zod.z.union([zod.z.undefined(), zod.z.array(zod.z.object({
					"content": zod.z.string().readonly(),
					"status": zod.z.union([
						zod.z.literal("pending"),
						zod.z.literal("in_progress"),
						zod.z.literal("completed")
					]).readonly()
				}))]).readonly().optional(),
				"unavailable": zod.z.union([
					zod.z.undefined(),
					zod.z.literal("too-large"),
					zod.z.literal("invalid")
				]).readonly().optional()
			}).readonly().optional().describe("Complete, normalized display fields. Independent from bounded raw diagnostics."),
			"contentIndex": zod.z.number().readonly().optional(),
			"dshSessionId": zod.z.string().readonly(),
			"ownerDshSessionId": zod.z.string().readonly(),
			"promptAnchorMessageId": zod.z.string().readonly(),
			"activityId": zod.z.string().readonly(),
			"activitySeq": zod.z.number().readonly(),
			"revisionSeq": zod.z.number().readonly(),
			"time": zod.z.number().readonly(),
			"kind": zod.z.union([
				zod.z.literal("tool"),
				zod.z.literal("plan"),
				zod.z.literal("terminal"),
				zod.z.literal("diff"),
				zod.z.literal("resource"),
				zod.z.literal("delegated"),
				zod.z.literal("other")
			]).readonly(),
			"status": zod.z.union([
				zod.z.literal("completed"),
				zod.z.literal("running"),
				zod.z.literal("failed"),
				zod.z.literal("cancelled"),
				zod.z.literal("unfinished")
			]).readonly(),
			"presentation": zod.z.string().readonly(),
			"rawDetail": zod.z.string().readonly().optional(),
			"rawDetailRef": zod.z.string().readonly().optional()
		});
		let _zaimokuza_dsh_acp_adapter_dshAcp_activityFollow_parameter_0$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_activityFollow_parameter_0$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_activityFollow_parameter_0$schema$value ??= zod.z.string();
		let _zaimokuza_dsh_acp_adapter_dshAcp_activityFollow_parameter_1$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_activityFollow_parameter_1$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_activityFollow_parameter_1$schema$value ??= zod.z.union([zod.z.undefined(), zod.z.object({
			"limit": zod.z.number().readonly().optional(),
			"filter": zod.z.object({
				"ownerDshSessionId": zod.z.string().readonly().optional(),
				"promptAnchorMessageId": zod.z.string().readonly().optional()
			}).readonly().optional()
		})]);
		let _zaimokuza_dsh_acp_adapter_dshAcp_activityFollow_result$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_activityFollow_result$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_activityFollow_result$schema$value ??= zod.z.union([zod.z.object({
			"type": zod.z.literal("opened").readonly(),
			"cursor": zod.z.number().readonly(),
			"activities": zod.z.array(zod.z.object({
				"detailDeferred": zod.z.boolean().readonly().optional().describe("Large detail is fetched on expansion, at this exact revision."),
				"detailPaths": zod.z.array(zod.z.string()).readonly().optional().describe("Small file metadata for a stable collapsed tool summary. No file contents."),
				"display": zod.z.object({
					"diffs": zod.z.union([zod.z.undefined(), zod.z.array(zod.z.object({
						"path": zod.z.string().readonly(),
						"oldText": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly(),
						"newText": zod.z.string().readonly()
					}))]).readonly().optional(),
					"plan": zod.z.union([zod.z.undefined(), zod.z.array(zod.z.object({
						"content": zod.z.string().readonly(),
						"status": zod.z.union([
							zod.z.literal("pending"),
							zod.z.literal("in_progress"),
							zod.z.literal("completed")
						]).readonly()
					}))]).readonly().optional(),
					"unavailable": zod.z.union([
						zod.z.undefined(),
						zod.z.literal("too-large"),
						zod.z.literal("invalid")
					]).readonly().optional()
				}).readonly().optional().describe("Complete, normalized display fields. Independent from bounded raw diagnostics."),
				"contentIndex": zod.z.number().readonly().optional(),
				"dshSessionId": zod.z.string().readonly(),
				"ownerDshSessionId": zod.z.string().readonly(),
				"promptAnchorMessageId": zod.z.string().readonly(),
				"activityId": zod.z.string().readonly(),
				"activitySeq": zod.z.number().readonly(),
				"revisionSeq": zod.z.number().readonly(),
				"time": zod.z.number().readonly(),
				"kind": zod.z.union([
					zod.z.literal("tool"),
					zod.z.literal("plan"),
					zod.z.literal("terminal"),
					zod.z.literal("diff"),
					zod.z.literal("resource"),
					zod.z.literal("delegated"),
					zod.z.literal("other")
				]).readonly(),
				"status": zod.z.union([
					zod.z.literal("completed"),
					zod.z.literal("running"),
					zod.z.literal("failed"),
					zod.z.literal("cancelled"),
					zod.z.literal("unfinished")
				]).readonly(),
				"presentation": zod.z.string().readonly(),
				"rawDetail": zod.z.string().readonly().optional(),
				"rawDetailRef": zod.z.string().readonly().optional()
			})).readonly(),
			"head": zod.z.number().readonly()
		}), zod.z.object({
			"type": zod.z.literal("entry").readonly(),
			"activity": zod.z.object({
				"detailDeferred": zod.z.boolean().readonly().optional().describe("Large detail is fetched on expansion, at this exact revision."),
				"detailPaths": zod.z.array(zod.z.string()).readonly().optional().describe("Small file metadata for a stable collapsed tool summary. No file contents."),
				"display": zod.z.object({
					"diffs": zod.z.union([zod.z.undefined(), zod.z.array(zod.z.object({
						"path": zod.z.string().readonly(),
						"oldText": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly(),
						"newText": zod.z.string().readonly()
					}))]).readonly().optional(),
					"plan": zod.z.union([zod.z.undefined(), zod.z.array(zod.z.object({
						"content": zod.z.string().readonly(),
						"status": zod.z.union([
							zod.z.literal("pending"),
							zod.z.literal("in_progress"),
							zod.z.literal("completed")
						]).readonly()
					}))]).readonly().optional(),
					"unavailable": zod.z.union([
						zod.z.undefined(),
						zod.z.literal("too-large"),
						zod.z.literal("invalid")
					]).readonly().optional()
				}).readonly().optional().describe("Complete, normalized display fields. Independent from bounded raw diagnostics."),
				"contentIndex": zod.z.number().readonly().optional(),
				"dshSessionId": zod.z.string().readonly(),
				"ownerDshSessionId": zod.z.string().readonly(),
				"promptAnchorMessageId": zod.z.string().readonly(),
				"activityId": zod.z.string().readonly(),
				"activitySeq": zod.z.number().readonly(),
				"revisionSeq": zod.z.number().readonly(),
				"time": zod.z.number().readonly(),
				"kind": zod.z.union([
					zod.z.literal("tool"),
					zod.z.literal("plan"),
					zod.z.literal("terminal"),
					zod.z.literal("diff"),
					zod.z.literal("resource"),
					zod.z.literal("delegated"),
					zod.z.literal("other")
				]).readonly(),
				"status": zod.z.union([
					zod.z.literal("completed"),
					zod.z.literal("running"),
					zod.z.literal("failed"),
					zod.z.literal("cancelled"),
					zod.z.literal("unfinished")
				]).readonly(),
				"presentation": zod.z.string().readonly(),
				"rawDetail": zod.z.string().readonly().optional(),
				"rawDetailRef": zod.z.string().readonly().optional()
			}).readonly()
		})]);
		let _zaimokuza_dsh_acp_adapter_dshAcp_activityPage_parameter_0$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_activityPage_parameter_0$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_activityPage_parameter_0$schema$value ??= zod.z.string();
		let _zaimokuza_dsh_acp_adapter_dshAcp_activityPage_parameter_1$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_activityPage_parameter_1$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_activityPage_parameter_1$schema$value ??= zod.z.union([zod.z.undefined(), zod.z.object({
			"afterRevision": zod.z.number().readonly().optional(),
			"limit": zod.z.number().readonly().optional(),
			"filter": zod.z.object({
				"ownerDshSessionId": zod.z.string().readonly().optional(),
				"promptAnchorMessageId": zod.z.string().readonly().optional()
			}).readonly().optional(),
			"snapshotHead": zod.z.number().readonly().optional(),
			"captureSnapshot": zod.z.boolean().readonly().optional()
		})]);
		let _zaimokuza_dsh_acp_adapter_dshAcp_activityPage_result$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_activityPage_result$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_activityPage_result$schema$value ??= zod.z.object({
			"sessionId": zod.z.string().readonly(),
			"activities": zod.z.array(zod.z.object({
				"detailDeferred": zod.z.boolean().readonly().optional().describe("Large detail is fetched on expansion, at this exact revision."),
				"detailPaths": zod.z.array(zod.z.string()).readonly().optional().describe("Small file metadata for a stable collapsed tool summary. No file contents."),
				"display": zod.z.object({
					"diffs": zod.z.union([zod.z.undefined(), zod.z.array(zod.z.object({
						"path": zod.z.string().readonly(),
						"oldText": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly(),
						"newText": zod.z.string().readonly()
					}))]).readonly().optional(),
					"plan": zod.z.union([zod.z.undefined(), zod.z.array(zod.z.object({
						"content": zod.z.string().readonly(),
						"status": zod.z.union([
							zod.z.literal("pending"),
							zod.z.literal("in_progress"),
							zod.z.literal("completed")
						]).readonly()
					}))]).readonly().optional(),
					"unavailable": zod.z.union([
						zod.z.undefined(),
						zod.z.literal("too-large"),
						zod.z.literal("invalid")
					]).readonly().optional()
				}).readonly().optional().describe("Complete, normalized display fields. Independent from bounded raw diagnostics."),
				"contentIndex": zod.z.number().readonly().optional(),
				"dshSessionId": zod.z.string().readonly(),
				"ownerDshSessionId": zod.z.string().readonly(),
				"promptAnchorMessageId": zod.z.string().readonly(),
				"activityId": zod.z.string().readonly(),
				"activitySeq": zod.z.number().readonly(),
				"revisionSeq": zod.z.number().readonly(),
				"time": zod.z.number().readonly(),
				"kind": zod.z.union([
					zod.z.literal("tool"),
					zod.z.literal("plan"),
					zod.z.literal("terminal"),
					zod.z.literal("diff"),
					zod.z.literal("resource"),
					zod.z.literal("delegated"),
					zod.z.literal("other")
				]).readonly(),
				"status": zod.z.union([
					zod.z.literal("completed"),
					zod.z.literal("running"),
					zod.z.literal("failed"),
					zod.z.literal("cancelled"),
					zod.z.literal("unfinished")
				]).readonly(),
				"presentation": zod.z.string().readonly(),
				"rawDetail": zod.z.string().readonly().optional(),
				"rawDetailRef": zod.z.string().readonly().optional()
			})).readonly(),
			"head": zod.z.number().readonly(),
			"nextCursor": zod.z.union([zod.z.literal(null), zod.z.number()]).readonly(),
			"hasMore": zod.z.boolean().readonly()
		});
		let _zaimokuza_dsh_acp_adapter_dshAcp_activitySnapshot_parameter_0$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_activitySnapshot_parameter_0$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_activitySnapshot_parameter_0$schema$value ??= zod.z.string();
		let _zaimokuza_dsh_acp_adapter_dshAcp_activitySnapshot_parameter_1$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_activitySnapshot_parameter_1$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_activitySnapshot_parameter_1$schema$value ??= zod.z.union([zod.z.undefined(), zod.z.object({
			"limit": zod.z.number().readonly().optional(),
			"filter": zod.z.object({
				"ownerDshSessionId": zod.z.string().readonly().optional(),
				"promptAnchorMessageId": zod.z.string().readonly().optional()
			}).readonly().optional()
		})]);
		let _zaimokuza_dsh_acp_adapter_dshAcp_activitySnapshot_result$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_activitySnapshot_result$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_activitySnapshot_result$schema$value ??= zod.z.object({
			"sessionId": zod.z.string().readonly(),
			"activities": zod.z.array(zod.z.object({
				"detailDeferred": zod.z.boolean().readonly().optional().describe("Large detail is fetched on expansion, at this exact revision."),
				"detailPaths": zod.z.array(zod.z.string()).readonly().optional().describe("Small file metadata for a stable collapsed tool summary. No file contents."),
				"display": zod.z.object({
					"diffs": zod.z.union([zod.z.undefined(), zod.z.array(zod.z.object({
						"path": zod.z.string().readonly(),
						"oldText": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly(),
						"newText": zod.z.string().readonly()
					}))]).readonly().optional(),
					"plan": zod.z.union([zod.z.undefined(), zod.z.array(zod.z.object({
						"content": zod.z.string().readonly(),
						"status": zod.z.union([
							zod.z.literal("pending"),
							zod.z.literal("in_progress"),
							zod.z.literal("completed")
						]).readonly()
					}))]).readonly().optional(),
					"unavailable": zod.z.union([
						zod.z.undefined(),
						zod.z.literal("too-large"),
						zod.z.literal("invalid")
					]).readonly().optional()
				}).readonly().optional().describe("Complete, normalized display fields. Independent from bounded raw diagnostics."),
				"contentIndex": zod.z.number().readonly().optional(),
				"dshSessionId": zod.z.string().readonly(),
				"ownerDshSessionId": zod.z.string().readonly(),
				"promptAnchorMessageId": zod.z.string().readonly(),
				"activityId": zod.z.string().readonly(),
				"activitySeq": zod.z.number().readonly(),
				"revisionSeq": zod.z.number().readonly(),
				"time": zod.z.number().readonly(),
				"kind": zod.z.union([
					zod.z.literal("tool"),
					zod.z.literal("plan"),
					zod.z.literal("terminal"),
					zod.z.literal("diff"),
					zod.z.literal("resource"),
					zod.z.literal("delegated"),
					zod.z.literal("other")
				]).readonly(),
				"status": zod.z.union([
					zod.z.literal("completed"),
					zod.z.literal("running"),
					zod.z.literal("failed"),
					zod.z.literal("cancelled"),
					zod.z.literal("unfinished")
				]).readonly(),
				"presentation": zod.z.string().readonly(),
				"rawDetail": zod.z.string().readonly().optional(),
				"rawDetailRef": zod.z.string().readonly().optional()
			})).readonly(),
			"head": zod.z.number().readonly()
		});
		let _zaimokuza_dsh_acp_adapter_dshAcp_agentSessionFollow_parameter_0$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_agentSessionFollow_parameter_0$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_agentSessionFollow_parameter_0$schema$value ??= zod.z.string();
		let _zaimokuza_dsh_acp_adapter_dshAcp_agentSessionFollow_result$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_agentSessionFollow_result$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_agentSessionFollow_result$schema$value ??= zod.z.union([zod.z.object({
			"type": zod.z.literal("opened").readonly(),
			"snapshot": zod.z.union([zod.z.literal(null), zod.z.object({
				"sessionId": zod.z.string().readonly(),
				"profileId": zod.z.string().readonly(),
				"modeWritable": zod.z.boolean().readonly().optional(),
				"pendingModeId": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly().optional(),
				"freshness": zod.z.union([zod.z.literal("live"), zod.z.literal("stale")]).readonly(),
				"editable": zod.z.boolean().readonly(),
				"configOptions": zod.z.union([zod.z.literal(null), zod.z.array(zod.z.union([zod.z.object({
					"type": zod.z.literal("select").readonly(),
					"id": zod.z.string().readonly(),
					"name": zod.z.string().readonly(),
					"description": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly().optional(),
					"category": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly().optional(),
					"currentValue": zod.z.string().readonly(),
					"options": zod.z.array(zod.z.union([zod.z.object({
						"value": zod.z.string().readonly(),
						"name": zod.z.string().readonly(),
						"description": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly().optional()
					}), zod.z.object({
						"group": zod.z.string().readonly(),
						"name": zod.z.string().readonly(),
						"options": zod.z.array(zod.z.object({
							"value": zod.z.string().readonly(),
							"name": zod.z.string().readonly(),
							"description": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly().optional()
						})).readonly()
					})])).readonly()
				}), zod.z.object({
					"type": zod.z.literal("boolean").readonly(),
					"id": zod.z.string().readonly(),
					"name": zod.z.string().readonly(),
					"description": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly().optional(),
					"category": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly().optional(),
					"currentValue": zod.z.boolean().readonly()
				})]))]).readonly(),
				"modes": zod.z.union([zod.z.literal(null), zod.z.array(zod.z.object({
					"id": zod.z.string().readonly(),
					"name": zod.z.string().readonly(),
					"description": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly().optional()
				}))]).readonly(),
				"currentModeId": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly(),
				"contextUsage": zod.z.union([zod.z.literal(null), zod.z.object({
					"used": zod.z.number().readonly(),
					"size": zod.z.number().readonly(),
					"percent": zod.z.number().readonly(),
					"cost": zod.z.union([zod.z.literal(null), zod.z.object({
						"amount": zod.z.number().readonly(),
						"currency": zod.z.string().readonly()
					})]).readonly().describe("agent 明确提供的累计成本；未提供为 null。")
				})]).readonly(),
				"note": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly()
			})]).readonly()
		}), zod.z.object({
			"type": zod.z.literal("changed").readonly(),
			"snapshot": zod.z.union([zod.z.literal(null), zod.z.object({
				"sessionId": zod.z.string().readonly(),
				"profileId": zod.z.string().readonly(),
				"modeWritable": zod.z.boolean().readonly().optional(),
				"pendingModeId": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly().optional(),
				"freshness": zod.z.union([zod.z.literal("live"), zod.z.literal("stale")]).readonly(),
				"editable": zod.z.boolean().readonly(),
				"configOptions": zod.z.union([zod.z.literal(null), zod.z.array(zod.z.union([zod.z.object({
					"type": zod.z.literal("select").readonly(),
					"id": zod.z.string().readonly(),
					"name": zod.z.string().readonly(),
					"description": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly().optional(),
					"category": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly().optional(),
					"currentValue": zod.z.string().readonly(),
					"options": zod.z.array(zod.z.union([zod.z.object({
						"value": zod.z.string().readonly(),
						"name": zod.z.string().readonly(),
						"description": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly().optional()
					}), zod.z.object({
						"group": zod.z.string().readonly(),
						"name": zod.z.string().readonly(),
						"options": zod.z.array(zod.z.object({
							"value": zod.z.string().readonly(),
							"name": zod.z.string().readonly(),
							"description": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly().optional()
						})).readonly()
					})])).readonly()
				}), zod.z.object({
					"type": zod.z.literal("boolean").readonly(),
					"id": zod.z.string().readonly(),
					"name": zod.z.string().readonly(),
					"description": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly().optional(),
					"category": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly().optional(),
					"currentValue": zod.z.boolean().readonly()
				})]))]).readonly(),
				"modes": zod.z.union([zod.z.literal(null), zod.z.array(zod.z.object({
					"id": zod.z.string().readonly(),
					"name": zod.z.string().readonly(),
					"description": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly().optional()
				}))]).readonly(),
				"currentModeId": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly(),
				"contextUsage": zod.z.union([zod.z.literal(null), zod.z.object({
					"used": zod.z.number().readonly(),
					"size": zod.z.number().readonly(),
					"percent": zod.z.number().readonly(),
					"cost": zod.z.union([zod.z.literal(null), zod.z.object({
						"amount": zod.z.number().readonly(),
						"currency": zod.z.string().readonly()
					})]).readonly().describe("agent 明确提供的累计成本；未提供为 null。")
				})]).readonly(),
				"note": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly()
			})]).readonly()
		})]);
		let _zaimokuza_dsh_acp_adapter_dshAcp_agentSessionSnapshot_parameter_0$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_agentSessionSnapshot_parameter_0$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_agentSessionSnapshot_parameter_0$schema$value ??= zod.z.string();
		let _zaimokuza_dsh_acp_adapter_dshAcp_agentSessionSnapshot_result$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_agentSessionSnapshot_result$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_agentSessionSnapshot_result$schema$value ??= zod.z.object({
			"sessionId": zod.z.string().readonly(),
			"profileId": zod.z.string().readonly(),
			"modeWritable": zod.z.boolean().readonly().optional(),
			"pendingModeId": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly().optional(),
			"freshness": zod.z.union([zod.z.literal("live"), zod.z.literal("stale")]).readonly(),
			"editable": zod.z.boolean().readonly(),
			"configOptions": zod.z.union([zod.z.literal(null), zod.z.array(zod.z.union([zod.z.object({
				"type": zod.z.literal("select").readonly(),
				"id": zod.z.string().readonly(),
				"name": zod.z.string().readonly(),
				"description": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly().optional(),
				"category": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly().optional(),
				"currentValue": zod.z.string().readonly(),
				"options": zod.z.array(zod.z.union([zod.z.object({
					"value": zod.z.string().readonly(),
					"name": zod.z.string().readonly(),
					"description": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly().optional()
				}), zod.z.object({
					"group": zod.z.string().readonly(),
					"name": zod.z.string().readonly(),
					"options": zod.z.array(zod.z.object({
						"value": zod.z.string().readonly(),
						"name": zod.z.string().readonly(),
						"description": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly().optional()
					})).readonly()
				})])).readonly()
			}), zod.z.object({
				"type": zod.z.literal("boolean").readonly(),
				"id": zod.z.string().readonly(),
				"name": zod.z.string().readonly(),
				"description": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly().optional(),
				"category": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly().optional(),
				"currentValue": zod.z.boolean().readonly()
			})]))]).readonly(),
			"modes": zod.z.union([zod.z.literal(null), zod.z.array(zod.z.object({
				"id": zod.z.string().readonly(),
				"name": zod.z.string().readonly(),
				"description": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly().optional()
			}))]).readonly(),
			"currentModeId": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly(),
			"contextUsage": zod.z.union([zod.z.literal(null), zod.z.object({
				"used": zod.z.number().readonly(),
				"size": zod.z.number().readonly(),
				"percent": zod.z.number().readonly(),
				"cost": zod.z.union([zod.z.literal(null), zod.z.object({
					"amount": zod.z.number().readonly(),
					"currency": zod.z.string().readonly()
				})]).readonly().describe("agent 明确提供的累计成本；未提供为 null。")
			})]).readonly(),
			"note": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly()
		});
		let _zaimokuza_dsh_acp_adapter_dshAcp_approvalChildren_parameter_0$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_approvalChildren_parameter_0$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_approvalChildren_parameter_0$schema$value ??= zod.z.string();
		let _zaimokuza_dsh_acp_adapter_dshAcp_approvalChildren_result$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_approvalChildren_result$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_approvalChildren_result$schema$value ??= zod.z.array(zod.z.object({
			"sessionId": zod.z.string().readonly(),
			"parentSessionId": zod.z.string().readonly(),
			"name": zod.z.string().readonly(),
			"mode": zod.z.union([zod.z.literal("continuable"), zod.z.literal("one-shot")]).readonly(),
			"path": zod.z.array(zod.z.object({
				"sessionId": zod.z.string().readonly(),
				"name": zod.z.string().readonly()
			})).readonly().describe("Direct-child to descendant path; never includes unrelated or inherited history.")
		}));
		let _zaimokuza_dsh_acp_adapter_dshAcp_auditTimeline_parameter_0$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_auditTimeline_parameter_0$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_auditTimeline_parameter_0$schema$value ??= zod.z.string();
		let _zaimokuza_dsh_acp_adapter_dshAcp_auditTimeline_parameter_1$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_auditTimeline_parameter_1$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_auditTimeline_parameter_1$schema$value ??= zod.z.union([zod.z.undefined(), zod.z.object({
			"afterSeq": zod.z.number().readonly().optional(),
			"limit": zod.z.number().readonly().optional(),
			"view": zod.z.union([
				zod.z.literal("issues"),
				zod.z.literal("operations"),
				zod.z.literal("technical")
			]).readonly().optional(),
			"captureSnapshot": zod.z.boolean().readonly().optional(),
			"snapshotHead": zod.z.number().readonly().optional()
		})]);
		let _zaimokuza_dsh_acp_adapter_dshAcp_auditTimeline_result$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_auditTimeline_result$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_auditTimeline_result$schema$value ??= zod.z.object({
			"sessionId": zod.z.string().readonly(),
			"entries": zod.z.array(zod.z.object({
				"seq": zod.z.number().readonly(),
				"time": zod.z.number().readonly(),
				"kind": zod.z.string().readonly(),
				"severity": zod.z.union([
					zod.z.literal("info"),
					zod.z.literal("warning"),
					zod.z.literal("error")
				]).readonly(),
				"category": zod.z.union([
					zod.z.literal("recovery"),
					zod.z.literal("permission"),
					zod.z.literal("agent"),
					zod.z.literal("files")
				]).readonly(),
				"summaryCode": zod.z.union([
					zod.z.literal("binding.established"),
					zod.z.literal("permission.asked"),
					zod.z.literal("permission.bridge"),
					zod.z.literal("permission.decided"),
					zod.z.literal("reconciliation.required"),
					zod.z.literal("replay.matched"),
					zod.z.literal("replay.different"),
					zod.z.literal("replay.overflow"),
					zod.z.literal("replay.not-compared"),
					zod.z.literal("restore.reused"),
					zod.z.literal("restore.resumed"),
					zod.z.literal("restore.loaded"),
					zod.z.literal("replay.unavailable"),
					zod.z.literal("degradation.recorded"),
					zod.z.literal("filesystem.operation"),
					zod.z.literal("filesystem.read"),
					zod.z.literal("filesystem.write"),
					zod.z.literal("terminal.operation"),
					zod.z.literal("session-fork.completed"),
					zod.z.literal("agent.event")
				]).readonly(),
				"subject": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly(),
				"status": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly(),
				"detail": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly()
			})).readonly(),
			"snapshotHead": zod.z.union([zod.z.literal(null), zod.z.number()]).readonly().describe("Fixed durable high-water mark used by every page in one export."),
			"scannedThrough": zod.z.number().readonly().describe("Last physical sidecar sequence inspected. May advance over malformed rows."),
			"scannedRecords": zod.z.union([zod.z.literal(null), zod.z.number()]).readonly().describe("Physical rows examined by a snapshot scan; unavailable on ordinary live pages."),
			"unreadableRecords": zod.z.number().readonly().describe("Malformed stored rows skipped during this page; only known for snapshot scans."),
			"nextCursor": zod.z.union([zod.z.literal(null), zod.z.number()]).readonly(),
			"hasMore": zod.z.boolean().readonly()
		});
		let _zaimokuza_dsh_acp_adapter_dshAcp_backendOf_parameter_0$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_backendOf_parameter_0$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_backendOf_parameter_0$schema$value ??= zod.z.string();
		let _zaimokuza_dsh_acp_adapter_dshAcp_backendOf_result$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_backendOf_result$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_backendOf_result$schema$value ??= zod.z.union([
			zod.z.object({ "state": zod.z.literal("blank").readonly() }),
			zod.z.object({
				"state": zod.z.literal("draft").readonly(),
				"provider": zod.z.string().readonly(),
				"model": zod.z.string().readonly().optional()
			}),
			zod.z.object({
				"state": zod.z.literal("established").readonly(),
				"provider": zod.z.string().readonly()
			})
		]);
		let _zaimokuza_dsh_acp_adapter_dshAcp_boundSessions_parameter_0$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_boundSessions_parameter_0$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_boundSessions_parameter_0$schema$value ??= zod.z.string();
		let _zaimokuza_dsh_acp_adapter_dshAcp_boundSessions_result$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_boundSessions_result$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_boundSessions_result$schema$value ??= zod.z.object({
			"agentId": zod.z.string().readonly(),
			"count": zod.z.number().readonly()
		});
		let _zaimokuza_dsh_acp_adapter_dshAcp_health_parameter_0$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_health_parameter_0$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_health_parameter_0$schema$value ??= zod.z.union([zod.z.undefined(), zod.z.object({
			"recheck": zod.z.boolean().readonly().optional(),
			"agentId": zod.z.string().readonly().optional()
		})]);
		let _zaimokuza_dsh_acp_adapter_dshAcp_health_result$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_health_result$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_health_result$schema$value ??= zod.z.object({
			"providers": zod.z.array(zod.z.object({
				"id": zod.z.string().readonly(),
				"name": zod.z.string().readonly(),
				"command": zod.z.string().readonly(),
				"args": zod.z.array(zod.z.string()).readonly(),
				"loginHint": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly().describe("Panel login guidance；provider 配置未带时为 null。"),
				"executable": zod.z.boolean().readonly().describe("`command -v` 等价物：PATH（或路径直给）上存在可执行文件。"),
				"version": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly().describe("`<command> --version` 首行（尽力而为）；超时/失败/跳过时为 null。"),
				"state": zod.z.union([
					zod.z.literal("saved-unverified"),
					zod.z.literal("ready"),
					zod.z.literal("auth-required"),
					zod.z.literal("unavailable"),
					zod.z.literal("incompatible")
				]).readonly().describe("五态状态（派生规则见 src/domain/session/agent-state.ts）。"),
				"probe": zod.z.union([
					zod.z.object({
						"status": zod.z.literal("never").readonly(),
						"at": zod.z.literal(null).readonly()
					}),
					zod.z.object({
						"status": zod.z.literal("ok").readonly(),
						"at": zod.z.number().readonly(),
						"modelCount": zod.z.number().readonly(),
						"authMethods": zod.z.union([zod.z.literal(null), zod.z.array(zod.z.object({
							"id": zod.z.string().readonly(),
							"name": zod.z.string().readonly(),
							"description": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly().optional()
						}))]).readonly(),
						"agentInfo": zod.z.union([zod.z.literal(null), zod.z.object({
							"name": zod.z.string().readonly(),
							"version": zod.z.string().readonly()
						})]).readonly(),
						"capabilities": zod.z.union([zod.z.literal(null), zod.z.object({
							"loadSession": zod.z.boolean().readonly().describe("`session/load`（重启后恢复 ACP 上下文的前提）。"),
							"sessionList": zod.z.boolean().readonly().describe("`session/list`（恢复前查重/列会话）。"),
							"sessionClose": zod.z.boolean().readonly().describe("`session/close`（probe/会话清理的「释放资源」步）。"),
							"sessionDelete": zod.z.boolean().readonly().describe("`session/delete`（probe/会话清理的「移出 session/list」步）。"),
							"promptImage": zod.z.boolean().readonly().describe("prompt 可携带图片。"),
							"promptAudio": zod.z.boolean().readonly().describe("prompt 可携带音频。"),
							"promptEmbeddedContext": zod.z.boolean().readonly().describe("prompt 可携带嵌入上下文（Resource 块）。"),
							"mcpHttp": zod.z.boolean().readonly().describe("MCP over HTTP。"),
							"mcpSse": zod.z.boolean().readonly().describe("MCP over SSE。")
						})]).readonly(),
						"cleanup": zod.z.union([zod.z.literal(null), zod.z.object({
							"close": zod.z.union([
								zod.z.literal("failed"),
								zod.z.literal("done"),
								zod.z.literal("not-advertised")
							]).readonly(),
							"delete": zod.z.union([
								zod.z.literal("failed"),
								zod.z.literal("done"),
								zod.z.literal("not-advertised")
							]).readonly(),
							"message": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly()
						})]).readonly(),
						"capabilityHash": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly(),
						"protocolVersion": zod.z.union([zod.z.literal(null), zod.z.number()]).readonly().describe("readiness：initialize 协商的 ACP 协议版本（probe 缓存条目早于 本特性/握手未给出时归 null，不编造）。"),
						"versionCompatibility": zod.z.union([
							zod.z.literal(null),
							zod.z.literal("current"),
							zod.z.literal("different"),
							zod.z.literal("unknown")
						]).readonly().describe("兼容状态（agent-config.ts `acpVersionCompatibility` 直通，比对握手 agentInfo.version 与 registry 快照的上游版本）：无版本参考或握手无 版本 → null；快照无该 agent 版本 → 'unknown'；握手版本等于参考 → 'current'；不等 → 'different'（不阻断，仅如实展示）。"),
						"matrix": zod.z.array(zod.z.object({
							"id": zod.z.string().readonly(),
							"advertised": zod.z.union([
								zod.z.literal(null),
								zod.z.literal(false),
								zod.z.literal(true)
							]).readonly(),
							"adapterPath": zod.z.string().readonly(),
							"hostSeam": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly(),
							"status": zod.z.union([
								zod.z.literal("supported"),
								zod.z.literal("degraded"),
								zod.z.literal("unsupported")
							]).readonly(),
							"note": zod.z.string().readonly().optional()
						})).readonly().describe("端到端能力矩阵：host 侧由 capabilities（广告事实） × adapter path 计算（src/domain/policy/ capability-matrix.ts）；capabilities 为 null 时矩阵照常下发（广告列 全 null）。UI 只许展示本矩阵的交集结论，不再直译广告布尔。")
					}),
					zod.z.object({
						"status": zod.z.literal("error").readonly(),
						"at": zod.z.number().readonly(),
						"failureKind": zod.z.string().readonly(),
						"message": zod.z.string().readonly(),
						"phase": zod.z.union([
							zod.z.literal(null),
							zod.z.literal("initialize"),
							zod.z.literal("session")
						]).readonly()
					})
				]).readonly().describe("上次 probe 快照（llm-stub 缓存；首次目录构建前为 'never'）。成功分支携带 authMethods（收窄后）、agentInfo/capabilities（initialize 握手实际值）、 cleanup（清理事实）与 capabilityHash（握手能力的 sha256-16， 缺失归 null——条目早于本特性时如实为空，不编造）；失败分支携带 phase （probe 失败阶段；未标记归 null）。")
			})).readonly(),
			"liveSessions": zod.z.union([zod.z.literal(null), zod.z.array(zod.z.object({
				"sessionId": zod.z.string().readonly(),
				"continuity": zod.z.object({
					"status": zod.z.union([zod.z.literal("ok"), zod.z.literal("blocked")]).readonly(),
					"cause": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly(),
					"detail": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly()
				}).readonly()
			}))]).readonly().describe("活体 ACP 会话的连续性清单（未接线/无活体会话归 null 或空数组，如实区分）。")
		});
		let _zaimokuza_dsh_acp_adapter_dshAcp_ownedProviderRoutes_result$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_ownedProviderRoutes_result$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_ownedProviderRoutes_result$schema$value ??= zod.z.object({ "providers": zod.z.array(zod.z.string()).readonly() });
		let _zaimokuza_dsh_acp_adapter_dshAcp_projectedSubagentIds_result$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_projectedSubagentIds_result$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_projectedSubagentIds_result$schema$value ??= zod.z.object({ "sessionIds": zod.z.array(zod.z.string()).readonly() });
		let _zaimokuza_dsh_acp_adapter_dshAcp_rebindRecoveryBlank_parameter_0$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_rebindRecoveryBlank_parameter_0$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_rebindRecoveryBlank_parameter_0$schema$value ??= zod.z.string();
		let _zaimokuza_dsh_acp_adapter_dshAcp_rebindRecoveryBlank_result$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_rebindRecoveryBlank_result$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_rebindRecoveryBlank_result$schema$value ??= zod.z.object({
			"dshSessionId": zod.z.string().readonly(),
			"kind": zod.z.union([
				zod.z.literal("healthy"),
				zod.z.literal("reconnect-required"),
				zod.z.literal("outcome-unknown"),
				zod.z.literal("reconciliation-required"),
				zod.z.literal("session-lost"),
				zod.z.literal("local-history-damaged"),
				zod.z.literal("resumed-unverified")
			]).readonly(),
			"localStatus": zod.z.union([
				zod.z.literal("finishing-tools"),
				zod.z.literal("saving-results"),
				zod.z.literal("storage-error")
			]).readonly().optional().describe("Volatile local settlement progress; omitted for stable recovery states."),
			"cause": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly(),
			"detail": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly(),
			"provider": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly(),
			"acpSessionId": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly(),
			"generation": zod.z.union([zod.z.literal(null), zod.z.number()]).readonly(),
			"interruptedTurnId": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly(),
			"lastAttemptAt": zod.z.union([zod.z.literal(null), zod.z.number()]).readonly(),
			"lastUserAction": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly(),
			"updatedAt": zod.z.number().readonly()
		});
		let _zaimokuza_dsh_acp_adapter_dshAcp_recoveryFollow_parameter_0$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_recoveryFollow_parameter_0$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_recoveryFollow_parameter_0$schema$value ??= zod.z.string();
		let _zaimokuza_dsh_acp_adapter_dshAcp_recoveryFollow_result$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_recoveryFollow_result$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_recoveryFollow_result$schema$value ??= zod.z.union([zod.z.object({
			"type": zod.z.literal("opened").readonly(),
			"snapshot": zod.z.object({
				"dshSessionId": zod.z.string().readonly(),
				"kind": zod.z.union([
					zod.z.literal("healthy"),
					zod.z.literal("reconnect-required"),
					zod.z.literal("outcome-unknown"),
					zod.z.literal("reconciliation-required"),
					zod.z.literal("session-lost"),
					zod.z.literal("local-history-damaged"),
					zod.z.literal("resumed-unverified")
				]).readonly(),
				"localStatus": zod.z.union([
					zod.z.literal("finishing-tools"),
					zod.z.literal("saving-results"),
					zod.z.literal("storage-error")
				]).readonly().optional().describe("Volatile local settlement progress; omitted for stable recovery states."),
				"cause": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly(),
				"detail": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly(),
				"provider": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly(),
				"acpSessionId": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly(),
				"generation": zod.z.union([zod.z.literal(null), zod.z.number()]).readonly(),
				"interruptedTurnId": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly(),
				"lastAttemptAt": zod.z.union([zod.z.literal(null), zod.z.number()]).readonly(),
				"lastUserAction": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly(),
				"updatedAt": zod.z.number().readonly()
			}).readonly()
		}), zod.z.object({
			"type": zod.z.literal("changed").readonly(),
			"snapshot": zod.z.object({
				"dshSessionId": zod.z.string().readonly(),
				"kind": zod.z.union([
					zod.z.literal("healthy"),
					zod.z.literal("reconnect-required"),
					zod.z.literal("outcome-unknown"),
					zod.z.literal("reconciliation-required"),
					zod.z.literal("session-lost"),
					zod.z.literal("local-history-damaged"),
					zod.z.literal("resumed-unverified")
				]).readonly(),
				"localStatus": zod.z.union([
					zod.z.literal("finishing-tools"),
					zod.z.literal("saving-results"),
					zod.z.literal("storage-error")
				]).readonly().optional().describe("Volatile local settlement progress; omitted for stable recovery states."),
				"cause": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly(),
				"detail": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly(),
				"provider": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly(),
				"acpSessionId": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly(),
				"generation": zod.z.union([zod.z.literal(null), zod.z.number()]).readonly(),
				"interruptedTurnId": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly(),
				"lastAttemptAt": zod.z.union([zod.z.literal(null), zod.z.number()]).readonly(),
				"lastUserAction": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly(),
				"updatedAt": zod.z.number().readonly()
			}).readonly()
		})]);
		let _zaimokuza_dsh_acp_adapter_dshAcp_recoverySnapshot_parameter_0$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_recoverySnapshot_parameter_0$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_recoverySnapshot_parameter_0$schema$value ??= zod.z.string();
		let _zaimokuza_dsh_acp_adapter_dshAcp_recoverySnapshot_result$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_recoverySnapshot_result$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_recoverySnapshot_result$schema$value ??= zod.z.object({
			"dshSessionId": zod.z.string().readonly(),
			"kind": zod.z.union([
				zod.z.literal("healthy"),
				zod.z.literal("reconnect-required"),
				zod.z.literal("outcome-unknown"),
				zod.z.literal("reconciliation-required"),
				zod.z.literal("session-lost"),
				zod.z.literal("local-history-damaged"),
				zod.z.literal("resumed-unverified")
			]).readonly(),
			"localStatus": zod.z.union([
				zod.z.literal("finishing-tools"),
				zod.z.literal("saving-results"),
				zod.z.literal("storage-error")
			]).readonly().optional().describe("Volatile local settlement progress; omitted for stable recovery states."),
			"cause": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly(),
			"detail": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly(),
			"provider": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly(),
			"acpSessionId": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly(),
			"generation": zod.z.union([zod.z.literal(null), zod.z.number()]).readonly(),
			"interruptedTurnId": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly(),
			"lastAttemptAt": zod.z.union([zod.z.literal(null), zod.z.number()]).readonly(),
			"lastUserAction": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly(),
			"updatedAt": zod.z.number().readonly()
		});
		let _zaimokuza_dsh_acp_adapter_dshAcp_retryOriginal_parameter_0$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_retryOriginal_parameter_0$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_retryOriginal_parameter_0$schema$value ??= zod.z.string();
		let _zaimokuza_dsh_acp_adapter_dshAcp_retryOriginal_result$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_retryOriginal_result$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_retryOriginal_result$schema$value ??= zod.z.object({
			"dshSessionId": zod.z.string().readonly(),
			"kind": zod.z.union([
				zod.z.literal("healthy"),
				zod.z.literal("reconnect-required"),
				zod.z.literal("outcome-unknown"),
				zod.z.literal("reconciliation-required"),
				zod.z.literal("session-lost"),
				zod.z.literal("local-history-damaged"),
				zod.z.literal("resumed-unverified")
			]).readonly(),
			"localStatus": zod.z.union([
				zod.z.literal("finishing-tools"),
				zod.z.literal("saving-results"),
				zod.z.literal("storage-error")
			]).readonly().optional().describe("Volatile local settlement progress; omitted for stable recovery states."),
			"cause": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly(),
			"detail": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly(),
			"provider": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly(),
			"acpSessionId": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly(),
			"generation": zod.z.union([zod.z.literal(null), zod.z.number()]).readonly(),
			"interruptedTurnId": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly(),
			"lastAttemptAt": zod.z.union([zod.z.literal(null), zod.z.number()]).readonly(),
			"lastUserAction": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly(),
			"updatedAt": zod.z.number().readonly()
		});
		let _zaimokuza_dsh_acp_adapter_dshAcp_setAgentSessionOption_parameter_0$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_setAgentSessionOption_parameter_0$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_setAgentSessionOption_parameter_0$schema$value ??= zod.z.string();
		let _zaimokuza_dsh_acp_adapter_dshAcp_setAgentSessionOption_parameter_1$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_setAgentSessionOption_parameter_1$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_setAgentSessionOption_parameter_1$schema$value ??= zod.z.union([zod.z.object({
			"kind": zod.z.literal("config").readonly(),
			"id": zod.z.string().readonly(),
			"value": zod.z.union([
				zod.z.string(),
				zod.z.literal(false),
				zod.z.literal(true)
			]).readonly()
		}), zod.z.object({
			"kind": zod.z.literal("mode").readonly(),
			"id": zod.z.string().readonly()
		})]);
		let _zaimokuza_dsh_acp_adapter_dshAcp_setAgentSessionOption_result$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_setAgentSessionOption_result$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_setAgentSessionOption_result$schema$value ??= zod.z.object({
			"sessionId": zod.z.string().readonly(),
			"profileId": zod.z.string().readonly(),
			"modeWritable": zod.z.boolean().readonly().optional(),
			"pendingModeId": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly().optional(),
			"freshness": zod.z.union([zod.z.literal("live"), zod.z.literal("stale")]).readonly(),
			"editable": zod.z.boolean().readonly(),
			"configOptions": zod.z.union([zod.z.literal(null), zod.z.array(zod.z.union([zod.z.object({
				"type": zod.z.literal("select").readonly(),
				"id": zod.z.string().readonly(),
				"name": zod.z.string().readonly(),
				"description": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly().optional(),
				"category": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly().optional(),
				"currentValue": zod.z.string().readonly(),
				"options": zod.z.array(zod.z.union([zod.z.object({
					"value": zod.z.string().readonly(),
					"name": zod.z.string().readonly(),
					"description": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly().optional()
				}), zod.z.object({
					"group": zod.z.string().readonly(),
					"name": zod.z.string().readonly(),
					"options": zod.z.array(zod.z.object({
						"value": zod.z.string().readonly(),
						"name": zod.z.string().readonly(),
						"description": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly().optional()
					})).readonly()
				})])).readonly()
			}), zod.z.object({
				"type": zod.z.literal("boolean").readonly(),
				"id": zod.z.string().readonly(),
				"name": zod.z.string().readonly(),
				"description": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly().optional(),
				"category": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly().optional(),
				"currentValue": zod.z.boolean().readonly()
			})]))]).readonly(),
			"modes": zod.z.union([zod.z.literal(null), zod.z.array(zod.z.object({
				"id": zod.z.string().readonly(),
				"name": zod.z.string().readonly(),
				"description": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly().optional()
			}))]).readonly(),
			"currentModeId": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly(),
			"contextUsage": zod.z.union([zod.z.literal(null), zod.z.object({
				"used": zod.z.number().readonly(),
				"size": zod.z.number().readonly(),
				"percent": zod.z.number().readonly(),
				"cost": zod.z.union([zod.z.literal(null), zod.z.object({
					"amount": zod.z.number().readonly(),
					"currency": zod.z.string().readonly()
				})]).readonly().describe("agent 明确提供的累计成本；未提供为 null。")
			})]).readonly(),
			"note": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly()
		});
		let _zaimokuza_dsh_acp_adapter_dshAcp_setTeamMemberMode_parameter_0$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_setTeamMemberMode_parameter_0$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_setTeamMemberMode_parameter_0$schema$value ??= zod.z.string();
		let _zaimokuza_dsh_acp_adapter_dshAcp_setTeamMemberMode_parameter_1$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_setTeamMemberMode_parameter_1$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_setTeamMemberMode_parameter_1$schema$value ??= zod.z.string();
		let _zaimokuza_dsh_acp_adapter_dshAcp_setTeamMemberMode_parameter_2$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_setTeamMemberMode_parameter_2$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_setTeamMemberMode_parameter_2$schema$value ??= zod.z.string();
		let _zaimokuza_dsh_acp_adapter_dshAcp_setTeamMemberMode_result$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_setTeamMemberMode_result$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_setTeamMemberMode_result$schema$value ??= zod.z.object({
			"sessionId": zod.z.string().readonly(),
			"profileId": zod.z.string().readonly(),
			"modeWritable": zod.z.boolean().readonly().optional(),
			"pendingModeId": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly().optional(),
			"freshness": zod.z.union([zod.z.literal("live"), zod.z.literal("stale")]).readonly(),
			"editable": zod.z.boolean().readonly(),
			"configOptions": zod.z.union([zod.z.literal(null), zod.z.array(zod.z.union([zod.z.object({
				"type": zod.z.literal("select").readonly(),
				"id": zod.z.string().readonly(),
				"name": zod.z.string().readonly(),
				"description": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly().optional(),
				"category": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly().optional(),
				"currentValue": zod.z.string().readonly(),
				"options": zod.z.array(zod.z.union([zod.z.object({
					"value": zod.z.string().readonly(),
					"name": zod.z.string().readonly(),
					"description": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly().optional()
				}), zod.z.object({
					"group": zod.z.string().readonly(),
					"name": zod.z.string().readonly(),
					"options": zod.z.array(zod.z.object({
						"value": zod.z.string().readonly(),
						"name": zod.z.string().readonly(),
						"description": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly().optional()
					})).readonly()
				})])).readonly()
			}), zod.z.object({
				"type": zod.z.literal("boolean").readonly(),
				"id": zod.z.string().readonly(),
				"name": zod.z.string().readonly(),
				"description": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly().optional(),
				"category": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly().optional(),
				"currentValue": zod.z.boolean().readonly()
			})]))]).readonly(),
			"modes": zod.z.union([zod.z.literal(null), zod.z.array(zod.z.object({
				"id": zod.z.string().readonly(),
				"name": zod.z.string().readonly(),
				"description": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly().optional()
			}))]).readonly(),
			"currentModeId": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly(),
			"contextUsage": zod.z.union([zod.z.literal(null), zod.z.object({
				"used": zod.z.number().readonly(),
				"size": zod.z.number().readonly(),
				"percent": zod.z.number().readonly(),
				"cost": zod.z.union([zod.z.literal(null), zod.z.object({
					"amount": zod.z.number().readonly(),
					"currency": zod.z.string().readonly()
				})]).readonly().describe("agent 明确提供的累计成本；未提供为 null。")
			})]).readonly(),
			"note": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly()
		});
		let _zaimokuza_dsh_acp_adapter_dshAcp_setTeamMemberModel_parameter_0$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_setTeamMemberModel_parameter_0$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_setTeamMemberModel_parameter_0$schema$value ??= zod.z.string();
		let _zaimokuza_dsh_acp_adapter_dshAcp_setTeamMemberModel_parameter_1$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_setTeamMemberModel_parameter_1$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_setTeamMemberModel_parameter_1$schema$value ??= zod.z.string();
		let _zaimokuza_dsh_acp_adapter_dshAcp_setTeamMemberModel_parameter_2$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_setTeamMemberModel_parameter_2$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_setTeamMemberModel_parameter_2$schema$value ??= zod.z.string();
		let _zaimokuza_dsh_acp_adapter_dshAcp_setTeamMemberModel_result$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_setTeamMemberModel_result$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_setTeamMemberModel_result$schema$value ??= zod.z.object({
			"currentModel": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly(),
			"pendingModel": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly(),
			"models": zod.z.array(zod.z.object({
				"id": zod.z.string().readonly(),
				"name": zod.z.string().readonly()
			})).readonly(),
			"writable": zod.z.boolean().readonly()
		});
		let _zaimokuza_dsh_acp_adapter_dshAcp_setToolApprovalPolicy_parameter_0$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_setToolApprovalPolicy_parameter_0$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_setToolApprovalPolicy_parameter_0$schema$value ??= zod.z.string();
		let _zaimokuza_dsh_acp_adapter_dshAcp_setToolApprovalPolicy_parameter_1$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_setToolApprovalPolicy_parameter_1$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_setToolApprovalPolicy_parameter_1$schema$value ??= zod.z.object({ "policy": zod.z.union([zod.z.literal("auto"), zod.z.literal("ask")]).readonly() });
		let _zaimokuza_dsh_acp_adapter_dshAcp_setToolApprovalPolicy_result$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_setToolApprovalPolicy_result$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_setToolApprovalPolicy_result$schema$value ??= zod.z.object({
			"sessionId": zod.z.string().readonly(),
			"policy": zod.z.union([zod.z.literal("auto"), zod.z.literal("ask")]).readonly(),
			"source": zod.z.union([zod.z.literal("session"), zod.z.literal("lead")]).readonly(),
			"editable": zod.z.boolean().readonly()
		});
		let _zaimokuza_dsh_acp_adapter_dshAcp_teamMemberModels_parameter_0$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_teamMemberModels_parameter_0$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_teamMemberModels_parameter_0$schema$value ??= zod.z.string();
		let _zaimokuza_dsh_acp_adapter_dshAcp_teamMemberModels_parameter_1$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_teamMemberModels_parameter_1$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_teamMemberModels_parameter_1$schema$value ??= zod.z.string();
		let _zaimokuza_dsh_acp_adapter_dshAcp_teamMemberModels_result$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_teamMemberModels_result$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_teamMemberModels_result$schema$value ??= zod.z.object({
			"currentModel": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly(),
			"pendingModel": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly(),
			"models": zod.z.array(zod.z.object({
				"id": zod.z.string().readonly(),
				"name": zod.z.string().readonly()
			})).readonly(),
			"writable": zod.z.boolean().readonly()
		});
		let _zaimokuza_dsh_acp_adapter_dshAcp_teamMembers_parameter_0$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_teamMembers_parameter_0$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_teamMembers_parameter_0$schema$value ??= zod.z.string();
		let _zaimokuza_dsh_acp_adapter_dshAcp_teamMembers_result$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_teamMembers_result$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_teamMembers_result$schema$value ??= zod.z.array(zod.z.object({
			"profileId": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly(),
			"sessionId": zod.z.string().readonly(),
			"name": zod.z.string().readonly(),
			"status": zod.z.union([
				zod.z.literal("running"),
				zod.z.literal("failed"),
				zod.z.literal("inactive"),
				zod.z.literal("provisioning")
			]).readonly(),
			"model": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly(),
			"pendingModel": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly().optional(),
			"modelWritable": zod.z.boolean().readonly().optional(),
			"description": zod.z.union([zod.z.literal(null), zod.z.string()]).readonly()
		}));
		let _zaimokuza_dsh_acp_adapter_dshAcp_toolApprovalPolicy_parameter_0$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_toolApprovalPolicy_parameter_0$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_toolApprovalPolicy_parameter_0$schema$value ??= zod.z.string();
		let _zaimokuza_dsh_acp_adapter_dshAcp_toolApprovalPolicy_result$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_toolApprovalPolicy_result$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_toolApprovalPolicy_result$schema$value ??= zod.z.object({
			"sessionId": zod.z.string().readonly(),
			"policy": zod.z.union([zod.z.literal("auto"), zod.z.literal("ask")]).readonly(),
			"source": zod.z.union([zod.z.literal("session"), zod.z.literal("lead")]).readonly(),
			"editable": zod.z.boolean().readonly()
		});
		let _zaimokuza_dsh_acp_adapter_dshAcp_toolApprovalPolicyFollow_parameter_0$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_toolApprovalPolicyFollow_parameter_0$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_toolApprovalPolicyFollow_parameter_0$schema$value ??= zod.z.string();
		let _zaimokuza_dsh_acp_adapter_dshAcp_toolApprovalPolicyFollow_result$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_toolApprovalPolicyFollow_result$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_toolApprovalPolicyFollow_result$schema$value ??= zod.z.union([zod.z.object({
			"type": zod.z.literal("opened").readonly(),
			"snapshot": zod.z.object({
				"sessionId": zod.z.string().readonly(),
				"policy": zod.z.union([zod.z.literal("auto"), zod.z.literal("ask")]).readonly(),
				"source": zod.z.union([zod.z.literal("session"), zod.z.literal("lead")]).readonly(),
				"editable": zod.z.boolean().readonly()
			}).readonly()
		}), zod.z.object({
			"type": zod.z.literal("changed").readonly(),
			"snapshot": zod.z.object({
				"sessionId": zod.z.string().readonly(),
				"policy": zod.z.union([zod.z.literal("auto"), zod.z.literal("ask")]).readonly(),
				"source": zod.z.union([zod.z.literal("session"), zod.z.literal("lead")]).readonly(),
				"editable": zod.z.boolean().readonly()
			}).readonly()
		})]);
		let _zaimokuza_dsh_acp_adapter_dshAcp_activityDetail_parameter_0_strict$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_activityDetail_parameter_0_strict$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_activityDetail_parameter_0_strict$schema$value ??= zod.z.string();
		let _zaimokuza_dsh_acp_adapter_dshAcp_activityDetail_parameter_1_strict$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_activityDetail_parameter_1_strict$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_activityDetail_parameter_1_strict$schema$value ??= zod.z.strictObject({
			"activityId": zod.z.string().readonly(),
			"revisionSeq": zod.z.number().readonly(),
			"ownerDshSessionId": zod.z.string().readonly()
		});
		let _zaimokuza_dsh_acp_adapter_dshAcp_activityFollow_parameter_0_strict$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_activityFollow_parameter_0_strict$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_activityFollow_parameter_0_strict$schema$value ??= zod.z.string();
		let _zaimokuza_dsh_acp_adapter_dshAcp_activityFollow_parameter_1_strict$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_activityFollow_parameter_1_strict$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_activityFollow_parameter_1_strict$schema$value ??= zod.z.union([zod.z.undefined(), zod.z.strictObject({
			"limit": zod.z.number().readonly().optional(),
			"filter": zod.z.strictObject({
				"ownerDshSessionId": zod.z.string().readonly().optional(),
				"promptAnchorMessageId": zod.z.string().readonly().optional()
			}).readonly().optional()
		})]);
		let _zaimokuza_dsh_acp_adapter_dshAcp_activityPage_parameter_0_strict$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_activityPage_parameter_0_strict$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_activityPage_parameter_0_strict$schema$value ??= zod.z.string();
		let _zaimokuza_dsh_acp_adapter_dshAcp_activityPage_parameter_1_strict$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_activityPage_parameter_1_strict$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_activityPage_parameter_1_strict$schema$value ??= zod.z.union([zod.z.undefined(), zod.z.strictObject({
			"afterRevision": zod.z.number().readonly().optional(),
			"limit": zod.z.number().readonly().optional(),
			"filter": zod.z.strictObject({
				"ownerDshSessionId": zod.z.string().readonly().optional(),
				"promptAnchorMessageId": zod.z.string().readonly().optional()
			}).readonly().optional(),
			"snapshotHead": zod.z.number().readonly().optional(),
			"captureSnapshot": zod.z.boolean().readonly().optional()
		})]);
		let _zaimokuza_dsh_acp_adapter_dshAcp_activitySnapshot_parameter_0_strict$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_activitySnapshot_parameter_0_strict$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_activitySnapshot_parameter_0_strict$schema$value ??= zod.z.string();
		let _zaimokuza_dsh_acp_adapter_dshAcp_activitySnapshot_parameter_1_strict$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_activitySnapshot_parameter_1_strict$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_activitySnapshot_parameter_1_strict$schema$value ??= zod.z.union([zod.z.undefined(), zod.z.strictObject({
			"limit": zod.z.number().readonly().optional(),
			"filter": zod.z.strictObject({
				"ownerDshSessionId": zod.z.string().readonly().optional(),
				"promptAnchorMessageId": zod.z.string().readonly().optional()
			}).readonly().optional()
		})]);
		let _zaimokuza_dsh_acp_adapter_dshAcp_agentSessionFollow_parameter_0_strict$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_agentSessionFollow_parameter_0_strict$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_agentSessionFollow_parameter_0_strict$schema$value ??= zod.z.string();
		let _zaimokuza_dsh_acp_adapter_dshAcp_agentSessionSnapshot_parameter_0_strict$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_agentSessionSnapshot_parameter_0_strict$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_agentSessionSnapshot_parameter_0_strict$schema$value ??= zod.z.string();
		let _zaimokuza_dsh_acp_adapter_dshAcp_approvalChildren_parameter_0_strict$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_approvalChildren_parameter_0_strict$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_approvalChildren_parameter_0_strict$schema$value ??= zod.z.string();
		let _zaimokuza_dsh_acp_adapter_dshAcp_auditTimeline_parameter_0_strict$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_auditTimeline_parameter_0_strict$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_auditTimeline_parameter_0_strict$schema$value ??= zod.z.string();
		let _zaimokuza_dsh_acp_adapter_dshAcp_auditTimeline_parameter_1_strict$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_auditTimeline_parameter_1_strict$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_auditTimeline_parameter_1_strict$schema$value ??= zod.z.union([zod.z.undefined(), zod.z.strictObject({
			"afterSeq": zod.z.number().readonly().optional(),
			"limit": zod.z.number().readonly().optional(),
			"view": zod.z.union([
				zod.z.literal("issues"),
				zod.z.literal("operations"),
				zod.z.literal("technical")
			]).readonly().optional(),
			"captureSnapshot": zod.z.boolean().readonly().optional(),
			"snapshotHead": zod.z.number().readonly().optional()
		})]);
		let _zaimokuza_dsh_acp_adapter_dshAcp_backendOf_parameter_0_strict$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_backendOf_parameter_0_strict$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_backendOf_parameter_0_strict$schema$value ??= zod.z.string();
		let _zaimokuza_dsh_acp_adapter_dshAcp_boundSessions_parameter_0_strict$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_boundSessions_parameter_0_strict$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_boundSessions_parameter_0_strict$schema$value ??= zod.z.string();
		let _zaimokuza_dsh_acp_adapter_dshAcp_health_parameter_0_strict$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_health_parameter_0_strict$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_health_parameter_0_strict$schema$value ??= zod.z.union([zod.z.undefined(), zod.z.strictObject({
			"recheck": zod.z.boolean().readonly().optional(),
			"agentId": zod.z.string().readonly().optional()
		})]);
		let _zaimokuza_dsh_acp_adapter_dshAcp_rebindRecoveryBlank_parameter_0_strict$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_rebindRecoveryBlank_parameter_0_strict$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_rebindRecoveryBlank_parameter_0_strict$schema$value ??= zod.z.string();
		let _zaimokuza_dsh_acp_adapter_dshAcp_recoveryFollow_parameter_0_strict$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_recoveryFollow_parameter_0_strict$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_recoveryFollow_parameter_0_strict$schema$value ??= zod.z.string();
		let _zaimokuza_dsh_acp_adapter_dshAcp_recoverySnapshot_parameter_0_strict$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_recoverySnapshot_parameter_0_strict$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_recoverySnapshot_parameter_0_strict$schema$value ??= zod.z.string();
		let _zaimokuza_dsh_acp_adapter_dshAcp_retryOriginal_parameter_0_strict$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_retryOriginal_parameter_0_strict$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_retryOriginal_parameter_0_strict$schema$value ??= zod.z.string();
		let _zaimokuza_dsh_acp_adapter_dshAcp_setAgentSessionOption_parameter_0_strict$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_setAgentSessionOption_parameter_0_strict$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_setAgentSessionOption_parameter_0_strict$schema$value ??= zod.z.string();
		let _zaimokuza_dsh_acp_adapter_dshAcp_setAgentSessionOption_parameter_1_strict$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_setAgentSessionOption_parameter_1_strict$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_setAgentSessionOption_parameter_1_strict$schema$value ??= zod.z.union([zod.z.strictObject({
			"kind": zod.z.literal("config").readonly(),
			"id": zod.z.string().readonly(),
			"value": zod.z.union([
				zod.z.string(),
				zod.z.literal(false),
				zod.z.literal(true)
			]).readonly()
		}), zod.z.strictObject({
			"kind": zod.z.literal("mode").readonly(),
			"id": zod.z.string().readonly()
		})]);
		let _zaimokuza_dsh_acp_adapter_dshAcp_setTeamMemberMode_parameter_0_strict$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_setTeamMemberMode_parameter_0_strict$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_setTeamMemberMode_parameter_0_strict$schema$value ??= zod.z.string();
		let _zaimokuza_dsh_acp_adapter_dshAcp_setTeamMemberMode_parameter_1_strict$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_setTeamMemberMode_parameter_1_strict$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_setTeamMemberMode_parameter_1_strict$schema$value ??= zod.z.string();
		let _zaimokuza_dsh_acp_adapter_dshAcp_setTeamMemberMode_parameter_2_strict$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_setTeamMemberMode_parameter_2_strict$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_setTeamMemberMode_parameter_2_strict$schema$value ??= zod.z.string();
		let _zaimokuza_dsh_acp_adapter_dshAcp_setTeamMemberModel_parameter_0_strict$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_setTeamMemberModel_parameter_0_strict$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_setTeamMemberModel_parameter_0_strict$schema$value ??= zod.z.string();
		let _zaimokuza_dsh_acp_adapter_dshAcp_setTeamMemberModel_parameter_1_strict$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_setTeamMemberModel_parameter_1_strict$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_setTeamMemberModel_parameter_1_strict$schema$value ??= zod.z.string();
		let _zaimokuza_dsh_acp_adapter_dshAcp_setTeamMemberModel_parameter_2_strict$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_setTeamMemberModel_parameter_2_strict$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_setTeamMemberModel_parameter_2_strict$schema$value ??= zod.z.string();
		let _zaimokuza_dsh_acp_adapter_dshAcp_setToolApprovalPolicy_parameter_0_strict$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_setToolApprovalPolicy_parameter_0_strict$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_setToolApprovalPolicy_parameter_0_strict$schema$value ??= zod.z.string();
		let _zaimokuza_dsh_acp_adapter_dshAcp_setToolApprovalPolicy_parameter_1_strict$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_setToolApprovalPolicy_parameter_1_strict$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_setToolApprovalPolicy_parameter_1_strict$schema$value ??= zod.z.strictObject({ "policy": zod.z.union([zod.z.literal("auto"), zod.z.literal("ask")]).readonly() });
		let _zaimokuza_dsh_acp_adapter_dshAcp_teamMemberModels_parameter_0_strict$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_teamMemberModels_parameter_0_strict$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_teamMemberModels_parameter_0_strict$schema$value ??= zod.z.string();
		let _zaimokuza_dsh_acp_adapter_dshAcp_teamMemberModels_parameter_1_strict$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_teamMemberModels_parameter_1_strict$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_teamMemberModels_parameter_1_strict$schema$value ??= zod.z.string();
		let _zaimokuza_dsh_acp_adapter_dshAcp_teamMembers_parameter_0_strict$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_teamMembers_parameter_0_strict$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_teamMembers_parameter_0_strict$schema$value ??= zod.z.string();
		let _zaimokuza_dsh_acp_adapter_dshAcp_toolApprovalPolicy_parameter_0_strict$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_toolApprovalPolicy_parameter_0_strict$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_toolApprovalPolicy_parameter_0_strict$schema$value ??= zod.z.string();
		let _zaimokuza_dsh_acp_adapter_dshAcp_toolApprovalPolicyFollow_parameter_0_strict$schema$value;
		const _zaimokuza_dsh_acp_adapter_dshAcp_toolApprovalPolicyFollow_parameter_0_strict$schema = () => _zaimokuza_dsh_acp_adapter_dshAcp_toolApprovalPolicyFollow_parameter_0_strict$schema$value ??= zod.z.string();
		const TYPERT_REMOTE = createTypertRemoteInfo({
			package: "@zaimokuza/dsh-acp-adapter",
			methods: {
				"dshAcp/activityDetail": {
					service: "dshAcp",
					description: "Exact immutable revision; use the same ownership gate as journal reads.",
					invocation: { kind: "direct" },
					parameters: [{
						name: "sessionId",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@zaimokuza/dsh-acp-adapter#dshAcp/activityDetail:sessionId",
							create: _zaimokuza_dsh_acp_adapter_dshAcp_activityDetail_parameter_0$schema,
							jsonSchema: { "type": "string" }
						},
						strictCodec: {
							mode: "strict",
							typeSymbol: "@zaimokuza/dsh-acp-adapter#dshAcp/activityDetail:sessionId",
							create: _zaimokuza_dsh_acp_adapter_dshAcp_activityDetail_parameter_0_strict$schema,
							jsonSchema: { "type": "string" }
						}
					}, {
						name: "request",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@zaimokuza/dsh-acp-adapter#dshAcp/activityDetail:request",
							create: _zaimokuza_dsh_acp_adapter_dshAcp_activityDetail_parameter_1$schema,
							jsonSchema: {
								"type": "object",
								"properties": {
									"activityId": { "type": "string" },
									"revisionSeq": { "type": "number" },
									"ownerDshSessionId": { "type": "string" }
								},
								"required": [
									"activityId",
									"revisionSeq",
									"ownerDshSessionId"
								],
								"additionalProperties": true
							}
						},
						strictCodec: {
							mode: "strict",
							typeSymbol: "@zaimokuza/dsh-acp-adapter#dshAcp/activityDetail:request",
							create: _zaimokuza_dsh_acp_adapter_dshAcp_activityDetail_parameter_1_strict$schema,
							jsonSchema: {
								"type": "object",
								"properties": {
									"activityId": { "type": "string" },
									"revisionSeq": { "type": "number" },
									"ownerDshSessionId": { "type": "string" }
								},
								"required": [
									"activityId",
									"revisionSeq",
									"ownerDshSessionId"
								],
								"additionalProperties": false
							}
						}
					}],
					cancellation: { parameter: "signal" },
					result: {
						mode: "strict",
						typeSymbol: "@zaimokuza/dsh-acp-adapter/client#AcpActivityView",
						create: _zaimokuza_dsh_acp_adapter_dshAcp_activityDetail_result$schema,
						jsonSchema: {
							"type": "object",
							"properties": {
								"detailDeferred": {
									"type": "boolean",
									"description": "Large detail is fetched on expansion, at this exact revision."
								},
								"detailPaths": {
									"type": "array",
									"items": { "type": "string" },
									"description": "Small file metadata for a stable collapsed tool summary. No file contents."
								},
								"display": {
									"type": "object",
									"properties": {
										"diffs": {
											"type": "array",
											"items": {
												"type": "object",
												"properties": {
													"path": { "type": "string" },
													"oldText": { "oneOf": [{
														"type": "null",
														"const": null
													}, { "type": "string" }] },
													"newText": { "type": "string" }
												},
												"required": [
													"path",
													"oldText",
													"newText"
												],
												"additionalProperties": true
											}
										},
										"plan": {
											"type": "array",
											"items": {
												"type": "object",
												"properties": {
													"content": { "type": "string" },
													"status": {
														"type": "string",
														"enum": [
															"pending",
															"in_progress",
															"completed"
														]
													}
												},
												"required": ["content", "status"],
												"additionalProperties": true
											}
										},
										"unavailable": {
											"type": "string",
											"enum": ["too-large", "invalid"]
										}
									},
									"required": [],
									"additionalProperties": true,
									"description": "Complete, normalized display fields. Independent from bounded raw diagnostics."
								},
								"contentIndex": { "type": "number" },
								"dshSessionId": { "type": "string" },
								"ownerDshSessionId": { "type": "string" },
								"promptAnchorMessageId": { "type": "string" },
								"activityId": { "type": "string" },
								"activitySeq": { "type": "number" },
								"revisionSeq": { "type": "number" },
								"time": { "type": "number" },
								"kind": {
									"type": "string",
									"enum": [
										"tool",
										"plan",
										"terminal",
										"diff",
										"resource",
										"delegated",
										"other"
									]
								},
								"status": {
									"type": "string",
									"enum": [
										"completed",
										"running",
										"failed",
										"cancelled",
										"unfinished"
									]
								},
								"presentation": { "type": "string" },
								"rawDetail": { "type": "string" },
								"rawDetailRef": { "type": "string" }
							},
							"required": [
								"dshSessionId",
								"ownerDshSessionId",
								"promptAnchorMessageId",
								"activityId",
								"activitySeq",
								"revisionSeq",
								"time",
								"kind",
								"status",
								"presentation"
							],
							"additionalProperties": true
						}
					},
					sourceLocation: {
						"file": "packages/dsh-acp-adapter/src/remote/service.ts",
						"line": 683,
						"column": 9
					}
				},
				"dshAcp/activityFollow": {
					service: "dshAcp",
					description: "Snapshot-first live journal. The subscription is attached before the opening read, so a revision committed during the opening window is either present in the opening snapshot or remains queued for delivery. The opening cursor is the unfiltered session head; clients filter activities locally while retaining a contiguous reconnect cursor.",
					mode: "stream",
					invocation: { kind: "direct" },
					parameters: [{
						name: "sessionId",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@zaimokuza/dsh-acp-adapter#dshAcp/activityFollow:sessionId",
							create: _zaimokuza_dsh_acp_adapter_dshAcp_activityFollow_parameter_0$schema,
							jsonSchema: { "type": "string" }
						},
						strictCodec: {
							mode: "strict",
							typeSymbol: "@zaimokuza/dsh-acp-adapter#dshAcp/activityFollow:sessionId",
							create: _zaimokuza_dsh_acp_adapter_dshAcp_activityFollow_parameter_0_strict$schema,
							jsonSchema: { "type": "string" }
						}
					}, {
						name: "request",
						source: "json",
						acceptsUndefined: true,
						codec: {
							mode: "strict",
							typeSymbol: "@zaimokuza/dsh-acp-adapter#dshAcp/activityFollow:request",
							create: _zaimokuza_dsh_acp_adapter_dshAcp_activityFollow_parameter_1$schema,
							jsonSchema: {
								"type": "object",
								"properties": {
									"limit": { "type": "number" },
									"filter": {
										"type": "object",
										"properties": {
											"ownerDshSessionId": { "type": "string" },
											"promptAnchorMessageId": { "type": "string" }
										},
										"required": [],
										"additionalProperties": true
									}
								},
								"required": [],
								"additionalProperties": true
							}
						},
						strictCodec: {
							mode: "strict",
							typeSymbol: "@zaimokuza/dsh-acp-adapter#dshAcp/activityFollow:request",
							create: _zaimokuza_dsh_acp_adapter_dshAcp_activityFollow_parameter_1_strict$schema,
							jsonSchema: {
								"type": "object",
								"properties": {
									"limit": { "type": "number" },
									"filter": {
										"type": "object",
										"properties": {
											"ownerDshSessionId": { "type": "string" },
											"promptAnchorMessageId": { "type": "string" }
										},
										"required": [],
										"additionalProperties": false
									}
								},
								"required": [],
								"additionalProperties": false
							}
						}
					}],
					cancellation: { parameter: "signal" },
					result: {
						mode: "strict",
						typeSymbol: "@zaimokuza/dsh-acp-adapter/client#AcpActivityJournalFrame",
						create: _zaimokuza_dsh_acp_adapter_dshAcp_activityFollow_result$schema,
						jsonSchema: { "oneOf": [{
							"type": "object",
							"properties": {
								"type": {
									"type": "string",
									"const": "opened"
								},
								"cursor": { "type": "number" },
								"activities": {
									"type": "array",
									"items": {
										"type": "object",
										"properties": {
											"detailDeferred": {
												"type": "boolean",
												"description": "Large detail is fetched on expansion, at this exact revision."
											},
											"detailPaths": {
												"type": "array",
												"items": { "type": "string" },
												"description": "Small file metadata for a stable collapsed tool summary. No file contents."
											},
											"display": {
												"type": "object",
												"properties": {
													"diffs": {
														"type": "array",
														"items": {
															"type": "object",
															"properties": {
																"path": { "type": "string" },
																"oldText": { "oneOf": [{
																	"type": "null",
																	"const": null
																}, { "type": "string" }] },
																"newText": { "type": "string" }
															},
															"required": [
																"path",
																"oldText",
																"newText"
															],
															"additionalProperties": true
														}
													},
													"plan": {
														"type": "array",
														"items": {
															"type": "object",
															"properties": {
																"content": { "type": "string" },
																"status": {
																	"type": "string",
																	"enum": [
																		"pending",
																		"in_progress",
																		"completed"
																	]
																}
															},
															"required": ["content", "status"],
															"additionalProperties": true
														}
													},
													"unavailable": {
														"type": "string",
														"enum": ["too-large", "invalid"]
													}
												},
												"required": [],
												"additionalProperties": true,
												"description": "Complete, normalized display fields. Independent from bounded raw diagnostics."
											},
											"contentIndex": { "type": "number" },
											"dshSessionId": { "type": "string" },
											"ownerDshSessionId": { "type": "string" },
											"promptAnchorMessageId": { "type": "string" },
											"activityId": { "type": "string" },
											"activitySeq": { "type": "number" },
											"revisionSeq": { "type": "number" },
											"time": { "type": "number" },
											"kind": {
												"type": "string",
												"enum": [
													"tool",
													"plan",
													"terminal",
													"diff",
													"resource",
													"delegated",
													"other"
												]
											},
											"status": {
												"type": "string",
												"enum": [
													"completed",
													"running",
													"failed",
													"cancelled",
													"unfinished"
												]
											},
											"presentation": { "type": "string" },
											"rawDetail": { "type": "string" },
											"rawDetailRef": { "type": "string" }
										},
										"required": [
											"dshSessionId",
											"ownerDshSessionId",
											"promptAnchorMessageId",
											"activityId",
											"activitySeq",
											"revisionSeq",
											"time",
											"kind",
											"status",
											"presentation"
										],
										"additionalProperties": true
									}
								},
								"head": { "type": "number" }
							},
							"required": [
								"type",
								"cursor",
								"activities",
								"head"
							],
							"additionalProperties": true
						}, {
							"type": "object",
							"properties": {
								"type": {
									"type": "string",
									"const": "entry"
								},
								"activity": {
									"type": "object",
									"properties": {
										"detailDeferred": {
											"type": "boolean",
											"description": "Large detail is fetched on expansion, at this exact revision."
										},
										"detailPaths": {
											"type": "array",
											"items": { "type": "string" },
											"description": "Small file metadata for a stable collapsed tool summary. No file contents."
										},
										"display": {
											"type": "object",
											"properties": {
												"diffs": {
													"type": "array",
													"items": {
														"type": "object",
														"properties": {
															"path": { "type": "string" },
															"oldText": { "oneOf": [{
																"type": "null",
																"const": null
															}, { "type": "string" }] },
															"newText": { "type": "string" }
														},
														"required": [
															"path",
															"oldText",
															"newText"
														],
														"additionalProperties": true
													}
												},
												"plan": {
													"type": "array",
													"items": {
														"type": "object",
														"properties": {
															"content": { "type": "string" },
															"status": {
																"type": "string",
																"enum": [
																	"pending",
																	"in_progress",
																	"completed"
																]
															}
														},
														"required": ["content", "status"],
														"additionalProperties": true
													}
												},
												"unavailable": {
													"type": "string",
													"enum": ["too-large", "invalid"]
												}
											},
											"required": [],
											"additionalProperties": true,
											"description": "Complete, normalized display fields. Independent from bounded raw diagnostics."
										},
										"contentIndex": { "type": "number" },
										"dshSessionId": { "type": "string" },
										"ownerDshSessionId": { "type": "string" },
										"promptAnchorMessageId": { "type": "string" },
										"activityId": { "type": "string" },
										"activitySeq": { "type": "number" },
										"revisionSeq": { "type": "number" },
										"time": { "type": "number" },
										"kind": {
											"type": "string",
											"enum": [
												"tool",
												"plan",
												"terminal",
												"diff",
												"resource",
												"delegated",
												"other"
											]
										},
										"status": {
											"type": "string",
											"enum": [
												"completed",
												"running",
												"failed",
												"cancelled",
												"unfinished"
											]
										},
										"presentation": { "type": "string" },
										"rawDetail": { "type": "string" },
										"rawDetailRef": { "type": "string" }
									},
									"required": [
										"dshSessionId",
										"ownerDshSessionId",
										"promptAnchorMessageId",
										"activityId",
										"activitySeq",
										"revisionSeq",
										"time",
										"kind",
										"status",
										"presentation"
									],
									"additionalProperties": true
								}
							},
							"required": ["type", "activity"],
							"additionalProperties": true
						}] }
					},
					sourceLocation: {
						"file": "packages/dsh-acp-adapter/src/remote/service.ts",
						"line": 767,
						"column": 10
					}
				},
				"dshAcp/activityPage": {
					service: "dshAcp",
					description: "Revision-cursor page used for reconnect/gap repair. The page contains every committed revision, while the snapshot contains only current rows.",
					invocation: { kind: "direct" },
					parameters: [{
						name: "sessionId",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@zaimokuza/dsh-acp-adapter#dshAcp/activityPage:sessionId",
							create: _zaimokuza_dsh_acp_adapter_dshAcp_activityPage_parameter_0$schema,
							jsonSchema: { "type": "string" }
						},
						strictCodec: {
							mode: "strict",
							typeSymbol: "@zaimokuza/dsh-acp-adapter#dshAcp/activityPage:sessionId",
							create: _zaimokuza_dsh_acp_adapter_dshAcp_activityPage_parameter_0_strict$schema,
							jsonSchema: { "type": "string" }
						}
					}, {
						name: "request",
						source: "json",
						acceptsUndefined: true,
						codec: {
							mode: "strict",
							typeSymbol: "@zaimokuza/dsh-acp-adapter#dshAcp/activityPage:request",
							create: _zaimokuza_dsh_acp_adapter_dshAcp_activityPage_parameter_1$schema,
							jsonSchema: {
								"type": "object",
								"properties": {
									"afterRevision": { "type": "number" },
									"limit": { "type": "number" },
									"filter": {
										"type": "object",
										"properties": {
											"ownerDshSessionId": { "type": "string" },
											"promptAnchorMessageId": { "type": "string" }
										},
										"required": [],
										"additionalProperties": true
									},
									"snapshotHead": { "type": "number" },
									"captureSnapshot": { "type": "boolean" }
								},
								"required": [],
								"additionalProperties": true
							}
						},
						strictCodec: {
							mode: "strict",
							typeSymbol: "@zaimokuza/dsh-acp-adapter#dshAcp/activityPage:request",
							create: _zaimokuza_dsh_acp_adapter_dshAcp_activityPage_parameter_1_strict$schema,
							jsonSchema: {
								"type": "object",
								"properties": {
									"afterRevision": { "type": "number" },
									"limit": { "type": "number" },
									"filter": {
										"type": "object",
										"properties": {
											"ownerDshSessionId": { "type": "string" },
											"promptAnchorMessageId": { "type": "string" }
										},
										"required": [],
										"additionalProperties": false
									},
									"snapshotHead": { "type": "number" },
									"captureSnapshot": { "type": "boolean" }
								},
								"required": [],
								"additionalProperties": false
							}
						}
					}],
					cancellation: { parameter: "signal" },
					result: {
						mode: "strict",
						typeSymbol: "@zaimokuza/dsh-acp-adapter/client#AcpActivityPageView",
						create: _zaimokuza_dsh_acp_adapter_dshAcp_activityPage_result$schema,
						jsonSchema: {
							"type": "object",
							"properties": {
								"sessionId": { "type": "string" },
								"activities": {
									"type": "array",
									"items": {
										"type": "object",
										"properties": {
											"detailDeferred": {
												"type": "boolean",
												"description": "Large detail is fetched on expansion, at this exact revision."
											},
											"detailPaths": {
												"type": "array",
												"items": { "type": "string" },
												"description": "Small file metadata for a stable collapsed tool summary. No file contents."
											},
											"display": {
												"type": "object",
												"properties": {
													"diffs": {
														"type": "array",
														"items": {
															"type": "object",
															"properties": {
																"path": { "type": "string" },
																"oldText": { "oneOf": [{
																	"type": "null",
																	"const": null
																}, { "type": "string" }] },
																"newText": { "type": "string" }
															},
															"required": [
																"path",
																"oldText",
																"newText"
															],
															"additionalProperties": true
														}
													},
													"plan": {
														"type": "array",
														"items": {
															"type": "object",
															"properties": {
																"content": { "type": "string" },
																"status": {
																	"type": "string",
																	"enum": [
																		"pending",
																		"in_progress",
																		"completed"
																	]
																}
															},
															"required": ["content", "status"],
															"additionalProperties": true
														}
													},
													"unavailable": {
														"type": "string",
														"enum": ["too-large", "invalid"]
													}
												},
												"required": [],
												"additionalProperties": true,
												"description": "Complete, normalized display fields. Independent from bounded raw diagnostics."
											},
											"contentIndex": { "type": "number" },
											"dshSessionId": { "type": "string" },
											"ownerDshSessionId": { "type": "string" },
											"promptAnchorMessageId": { "type": "string" },
											"activityId": { "type": "string" },
											"activitySeq": { "type": "number" },
											"revisionSeq": { "type": "number" },
											"time": { "type": "number" },
											"kind": {
												"type": "string",
												"enum": [
													"tool",
													"plan",
													"terminal",
													"diff",
													"resource",
													"delegated",
													"other"
												]
											},
											"status": {
												"type": "string",
												"enum": [
													"completed",
													"running",
													"failed",
													"cancelled",
													"unfinished"
												]
											},
											"presentation": { "type": "string" },
											"rawDetail": { "type": "string" },
											"rawDetailRef": { "type": "string" }
										},
										"required": [
											"dshSessionId",
											"ownerDshSessionId",
											"promptAnchorMessageId",
											"activityId",
											"activitySeq",
											"revisionSeq",
											"time",
											"kind",
											"status",
											"presentation"
										],
										"additionalProperties": true
									}
								},
								"head": { "type": "number" },
								"nextCursor": { "oneOf": [{
									"type": "null",
									"const": null
								}, { "type": "number" }] },
								"hasMore": { "type": "boolean" }
							},
							"required": [
								"sessionId",
								"activities",
								"head",
								"nextCursor",
								"hasMore"
							],
							"additionalProperties": true
						}
					},
					sourceLocation: {
						"file": "packages/dsh-acp-adapter/src/remote/service.ts",
						"line": 716,
						"column": 9
					}
				},
				"dshAcp/activitySnapshot": {
					service: "dshAcp",
					description: "Opening snapshot for the activity panel. Authorization is deliberately separate from the sidecar query: a caller cannot turn an arbitrary string into access to another DSH session's Agent trace.",
					invocation: { kind: "direct" },
					parameters: [{
						name: "sessionId",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@zaimokuza/dsh-acp-adapter#dshAcp/activitySnapshot:sessionId",
							create: _zaimokuza_dsh_acp_adapter_dshAcp_activitySnapshot_parameter_0$schema,
							jsonSchema: { "type": "string" }
						},
						strictCodec: {
							mode: "strict",
							typeSymbol: "@zaimokuza/dsh-acp-adapter#dshAcp/activitySnapshot:sessionId",
							create: _zaimokuza_dsh_acp_adapter_dshAcp_activitySnapshot_parameter_0_strict$schema,
							jsonSchema: { "type": "string" }
						}
					}, {
						name: "request",
						source: "json",
						acceptsUndefined: true,
						codec: {
							mode: "strict",
							typeSymbol: "@zaimokuza/dsh-acp-adapter#dshAcp/activitySnapshot:request",
							create: _zaimokuza_dsh_acp_adapter_dshAcp_activitySnapshot_parameter_1$schema,
							jsonSchema: {
								"type": "object",
								"properties": {
									"limit": { "type": "number" },
									"filter": {
										"type": "object",
										"properties": {
											"ownerDshSessionId": { "type": "string" },
											"promptAnchorMessageId": { "type": "string" }
										},
										"required": [],
										"additionalProperties": true
									}
								},
								"required": [],
								"additionalProperties": true
							}
						},
						strictCodec: {
							mode: "strict",
							typeSymbol: "@zaimokuza/dsh-acp-adapter#dshAcp/activitySnapshot:request",
							create: _zaimokuza_dsh_acp_adapter_dshAcp_activitySnapshot_parameter_1_strict$schema,
							jsonSchema: {
								"type": "object",
								"properties": {
									"limit": { "type": "number" },
									"filter": {
										"type": "object",
										"properties": {
											"ownerDshSessionId": { "type": "string" },
											"promptAnchorMessageId": { "type": "string" }
										},
										"required": [],
										"additionalProperties": false
									}
								},
								"required": [],
								"additionalProperties": false
							}
						}
					}],
					result: {
						mode: "strict",
						typeSymbol: "@zaimokuza/dsh-acp-adapter/client#AcpActivitySnapshotView",
						create: _zaimokuza_dsh_acp_adapter_dshAcp_activitySnapshot_result$schema,
						jsonSchema: {
							"type": "object",
							"properties": {
								"sessionId": { "type": "string" },
								"activities": {
									"type": "array",
									"items": {
										"type": "object",
										"properties": {
											"detailDeferred": {
												"type": "boolean",
												"description": "Large detail is fetched on expansion, at this exact revision."
											},
											"detailPaths": {
												"type": "array",
												"items": { "type": "string" },
												"description": "Small file metadata for a stable collapsed tool summary. No file contents."
											},
											"display": {
												"type": "object",
												"properties": {
													"diffs": {
														"type": "array",
														"items": {
															"type": "object",
															"properties": {
																"path": { "type": "string" },
																"oldText": { "oneOf": [{
																	"type": "null",
																	"const": null
																}, { "type": "string" }] },
																"newText": { "type": "string" }
															},
															"required": [
																"path",
																"oldText",
																"newText"
															],
															"additionalProperties": true
														}
													},
													"plan": {
														"type": "array",
														"items": {
															"type": "object",
															"properties": {
																"content": { "type": "string" },
																"status": {
																	"type": "string",
																	"enum": [
																		"pending",
																		"in_progress",
																		"completed"
																	]
																}
															},
															"required": ["content", "status"],
															"additionalProperties": true
														}
													},
													"unavailable": {
														"type": "string",
														"enum": ["too-large", "invalid"]
													}
												},
												"required": [],
												"additionalProperties": true,
												"description": "Complete, normalized display fields. Independent from bounded raw diagnostics."
											},
											"contentIndex": { "type": "number" },
											"dshSessionId": { "type": "string" },
											"ownerDshSessionId": { "type": "string" },
											"promptAnchorMessageId": { "type": "string" },
											"activityId": { "type": "string" },
											"activitySeq": { "type": "number" },
											"revisionSeq": { "type": "number" },
											"time": { "type": "number" },
											"kind": {
												"type": "string",
												"enum": [
													"tool",
													"plan",
													"terminal",
													"diff",
													"resource",
													"delegated",
													"other"
												]
											},
											"status": {
												"type": "string",
												"enum": [
													"completed",
													"running",
													"failed",
													"cancelled",
													"unfinished"
												]
											},
											"presentation": { "type": "string" },
											"rawDetail": { "type": "string" },
											"rawDetailRef": { "type": "string" }
										},
										"required": [
											"dshSessionId",
											"ownerDshSessionId",
											"promptAnchorMessageId",
											"activityId",
											"activitySeq",
											"revisionSeq",
											"time",
											"kind",
											"status",
											"presentation"
										],
										"additionalProperties": true
									}
								},
								"head": { "type": "number" }
							},
							"required": [
								"sessionId",
								"activities",
								"head"
							],
							"additionalProperties": true
						}
					},
					sourceLocation: {
						"file": "packages/dsh-acp-adapter/src/remote/service.ts",
						"line": 667,
						"column": 9
					}
				},
				"dshAcp/agentSessionFollow": {
					service: "dshAcp",
					description: "Subscribe before reading: creation or a config notification cannot fall into the opening gap.",
					mode: "stream",
					invocation: { kind: "direct" },
					parameters: [{
						name: "sessionId",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@zaimokuza/dsh-acp-adapter#dshAcp/agentSessionFollow:sessionId",
							create: _zaimokuza_dsh_acp_adapter_dshAcp_agentSessionFollow_parameter_0$schema,
							jsonSchema: { "type": "string" }
						},
						strictCodec: {
							mode: "strict",
							typeSymbol: "@zaimokuza/dsh-acp-adapter#dshAcp/agentSessionFollow:sessionId",
							create: _zaimokuza_dsh_acp_adapter_dshAcp_agentSessionFollow_parameter_0_strict$schema,
							jsonSchema: { "type": "string" }
						}
					}],
					cancellation: { parameter: "signal" },
					result: {
						mode: "strict",
						typeSymbol: "@zaimokuza/dsh-acp-adapter/client#AcpAgentSessionFrame",
						create: _zaimokuza_dsh_acp_adapter_dshAcp_agentSessionFollow_result$schema,
						jsonSchemaError: "typert tool schema: selected union branches overlap or have no required discriminator"
					},
					sourceLocation: {
						"file": "packages/dsh-acp-adapter/src/remote/service.ts",
						"line": 1090,
						"column": 10
					}
				},
				"dshAcp/agentSessionSnapshot": {
					service: "dshAcp",
					description: "Additive Agent-owned controls/context surface. It intentionally does not reuse the legacy live Agent/options service, model picker, or DSH usage.",
					invocation: { kind: "direct" },
					parameters: [{
						name: "sessionId",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@zaimokuza/dsh-acp-adapter#dshAcp/agentSessionSnapshot:sessionId",
							create: _zaimokuza_dsh_acp_adapter_dshAcp_agentSessionSnapshot_parameter_0$schema,
							jsonSchema: { "type": "string" }
						},
						strictCodec: {
							mode: "strict",
							typeSymbol: "@zaimokuza/dsh-acp-adapter#dshAcp/agentSessionSnapshot:sessionId",
							create: _zaimokuza_dsh_acp_adapter_dshAcp_agentSessionSnapshot_parameter_0_strict$schema,
							jsonSchema: { "type": "string" }
						}
					}],
					result: {
						mode: "strict",
						typeSymbol: "@zaimokuza/dsh-acp-adapter/client#AcpAgentSessionSnapshotView",
						create: _zaimokuza_dsh_acp_adapter_dshAcp_agentSessionSnapshot_result$schema,
						jsonSchemaError: "typert tool schema: selected union branches overlap or have no required discriminator"
					},
					sourceLocation: {
						"file": "packages/dsh-acp-adapter/src/remote/service.ts",
						"line": 1082,
						"column": 9
					}
				},
				"dshAcp/approvalChildren": {
					service: "dshAcp",
					description: "Authoritative eligible descendants; no approval is recreated or answered here.",
					invocation: { kind: "direct" },
					parameters: [{
						name: "parent",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@zaimokuza/dsh-acp-adapter#dshAcp/approvalChildren:parent",
							create: _zaimokuza_dsh_acp_adapter_dshAcp_approvalChildren_parameter_0$schema,
							jsonSchema: { "type": "string" }
						},
						strictCodec: {
							mode: "strict",
							typeSymbol: "@zaimokuza/dsh-acp-adapter#dshAcp/approvalChildren:parent",
							create: _zaimokuza_dsh_acp_adapter_dshAcp_approvalChildren_parameter_0_strict$schema,
							jsonSchema: { "type": "string" }
						}
					}],
					result: {
						mode: "strict",
						typeSymbol: "@zaimokuza/dsh-acp-adapter#dshAcp/approvalChildren:result",
						create: _zaimokuza_dsh_acp_adapter_dshAcp_approvalChildren_result$schema,
						jsonSchema: {
							"type": "array",
							"items": {
								"type": "object",
								"properties": {
									"sessionId": { "type": "string" },
									"parentSessionId": { "type": "string" },
									"name": { "type": "string" },
									"mode": {
										"type": "string",
										"enum": ["continuable", "one-shot"]
									},
									"path": {
										"type": "array",
										"items": {
											"type": "object",
											"properties": {
												"sessionId": { "type": "string" },
												"name": { "type": "string" }
											},
											"required": ["sessionId", "name"],
											"additionalProperties": true
										},
										"description": "Direct-child to descendant path; never includes unrelated or inherited history."
									}
								},
								"required": [
									"sessionId",
									"parentSessionId",
									"name",
									"mode",
									"path"
								],
								"additionalProperties": true
							}
						}
					},
					sourceLocation: {
						"file": "packages/dsh-acp-adapter/src/remote/service.ts",
						"line": 894,
						"column": 9
					}
				},
				"dshAcp/auditTimeline": {
					service: "dshAcp",
					description: "Read a bounded sidecar page. Raw payloads never cross the Remote boundary.",
					invocation: { kind: "direct" },
					parameters: [{
						name: "sessionId",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@zaimokuza/dsh-acp-adapter#dshAcp/auditTimeline:sessionId",
							create: _zaimokuza_dsh_acp_adapter_dshAcp_auditTimeline_parameter_0$schema,
							jsonSchema: { "type": "string" }
						},
						strictCodec: {
							mode: "strict",
							typeSymbol: "@zaimokuza/dsh-acp-adapter#dshAcp/auditTimeline:sessionId",
							create: _zaimokuza_dsh_acp_adapter_dshAcp_auditTimeline_parameter_0_strict$schema,
							jsonSchema: { "type": "string" }
						}
					}, {
						name: "request",
						source: "json",
						acceptsUndefined: true,
						codec: {
							mode: "strict",
							typeSymbol: "@zaimokuza/dsh-acp-adapter#dshAcp/auditTimeline:request",
							create: _zaimokuza_dsh_acp_adapter_dshAcp_auditTimeline_parameter_1$schema,
							jsonSchema: {
								"type": "object",
								"properties": {
									"afterSeq": { "type": "number" },
									"limit": { "type": "number" },
									"view": {
										"type": "string",
										"enum": [
											"issues",
											"operations",
											"technical"
										]
									},
									"captureSnapshot": { "type": "boolean" },
									"snapshotHead": { "type": "number" }
								},
								"required": [],
								"additionalProperties": true
							}
						},
						strictCodec: {
							mode: "strict",
							typeSymbol: "@zaimokuza/dsh-acp-adapter#dshAcp/auditTimeline:request",
							create: _zaimokuza_dsh_acp_adapter_dshAcp_auditTimeline_parameter_1_strict$schema,
							jsonSchema: {
								"type": "object",
								"properties": {
									"afterSeq": { "type": "number" },
									"limit": { "type": "number" },
									"view": {
										"type": "string",
										"enum": [
											"issues",
											"operations",
											"technical"
										]
									},
									"captureSnapshot": { "type": "boolean" },
									"snapshotHead": { "type": "number" }
								},
								"required": [],
								"additionalProperties": false
							}
						}
					}],
					result: {
						mode: "strict",
						typeSymbol: "@zaimokuza/dsh-acp-adapter/client#AcpAuditTimelinePage",
						create: _zaimokuza_dsh_acp_adapter_dshAcp_auditTimeline_result$schema,
						jsonSchema: {
							"type": "object",
							"properties": {
								"sessionId": { "type": "string" },
								"entries": {
									"type": "array",
									"items": {
										"type": "object",
										"properties": {
											"seq": { "type": "number" },
											"time": { "type": "number" },
											"kind": { "type": "string" },
											"severity": {
												"type": "string",
												"enum": [
													"info",
													"warning",
													"error"
												]
											},
											"category": {
												"type": "string",
												"enum": [
													"recovery",
													"permission",
													"agent",
													"files"
												]
											},
											"summaryCode": {
												"type": "string",
												"enum": [
													"binding.established",
													"permission.asked",
													"permission.bridge",
													"permission.decided",
													"reconciliation.required",
													"replay.matched",
													"replay.different",
													"replay.overflow",
													"replay.not-compared",
													"restore.reused",
													"restore.resumed",
													"restore.loaded",
													"replay.unavailable",
													"degradation.recorded",
													"filesystem.operation",
													"filesystem.read",
													"filesystem.write",
													"terminal.operation",
													"session-fork.completed",
													"agent.event"
												]
											},
											"subject": { "oneOf": [{
												"type": "null",
												"const": null
											}, { "type": "string" }] },
											"status": { "oneOf": [{
												"type": "null",
												"const": null
											}, { "type": "string" }] },
											"detail": { "oneOf": [{
												"type": "null",
												"const": null
											}, { "type": "string" }] }
										},
										"required": [
											"seq",
											"time",
											"kind",
											"severity",
											"category",
											"summaryCode",
											"subject",
											"status",
											"detail"
										],
										"additionalProperties": true
									}
								},
								"snapshotHead": {
									"oneOf": [{
										"type": "null",
										"const": null
									}, { "type": "number" }],
									"description": "Fixed durable high-water mark used by every page in one export."
								},
								"scannedThrough": {
									"type": "number",
									"description": "Last physical sidecar sequence inspected. May advance over malformed rows."
								},
								"scannedRecords": {
									"oneOf": [{
										"type": "null",
										"const": null
									}, { "type": "number" }],
									"description": "Physical rows examined by a snapshot scan; unavailable on ordinary live pages."
								},
								"unreadableRecords": {
									"type": "number",
									"description": "Malformed stored rows skipped during this page; only known for snapshot scans."
								},
								"nextCursor": { "oneOf": [{
									"type": "null",
									"const": null
								}, { "type": "number" }] },
								"hasMore": { "type": "boolean" }
							},
							"required": [
								"sessionId",
								"entries",
								"snapshotHead",
								"scannedThrough",
								"scannedRecords",
								"unreadableRecords",
								"nextCursor",
								"hasMore"
							],
							"additionalProperties": true
						}
					},
					sourceLocation: {
						"file": "packages/dsh-acp-adapter/src/remote/service.ts",
						"line": 568,
						"column": 9
					}
				},
				"dshAcp/backendOf": {
					service: "dshAcp",
					description: "Read the current backend from its durable binding, then request header. A known live session without either fact is blank; an absent or unreadable session without live existence evidence is rejected rather than guessed.",
					invocation: { kind: "direct" },
					parameters: [{
						name: "sessionId",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@zaimokuza/dsh-acp-adapter#dshAcp/backendOf:sessionId",
							create: _zaimokuza_dsh_acp_adapter_dshAcp_backendOf_parameter_0$schema,
							jsonSchema: { "type": "string" }
						},
						strictCodec: {
							mode: "strict",
							typeSymbol: "@zaimokuza/dsh-acp-adapter#dshAcp/backendOf:sessionId",
							create: _zaimokuza_dsh_acp_adapter_dshAcp_backendOf_parameter_0_strict$schema,
							jsonSchema: { "type": "string" }
						}
					}],
					result: {
						mode: "strict",
						typeSymbol: "@zaimokuza/dsh-acp-adapter/client#AcpBackendState",
						create: _zaimokuza_dsh_acp_adapter_dshAcp_backendOf_result$schema,
						jsonSchema: { "oneOf": [
							{
								"type": "object",
								"properties": { "state": {
									"type": "string",
									"const": "blank"
								} },
								"required": ["state"],
								"additionalProperties": true
							},
							{
								"type": "object",
								"properties": {
									"state": {
										"type": "string",
										"const": "draft"
									},
									"provider": { "type": "string" },
									"model": { "type": "string" }
								},
								"required": ["state", "provider"],
								"additionalProperties": true
							},
							{
								"type": "object",
								"properties": {
									"state": {
										"type": "string",
										"const": "established"
									},
									"provider": { "type": "string" }
								},
								"required": ["state", "provider"],
								"additionalProperties": true
							}
						] }
					},
					sourceLocation: {
						"file": "packages/dsh-acp-adapter/src/remote/service.ts",
						"line": 1340,
						"column": 9
					}
				},
				"dshAcp/boundSessions": {
					service: "dshAcp",
					description: "boundSessions（删除确认提示）：该 profile（按 agent id）当前被多少个 既有 DSH 会话的 sidecar binding 引用——删除 profile 后这些会话显示 backend-unavailable，面板在确认文案中如实预告。纯读零副作用；agent id 非法或未接线一律 throw（不冒充 0）。",
					invocation: { kind: "direct" },
					parameters: [{
						name: "agentId",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@zaimokuza/dsh-acp-adapter#dshAcp/boundSessions:agentId",
							create: _zaimokuza_dsh_acp_adapter_dshAcp_boundSessions_parameter_0$schema,
							jsonSchema: { "type": "string" }
						},
						strictCodec: {
							mode: "strict",
							typeSymbol: "@zaimokuza/dsh-acp-adapter#dshAcp/boundSessions:agentId",
							create: _zaimokuza_dsh_acp_adapter_dshAcp_boundSessions_parameter_0_strict$schema,
							jsonSchema: { "type": "string" }
						}
					}],
					result: {
						mode: "strict",
						typeSymbol: "@zaimokuza/dsh-acp-adapter/client#AcpBoundSessionsView",
						create: _zaimokuza_dsh_acp_adapter_dshAcp_boundSessions_result$schema,
						jsonSchema: {
							"type": "object",
							"properties": {
								"agentId": { "type": "string" },
								"count": { "type": "number" }
							},
							"required": ["agentId", "count"],
							"additionalProperties": true
						}
					},
					sourceLocation: {
						"file": "packages/dsh-acp-adapter/src/remote/service.ts",
						"line": 1379,
						"column": 9
					}
				},
				"dshAcp/health": {
					service: "dshAcp",
					description: "全部 provider 的健康行（executable/version/probe 快照收窄透传 + 五态 `state`）+ 沙箱/指标/活体会话连续性事实。`request.recheck === true` 时重探： `agentId` 在场只检查并返回该 provider，缺席检查并返回全部。这样卡片操作 不会为无关 Agent 运行 executable/version/protocol probe；缺省只读缓存视图 （面板打开不 spawn probe）。",
					invocation: { kind: "direct" },
					parameters: [{
						name: "request",
						source: "json",
						acceptsUndefined: true,
						codec: {
							mode: "strict",
							typeSymbol: "@zaimokuza/dsh-acp-adapter/client#AcpHealthRequest",
							create: _zaimokuza_dsh_acp_adapter_dshAcp_health_parameter_0$schema,
							jsonSchema: {
								"type": "object",
								"properties": {
									"recheck": { "type": "boolean" },
									"agentId": { "type": "string" }
								},
								"required": [],
								"additionalProperties": true
							}
						},
						strictCodec: {
							mode: "strict",
							typeSymbol: "@zaimokuza/dsh-acp-adapter/client#AcpHealthRequest",
							create: _zaimokuza_dsh_acp_adapter_dshAcp_health_parameter_0_strict$schema,
							jsonSchema: {
								"type": "object",
								"properties": {
									"recheck": { "type": "boolean" },
									"agentId": { "type": "string" }
								},
								"required": [],
								"additionalProperties": false
							}
						}
					}],
					result: {
						mode: "strict",
						typeSymbol: "@zaimokuza/dsh-acp-adapter/client#AcpHealthView",
						create: _zaimokuza_dsh_acp_adapter_dshAcp_health_result$schema,
						jsonSchema: {
							"type": "object",
							"properties": {
								"providers": {
									"type": "array",
									"items": {
										"type": "object",
										"properties": {
											"id": { "type": "string" },
											"name": { "type": "string" },
											"command": { "type": "string" },
											"args": {
												"type": "array",
												"items": { "type": "string" }
											},
											"loginHint": {
												"oneOf": [{
													"type": "null",
													"const": null
												}, { "type": "string" }],
												"description": "Panel login guidance；provider 配置未带时为 null。"
											},
											"executable": {
												"type": "boolean",
												"description": "`command -v` 等价物：PATH（或路径直给）上存在可执行文件。"
											},
											"version": {
												"oneOf": [{
													"type": "null",
													"const": null
												}, { "type": "string" }],
												"description": "`<command> --version` 首行（尽力而为）；超时/失败/跳过时为 null。"
											},
											"state": {
												"type": "string",
												"enum": [
													"saved-unverified",
													"ready",
													"auth-required",
													"unavailable",
													"incompatible"
												],
												"description": "五态状态（派生规则见 src/domain/session/agent-state.ts）。"
											},
											"probe": {
												"oneOf": [
													{
														"type": "object",
														"properties": {
															"status": {
																"type": "string",
																"const": "never"
															},
															"at": {
																"type": "null",
																"const": null
															}
														},
														"required": ["status", "at"],
														"additionalProperties": true
													},
													{
														"type": "object",
														"properties": {
															"status": {
																"type": "string",
																"const": "ok"
															},
															"at": { "type": "number" },
															"modelCount": { "type": "number" },
															"authMethods": { "oneOf": [{
																"type": "null",
																"const": null
															}, {
																"type": "array",
																"items": {
																	"type": "object",
																	"properties": {
																		"id": { "type": "string" },
																		"name": { "type": "string" },
																		"description": { "oneOf": [{
																			"type": "null",
																			"const": null
																		}, { "type": "string" }] }
																	},
																	"required": ["id", "name"],
																	"additionalProperties": true
																}
															}] },
															"agentInfo": { "oneOf": [{
																"type": "null",
																"const": null
															}, {
																"type": "object",
																"properties": {
																	"name": { "type": "string" },
																	"version": { "type": "string" }
																},
																"required": ["name", "version"],
																"additionalProperties": true
															}] },
															"capabilities": { "oneOf": [{
																"type": "null",
																"const": null
															}, {
																"type": "object",
																"properties": {
																	"loadSession": {
																		"type": "boolean",
																		"description": "`session/load`（重启后恢复 ACP 上下文的前提）。"
																	},
																	"sessionList": {
																		"type": "boolean",
																		"description": "`session/list`（恢复前查重/列会话）。"
																	},
																	"sessionClose": {
																		"type": "boolean",
																		"description": "`session/close`（probe/会话清理的「释放资源」步）。"
																	},
																	"sessionDelete": {
																		"type": "boolean",
																		"description": "`session/delete`（probe/会话清理的「移出 session/list」步）。"
																	},
																	"promptImage": {
																		"type": "boolean",
																		"description": "prompt 可携带图片。"
																	},
																	"promptAudio": {
																		"type": "boolean",
																		"description": "prompt 可携带音频。"
																	},
																	"promptEmbeddedContext": {
																		"type": "boolean",
																		"description": "prompt 可携带嵌入上下文（Resource 块）。"
																	},
																	"mcpHttp": {
																		"type": "boolean",
																		"description": "MCP over HTTP。"
																	},
																	"mcpSse": {
																		"type": "boolean",
																		"description": "MCP over SSE。"
																	}
																},
																"required": [
																	"loadSession",
																	"sessionList",
																	"sessionClose",
																	"sessionDelete",
																	"promptImage",
																	"promptAudio",
																	"promptEmbeddedContext",
																	"mcpHttp",
																	"mcpSse"
																],
																"additionalProperties": true
															}] },
															"cleanup": { "oneOf": [{
																"type": "null",
																"const": null
															}, {
																"type": "object",
																"properties": {
																	"close": {
																		"type": "string",
																		"enum": [
																			"failed",
																			"done",
																			"not-advertised"
																		]
																	},
																	"delete": {
																		"type": "string",
																		"enum": [
																			"failed",
																			"done",
																			"not-advertised"
																		]
																	},
																	"message": { "oneOf": [{
																		"type": "null",
																		"const": null
																	}, { "type": "string" }] }
																},
																"required": [
																	"close",
																	"delete",
																	"message"
																],
																"additionalProperties": true
															}] },
															"capabilityHash": { "oneOf": [{
																"type": "null",
																"const": null
															}, { "type": "string" }] },
															"protocolVersion": {
																"oneOf": [{
																	"type": "null",
																	"const": null
																}, { "type": "number" }],
																"description": "readiness：initialize 协商的 ACP 协议版本（probe 缓存条目早于 本特性/握手未给出时归 null，不编造）。"
															},
															"versionCompatibility": {
																"oneOf": [{
																	"type": "null",
																	"const": null
																}, {
																	"type": "string",
																	"enum": [
																		"current",
																		"different",
																		"unknown"
																	]
																}],
																"description": "兼容状态（agent-config.ts `acpVersionCompatibility` 直通，比对握手 agentInfo.version 与 registry 快照的上游版本）：无版本参考或握手无 版本 → null；快照无该 agent 版本 → 'unknown'；握手版本等于参考 → 'current'；不等 → 'different'（不阻断，仅如实展示）。"
															},
															"matrix": {
																"type": "array",
																"items": {
																	"type": "object",
																	"properties": {
																		"id": { "type": "string" },
																		"advertised": { "oneOf": [{
																			"type": "null",
																			"const": null
																		}, {
																			"type": "boolean",
																			"enum": [false, true]
																		}] },
																		"adapterPath": { "type": "string" },
																		"hostSeam": { "oneOf": [{
																			"type": "null",
																			"const": null
																		}, { "type": "string" }] },
																		"status": {
																			"type": "string",
																			"enum": [
																				"supported",
																				"degraded",
																				"unsupported"
																			]
																		},
																		"note": { "type": "string" }
																	},
																	"required": [
																		"id",
																		"advertised",
																		"adapterPath",
																		"hostSeam",
																		"status"
																	],
																	"additionalProperties": true
																},
																"description": "端到端能力矩阵：host 侧由 capabilities（广告事实） × adapter path 计算（src/domain/policy/ capability-matrix.ts）；capabilities 为 null 时矩阵照常下发（广告列 全 null）。UI 只许展示本矩阵的交集结论，不再直译广告布尔。"
															}
														},
														"required": [
															"status",
															"at",
															"modelCount",
															"authMethods",
															"agentInfo",
															"capabilities",
															"cleanup",
															"capabilityHash",
															"protocolVersion",
															"versionCompatibility",
															"matrix"
														],
														"additionalProperties": true
													},
													{
														"type": "object",
														"properties": {
															"status": {
																"type": "string",
																"const": "error"
															},
															"at": { "type": "number" },
															"failureKind": { "type": "string" },
															"message": { "type": "string" },
															"phase": { "oneOf": [{
																"type": "null",
																"const": null
															}, {
																"type": "string",
																"enum": ["initialize", "session"]
															}] }
														},
														"required": [
															"status",
															"at",
															"failureKind",
															"message",
															"phase"
														],
														"additionalProperties": true
													}
												],
												"description": "上次 probe 快照（llm-stub 缓存；首次目录构建前为 'never'）。成功分支携带 authMethods（收窄后）、agentInfo/capabilities（initialize 握手实际值）、 cleanup（清理事实）与 capabilityHash（握手能力的 sha256-16， 缺失归 null——条目早于本特性时如实为空，不编造）；失败分支携带 phase （probe 失败阶段；未标记归 null）。"
											}
										},
										"required": [
											"id",
											"name",
											"command",
											"args",
											"loginHint",
											"executable",
											"version",
											"state",
											"probe"
										],
										"additionalProperties": true
									}
								},
								"liveSessions": {
									"oneOf": [{
										"type": "null",
										"const": null
									}, {
										"type": "array",
										"items": {
											"type": "object",
											"properties": {
												"sessionId": { "type": "string" },
												"continuity": {
													"type": "object",
													"properties": {
														"status": {
															"type": "string",
															"enum": ["ok", "blocked"]
														},
														"cause": { "oneOf": [{
															"type": "null",
															"const": null
														}, { "type": "string" }] },
														"detail": { "oneOf": [{
															"type": "null",
															"const": null
														}, { "type": "string" }] }
													},
													"required": [
														"status",
														"cause",
														"detail"
													],
													"additionalProperties": true
												}
											},
											"required": ["sessionId", "continuity"],
											"additionalProperties": true
										}
									}],
									"description": "活体 ACP 会话的连续性清单（未接线/无活体会话归 null 或空数组，如实区分）。"
								}
							},
							"required": ["providers", "liveSessions"],
							"additionalProperties": true
						}
					},
					sourceLocation: {
						"file": "packages/dsh-acp-adapter/src/remote/service.ts",
						"line": 983,
						"column": 9
					}
				},
				"dshAcp/ownedProviderRoutes": {
					service: "dshAcp",
					description: "Exact ownership proof consumed by additive client observers. Historical routes remain owned after profile removal so old Activity still renders; an unrelated plugin merely using the `acp-` prefix is never claimed.",
					invocation: { kind: "direct" },
					parameters: [],
					result: {
						mode: "strict",
						typeSymbol: "@zaimokuza/dsh-acp-adapter/client#AcpOwnedRoutesView",
						create: _zaimokuza_dsh_acp_adapter_dshAcp_ownedProviderRoutes_result$schema,
						jsonSchema: {
							"type": "object",
							"properties": { "providers": {
								"type": "array",
								"items": { "type": "string" }
							} },
							"required": ["providers"],
							"additionalProperties": true
						}
					},
					sourceLocation: {
						"file": "packages/dsh-acp-adapter/src/remote/service.ts",
						"line": 944,
						"column": 9
					}
				},
				"dshAcp/projectedSubagentIds": {
					service: "dshAcp",
					invocation: { kind: "direct" },
					parameters: [],
					result: {
						mode: "strict",
						typeSymbol: "@zaimokuza/dsh-acp-adapter/client#AcpProjectedSubagentsView",
						create: _zaimokuza_dsh_acp_adapter_dshAcp_projectedSubagentIds_result$schema,
						jsonSchema: {
							"type": "object",
							"properties": { "sessionIds": {
								"type": "array",
								"items": { "type": "string" }
							} },
							"required": ["sessionIds"],
							"additionalProperties": true
						}
					},
					sourceLocation: {
						"file": "packages/dsh-acp-adapter/src/remote/service.ts",
						"line": 956,
						"column": 9
					}
				},
				"dshAcp/rebindRecoveryBlank": {
					service: "dshAcp",
					description: "Rebind a blank ACP context and return recovery state without requiring an option snapshot.",
					invocation: { kind: "direct" },
					parameters: [{
						name: "sessionId",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@zaimokuza/dsh-acp-adapter#dshAcp/rebindRecoveryBlank:sessionId",
							create: _zaimokuza_dsh_acp_adapter_dshAcp_rebindRecoveryBlank_parameter_0$schema,
							jsonSchema: { "type": "string" }
						},
						strictCodec: {
							mode: "strict",
							typeSymbol: "@zaimokuza/dsh-acp-adapter#dshAcp/rebindRecoveryBlank:sessionId",
							create: _zaimokuza_dsh_acp_adapter_dshAcp_rebindRecoveryBlank_parameter_0_strict$schema,
							jsonSchema: { "type": "string" }
						}
					}],
					result: {
						mode: "strict",
						typeSymbol: "@zaimokuza/dsh-acp-adapter/client#AcpRecoveryView",
						create: _zaimokuza_dsh_acp_adapter_dshAcp_rebindRecoveryBlank_result$schema,
						jsonSchema: {
							"type": "object",
							"properties": {
								"dshSessionId": { "type": "string" },
								"kind": {
									"type": "string",
									"enum": [
										"healthy",
										"reconnect-required",
										"outcome-unknown",
										"reconciliation-required",
										"session-lost",
										"local-history-damaged",
										"resumed-unverified"
									]
								},
								"localStatus": {
									"type": "string",
									"enum": [
										"finishing-tools",
										"saving-results",
										"storage-error"
									],
									"description": "Volatile local settlement progress; omitted for stable recovery states."
								},
								"cause": { "oneOf": [{
									"type": "null",
									"const": null
								}, { "type": "string" }] },
								"detail": { "oneOf": [{
									"type": "null",
									"const": null
								}, { "type": "string" }] },
								"provider": { "oneOf": [{
									"type": "null",
									"const": null
								}, { "type": "string" }] },
								"acpSessionId": { "oneOf": [{
									"type": "null",
									"const": null
								}, { "type": "string" }] },
								"generation": { "oneOf": [{
									"type": "null",
									"const": null
								}, { "type": "number" }] },
								"interruptedTurnId": { "oneOf": [{
									"type": "null",
									"const": null
								}, { "type": "string" }] },
								"lastAttemptAt": { "oneOf": [{
									"type": "null",
									"const": null
								}, { "type": "number" }] },
								"lastUserAction": { "oneOf": [{
									"type": "null",
									"const": null
								}, { "type": "string" }] },
								"updatedAt": { "type": "number" }
							},
							"required": [
								"dshSessionId",
								"kind",
								"cause",
								"detail",
								"provider",
								"acpSessionId",
								"generation",
								"interruptedTurnId",
								"lastAttemptAt",
								"lastUserAction",
								"updatedAt"
							],
							"additionalProperties": true
						}
					},
					sourceLocation: {
						"file": "packages/dsh-acp-adapter/src/remote/service.ts",
						"line": 1330,
						"column": 9
					}
				},
				"dshAcp/recoveryFollow": {
					service: "dshAcp",
					description: "Subscribe before reading volatile and durable recovery facts; reads stay side-effect-free.",
					mode: "stream",
					invocation: { kind: "direct" },
					parameters: [{
						name: "sessionId",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@zaimokuza/dsh-acp-adapter#dshAcp/recoveryFollow:sessionId",
							create: _zaimokuza_dsh_acp_adapter_dshAcp_recoveryFollow_parameter_0$schema,
							jsonSchema: { "type": "string" }
						},
						strictCodec: {
							mode: "strict",
							typeSymbol: "@zaimokuza/dsh-acp-adapter#dshAcp/recoveryFollow:sessionId",
							create: _zaimokuza_dsh_acp_adapter_dshAcp_recoveryFollow_parameter_0_strict$schema,
							jsonSchema: { "type": "string" }
						}
					}],
					cancellation: { parameter: "signal" },
					result: {
						mode: "strict",
						typeSymbol: "@zaimokuza/dsh-acp-adapter/client#AcpRecoveryFrame",
						create: _zaimokuza_dsh_acp_adapter_dshAcp_recoveryFollow_result$schema,
						jsonSchema: { "oneOf": [{
							"type": "object",
							"properties": {
								"type": {
									"type": "string",
									"const": "opened"
								},
								"snapshot": {
									"type": "object",
									"properties": {
										"dshSessionId": { "type": "string" },
										"kind": {
											"type": "string",
											"enum": [
												"healthy",
												"reconnect-required",
												"outcome-unknown",
												"reconciliation-required",
												"session-lost",
												"local-history-damaged",
												"resumed-unverified"
											]
										},
										"localStatus": {
											"type": "string",
											"enum": [
												"finishing-tools",
												"saving-results",
												"storage-error"
											],
											"description": "Volatile local settlement progress; omitted for stable recovery states."
										},
										"cause": { "oneOf": [{
											"type": "null",
											"const": null
										}, { "type": "string" }] },
										"detail": { "oneOf": [{
											"type": "null",
											"const": null
										}, { "type": "string" }] },
										"provider": { "oneOf": [{
											"type": "null",
											"const": null
										}, { "type": "string" }] },
										"acpSessionId": { "oneOf": [{
											"type": "null",
											"const": null
										}, { "type": "string" }] },
										"generation": { "oneOf": [{
											"type": "null",
											"const": null
										}, { "type": "number" }] },
										"interruptedTurnId": { "oneOf": [{
											"type": "null",
											"const": null
										}, { "type": "string" }] },
										"lastAttemptAt": { "oneOf": [{
											"type": "null",
											"const": null
										}, { "type": "number" }] },
										"lastUserAction": { "oneOf": [{
											"type": "null",
											"const": null
										}, { "type": "string" }] },
										"updatedAt": { "type": "number" }
									},
									"required": [
										"dshSessionId",
										"kind",
										"cause",
										"detail",
										"provider",
										"acpSessionId",
										"generation",
										"interruptedTurnId",
										"lastAttemptAt",
										"lastUserAction",
										"updatedAt"
									],
									"additionalProperties": true
								}
							},
							"required": ["type", "snapshot"],
							"additionalProperties": true
						}, {
							"type": "object",
							"properties": {
								"type": {
									"type": "string",
									"const": "changed"
								},
								"snapshot": {
									"type": "object",
									"properties": {
										"dshSessionId": { "type": "string" },
										"kind": {
											"type": "string",
											"enum": [
												"healthy",
												"reconnect-required",
												"outcome-unknown",
												"reconciliation-required",
												"session-lost",
												"local-history-damaged",
												"resumed-unverified"
											]
										},
										"localStatus": {
											"type": "string",
											"enum": [
												"finishing-tools",
												"saving-results",
												"storage-error"
											],
											"description": "Volatile local settlement progress; omitted for stable recovery states."
										},
										"cause": { "oneOf": [{
											"type": "null",
											"const": null
										}, { "type": "string" }] },
										"detail": { "oneOf": [{
											"type": "null",
											"const": null
										}, { "type": "string" }] },
										"provider": { "oneOf": [{
											"type": "null",
											"const": null
										}, { "type": "string" }] },
										"acpSessionId": { "oneOf": [{
											"type": "null",
											"const": null
										}, { "type": "string" }] },
										"generation": { "oneOf": [{
											"type": "null",
											"const": null
										}, { "type": "number" }] },
										"interruptedTurnId": { "oneOf": [{
											"type": "null",
											"const": null
										}, { "type": "string" }] },
										"lastAttemptAt": { "oneOf": [{
											"type": "null",
											"const": null
										}, { "type": "number" }] },
										"lastUserAction": { "oneOf": [{
											"type": "null",
											"const": null
										}, { "type": "string" }] },
										"updatedAt": { "type": "number" }
									},
									"required": [
										"dshSessionId",
										"kind",
										"cause",
										"detail",
										"provider",
										"acpSessionId",
										"generation",
										"interruptedTurnId",
										"lastAttemptAt",
										"lastUserAction",
										"updatedAt"
									],
									"additionalProperties": true
								}
							},
							"required": ["type", "snapshot"],
							"additionalProperties": true
						}] }
					},
					sourceLocation: {
						"file": "packages/dsh-acp-adapter/src/remote/service.ts",
						"line": 1251,
						"column": 10
					}
				},
				"dshAcp/recoverySnapshot": {
					service: "dshAcp",
					description: "Read Host-owned recovery facts, including its durable store and in-memory fallback.",
					invocation: { kind: "direct" },
					parameters: [{
						name: "sessionId",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@zaimokuza/dsh-acp-adapter#dshAcp/recoverySnapshot:sessionId",
							create: _zaimokuza_dsh_acp_adapter_dshAcp_recoverySnapshot_parameter_0$schema,
							jsonSchema: { "type": "string" }
						},
						strictCodec: {
							mode: "strict",
							typeSymbol: "@zaimokuza/dsh-acp-adapter#dshAcp/recoverySnapshot:sessionId",
							create: _zaimokuza_dsh_acp_adapter_dshAcp_recoverySnapshot_parameter_0_strict$schema,
							jsonSchema: { "type": "string" }
						}
					}],
					result: {
						mode: "strict",
						typeSymbol: "@zaimokuza/dsh-acp-adapter/client#AcpRecoveryView",
						create: _zaimokuza_dsh_acp_adapter_dshAcp_recoverySnapshot_result$schema,
						jsonSchema: {
							"type": "object",
							"properties": {
								"dshSessionId": { "type": "string" },
								"kind": {
									"type": "string",
									"enum": [
										"healthy",
										"reconnect-required",
										"outcome-unknown",
										"reconciliation-required",
										"session-lost",
										"local-history-damaged",
										"resumed-unverified"
									]
								},
								"localStatus": {
									"type": "string",
									"enum": [
										"finishing-tools",
										"saving-results",
										"storage-error"
									],
									"description": "Volatile local settlement progress; omitted for stable recovery states."
								},
								"cause": { "oneOf": [{
									"type": "null",
									"const": null
								}, { "type": "string" }] },
								"detail": { "oneOf": [{
									"type": "null",
									"const": null
								}, { "type": "string" }] },
								"provider": { "oneOf": [{
									"type": "null",
									"const": null
								}, { "type": "string" }] },
								"acpSessionId": { "oneOf": [{
									"type": "null",
									"const": null
								}, { "type": "string" }] },
								"generation": { "oneOf": [{
									"type": "null",
									"const": null
								}, { "type": "number" }] },
								"interruptedTurnId": { "oneOf": [{
									"type": "null",
									"const": null
								}, { "type": "string" }] },
								"lastAttemptAt": { "oneOf": [{
									"type": "null",
									"const": null
								}, { "type": "number" }] },
								"lastUserAction": { "oneOf": [{
									"type": "null",
									"const": null
								}, { "type": "string" }] },
								"updatedAt": { "type": "number" }
							},
							"required": [
								"dshSessionId",
								"kind",
								"cause",
								"detail",
								"provider",
								"acpSessionId",
								"generation",
								"interruptedTurnId",
								"lastAttemptAt",
								"lastUserAction",
								"updatedAt"
							],
							"additionalProperties": true
						}
					},
					sourceLocation: {
						"file": "packages/dsh-acp-adapter/src/remote/service.ts",
						"line": 1238,
						"column": 9
					}
				},
				"dshAcp/retryOriginal": {
					service: "dshAcp",
					description: "Retry the original durable Agent binding; never resends the interrupted prompt.",
					invocation: { kind: "direct" },
					parameters: [{
						name: "sessionId",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@zaimokuza/dsh-acp-adapter#dshAcp/retryOriginal:sessionId",
							create: _zaimokuza_dsh_acp_adapter_dshAcp_retryOriginal_parameter_0$schema,
							jsonSchema: { "type": "string" }
						},
						strictCodec: {
							mode: "strict",
							typeSymbol: "@zaimokuza/dsh-acp-adapter#dshAcp/retryOriginal:sessionId",
							create: _zaimokuza_dsh_acp_adapter_dshAcp_retryOriginal_parameter_0_strict$schema,
							jsonSchema: { "type": "string" }
						}
					}],
					result: {
						mode: "strict",
						typeSymbol: "@zaimokuza/dsh-acp-adapter/client#AcpRecoveryView",
						create: _zaimokuza_dsh_acp_adapter_dshAcp_retryOriginal_result$schema,
						jsonSchema: {
							"type": "object",
							"properties": {
								"dshSessionId": { "type": "string" },
								"kind": {
									"type": "string",
									"enum": [
										"healthy",
										"reconnect-required",
										"outcome-unknown",
										"reconciliation-required",
										"session-lost",
										"local-history-damaged",
										"resumed-unverified"
									]
								},
								"localStatus": {
									"type": "string",
									"enum": [
										"finishing-tools",
										"saving-results",
										"storage-error"
									],
									"description": "Volatile local settlement progress; omitted for stable recovery states."
								},
								"cause": { "oneOf": [{
									"type": "null",
									"const": null
								}, { "type": "string" }] },
								"detail": { "oneOf": [{
									"type": "null",
									"const": null
								}, { "type": "string" }] },
								"provider": { "oneOf": [{
									"type": "null",
									"const": null
								}, { "type": "string" }] },
								"acpSessionId": { "oneOf": [{
									"type": "null",
									"const": null
								}, { "type": "string" }] },
								"generation": { "oneOf": [{
									"type": "null",
									"const": null
								}, { "type": "number" }] },
								"interruptedTurnId": { "oneOf": [{
									"type": "null",
									"const": null
								}, { "type": "string" }] },
								"lastAttemptAt": { "oneOf": [{
									"type": "null",
									"const": null
								}, { "type": "number" }] },
								"lastUserAction": { "oneOf": [{
									"type": "null",
									"const": null
								}, { "type": "string" }] },
								"updatedAt": { "type": "number" }
							},
							"required": [
								"dshSessionId",
								"kind",
								"cause",
								"detail",
								"provider",
								"acpSessionId",
								"generation",
								"interruptedTurnId",
								"lastAttemptAt",
								"lastUserAction",
								"updatedAt"
							],
							"additionalProperties": true
						}
					},
					sourceLocation: {
						"file": "packages/dsh-acp-adapter/src/remote/service.ts",
						"line": 1324,
						"column": 9
					}
				},
				"dshAcp/setAgentSessionOption": {
					service: "dshAcp",
					invocation: { kind: "direct" },
					parameters: [{
						name: "sessionId",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@zaimokuza/dsh-acp-adapter#dshAcp/setAgentSessionOption:sessionId",
							create: _zaimokuza_dsh_acp_adapter_dshAcp_setAgentSessionOption_parameter_0$schema,
							jsonSchema: { "type": "string" }
						},
						strictCodec: {
							mode: "strict",
							typeSymbol: "@zaimokuza/dsh-acp-adapter#dshAcp/setAgentSessionOption:sessionId",
							create: _zaimokuza_dsh_acp_adapter_dshAcp_setAgentSessionOption_parameter_0_strict$schema,
							jsonSchema: { "type": "string" }
						}
					}, {
						name: "request",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@zaimokuza/dsh-acp-adapter/client#AcpAgentSessionOptionWrite",
							create: _zaimokuza_dsh_acp_adapter_dshAcp_setAgentSessionOption_parameter_1$schema,
							jsonSchema: { "oneOf": [{
								"type": "object",
								"properties": {
									"kind": {
										"type": "string",
										"const": "config"
									},
									"id": { "type": "string" },
									"value": { "oneOf": [{ "type": "string" }, {
										"type": "boolean",
										"enum": [false, true]
									}] }
								},
								"required": [
									"kind",
									"id",
									"value"
								],
								"additionalProperties": true
							}, {
								"type": "object",
								"properties": {
									"kind": {
										"type": "string",
										"const": "mode"
									},
									"id": { "type": "string" }
								},
								"required": ["kind", "id"],
								"additionalProperties": true
							}] }
						},
						strictCodec: {
							mode: "strict",
							typeSymbol: "@zaimokuza/dsh-acp-adapter/client#AcpAgentSessionOptionWrite",
							create: _zaimokuza_dsh_acp_adapter_dshAcp_setAgentSessionOption_parameter_1_strict$schema,
							jsonSchema: { "oneOf": [{
								"type": "object",
								"properties": {
									"kind": {
										"type": "string",
										"const": "config"
									},
									"id": { "type": "string" },
									"value": { "oneOf": [{ "type": "string" }, {
										"type": "boolean",
										"enum": [false, true]
									}] }
								},
								"required": [
									"kind",
									"id",
									"value"
								],
								"additionalProperties": false
							}, {
								"type": "object",
								"properties": {
									"kind": {
										"type": "string",
										"const": "mode"
									},
									"id": { "type": "string" }
								},
								"required": ["kind", "id"],
								"additionalProperties": false
							}] }
						}
					}],
					result: {
						mode: "strict",
						typeSymbol: "@zaimokuza/dsh-acp-adapter/client#AcpAgentSessionSnapshotView",
						create: _zaimokuza_dsh_acp_adapter_dshAcp_setAgentSessionOption_result$schema,
						jsonSchemaError: "typert tool schema: selected union branches overlap or have no required discriminator"
					},
					sourceLocation: {
						"file": "packages/dsh-acp-adapter/src/remote/service.ts",
						"line": 1140,
						"column": 9
					}
				},
				"dshAcp/setTeamMemberMode": {
					service: "dshAcp",
					invocation: { kind: "direct" },
					parameters: [
						{
							name: "lead",
							source: "json",
							codec: {
								mode: "strict",
								typeSymbol: "@zaimokuza/dsh-acp-adapter#dshAcp/setTeamMemberMode:lead",
								create: _zaimokuza_dsh_acp_adapter_dshAcp_setTeamMemberMode_parameter_0$schema,
								jsonSchema: { "type": "string" }
							},
							strictCodec: {
								mode: "strict",
								typeSymbol: "@zaimokuza/dsh-acp-adapter#dshAcp/setTeamMemberMode:lead",
								create: _zaimokuza_dsh_acp_adapter_dshAcp_setTeamMemberMode_parameter_0_strict$schema,
								jsonSchema: { "type": "string" }
							}
						},
						{
							name: "sessionId",
							source: "json",
							codec: {
								mode: "strict",
								typeSymbol: "@zaimokuza/dsh-acp-adapter#dshAcp/setTeamMemberMode:sessionId",
								create: _zaimokuza_dsh_acp_adapter_dshAcp_setTeamMemberMode_parameter_1$schema,
								jsonSchema: { "type": "string" }
							},
							strictCodec: {
								mode: "strict",
								typeSymbol: "@zaimokuza/dsh-acp-adapter#dshAcp/setTeamMemberMode:sessionId",
								create: _zaimokuza_dsh_acp_adapter_dshAcp_setTeamMemberMode_parameter_1_strict$schema,
								jsonSchema: { "type": "string" }
							}
						},
						{
							name: "modeId",
							source: "json",
							codec: {
								mode: "strict",
								typeSymbol: "@zaimokuza/dsh-acp-adapter#dshAcp/setTeamMemberMode:modeId",
								create: _zaimokuza_dsh_acp_adapter_dshAcp_setTeamMemberMode_parameter_2$schema,
								jsonSchema: { "type": "string" }
							},
							strictCodec: {
								mode: "strict",
								typeSymbol: "@zaimokuza/dsh-acp-adapter#dshAcp/setTeamMemberMode:modeId",
								create: _zaimokuza_dsh_acp_adapter_dshAcp_setTeamMemberMode_parameter_2_strict$schema,
								jsonSchema: { "type": "string" }
							}
						}
					],
					result: {
						mode: "strict",
						typeSymbol: "@zaimokuza/dsh-acp-adapter/client#AcpAgentSessionSnapshotView",
						create: _zaimokuza_dsh_acp_adapter_dshAcp_setTeamMemberMode_result$schema,
						jsonSchemaError: "typert tool schema: selected union branches overlap or have no required discriminator"
					},
					sourceLocation: {
						"file": "packages/dsh-acp-adapter/src/remote/service.ts",
						"line": 927,
						"column": 9
					}
				},
				"dshAcp/setTeamMemberModel": {
					service: "dshAcp",
					invocation: { kind: "direct" },
					parameters: [
						{
							name: "lead",
							source: "json",
							codec: {
								mode: "strict",
								typeSymbol: "@zaimokuza/dsh-acp-adapter#dshAcp/setTeamMemberModel:lead",
								create: _zaimokuza_dsh_acp_adapter_dshAcp_setTeamMemberModel_parameter_0$schema,
								jsonSchema: { "type": "string" }
							},
							strictCodec: {
								mode: "strict",
								typeSymbol: "@zaimokuza/dsh-acp-adapter#dshAcp/setTeamMemberModel:lead",
								create: _zaimokuza_dsh_acp_adapter_dshAcp_setTeamMemberModel_parameter_0_strict$schema,
								jsonSchema: { "type": "string" }
							}
						},
						{
							name: "sessionId",
							source: "json",
							codec: {
								mode: "strict",
								typeSymbol: "@zaimokuza/dsh-acp-adapter#dshAcp/setTeamMemberModel:sessionId",
								create: _zaimokuza_dsh_acp_adapter_dshAcp_setTeamMemberModel_parameter_1$schema,
								jsonSchema: { "type": "string" }
							},
							strictCodec: {
								mode: "strict",
								typeSymbol: "@zaimokuza/dsh-acp-adapter#dshAcp/setTeamMemberModel:sessionId",
								create: _zaimokuza_dsh_acp_adapter_dshAcp_setTeamMemberModel_parameter_1_strict$schema,
								jsonSchema: { "type": "string" }
							}
						},
						{
							name: "model",
							source: "json",
							codec: {
								mode: "strict",
								typeSymbol: "@zaimokuza/dsh-acp-adapter#dshAcp/setTeamMemberModel:model",
								create: _zaimokuza_dsh_acp_adapter_dshAcp_setTeamMemberModel_parameter_2$schema,
								jsonSchema: { "type": "string" }
							},
							strictCodec: {
								mode: "strict",
								typeSymbol: "@zaimokuza/dsh-acp-adapter#dshAcp/setTeamMemberModel:model",
								create: _zaimokuza_dsh_acp_adapter_dshAcp_setTeamMemberModel_parameter_2_strict$schema,
								jsonSchema: { "type": "string" }
							}
						}
					],
					result: {
						mode: "strict",
						typeSymbol: "@zaimokuza/dsh-acp-adapter/client#AcpTeamMemberModelsView",
						create: _zaimokuza_dsh_acp_adapter_dshAcp_setTeamMemberModel_result$schema,
						jsonSchema: {
							"type": "object",
							"properties": {
								"currentModel": { "oneOf": [{
									"type": "null",
									"const": null
								}, { "type": "string" }] },
								"pendingModel": { "oneOf": [{
									"type": "null",
									"const": null
								}, { "type": "string" }] },
								"models": {
									"type": "array",
									"items": {
										"type": "object",
										"properties": {
											"id": { "type": "string" },
											"name": { "type": "string" }
										},
										"required": ["id", "name"],
										"additionalProperties": true
									}
								},
								"writable": { "type": "boolean" }
							},
							"required": [
								"currentModel",
								"pendingModel",
								"models",
								"writable"
							],
							"additionalProperties": true
						}
					},
					sourceLocation: {
						"file": "packages/dsh-acp-adapter/src/remote/service.ts",
						"line": 917,
						"column": 9
					}
				},
				"dshAcp/setToolApprovalPolicy": {
					service: "dshAcp",
					invocation: { kind: "direct" },
					parameters: [{
						name: "sessionId",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@zaimokuza/dsh-acp-adapter#dshAcp/setToolApprovalPolicy:sessionId",
							create: _zaimokuza_dsh_acp_adapter_dshAcp_setToolApprovalPolicy_parameter_0$schema,
							jsonSchema: { "type": "string" }
						},
						strictCodec: {
							mode: "strict",
							typeSymbol: "@zaimokuza/dsh-acp-adapter#dshAcp/setToolApprovalPolicy:sessionId",
							create: _zaimokuza_dsh_acp_adapter_dshAcp_setToolApprovalPolicy_parameter_0_strict$schema,
							jsonSchema: { "type": "string" }
						}
					}, {
						name: "request",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@zaimokuza/dsh-acp-adapter/client#AcpToolApprovalPolicyWrite",
							create: _zaimokuza_dsh_acp_adapter_dshAcp_setToolApprovalPolicy_parameter_1$schema,
							jsonSchema: {
								"type": "object",
								"properties": { "policy": {
									"type": "string",
									"enum": ["auto", "ask"]
								} },
								"required": ["policy"],
								"additionalProperties": true
							}
						},
						strictCodec: {
							mode: "strict",
							typeSymbol: "@zaimokuza/dsh-acp-adapter/client#AcpToolApprovalPolicyWrite",
							create: _zaimokuza_dsh_acp_adapter_dshAcp_setToolApprovalPolicy_parameter_1_strict$schema,
							jsonSchema: {
								"type": "object",
								"properties": { "policy": {
									"type": "string",
									"enum": ["auto", "ask"]
								} },
								"required": ["policy"],
								"additionalProperties": false
							}
						}
					}],
					result: {
						mode: "strict",
						typeSymbol: "@zaimokuza/dsh-acp-adapter/client#AcpToolApprovalPolicySnapshot",
						create: _zaimokuza_dsh_acp_adapter_dshAcp_setToolApprovalPolicy_result$schema,
						jsonSchema: {
							"type": "object",
							"properties": {
								"sessionId": { "type": "string" },
								"policy": {
									"type": "string",
									"enum": ["auto", "ask"]
								},
								"source": {
									"type": "string",
									"enum": ["session", "lead"]
								},
								"editable": { "type": "boolean" }
							},
							"required": [
								"sessionId",
								"policy",
								"source",
								"editable"
							],
							"additionalProperties": true
						}
					},
					sourceLocation: {
						"file": "packages/dsh-acp-adapter/src/remote/service.ts",
						"line": 1158,
						"column": 9
					}
				},
				"dshAcp/teamMemberModels": {
					service: "dshAcp",
					invocation: { kind: "direct" },
					parameters: [{
						name: "lead",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@zaimokuza/dsh-acp-adapter#dshAcp/teamMemberModels:lead",
							create: _zaimokuza_dsh_acp_adapter_dshAcp_teamMemberModels_parameter_0$schema,
							jsonSchema: { "type": "string" }
						},
						strictCodec: {
							mode: "strict",
							typeSymbol: "@zaimokuza/dsh-acp-adapter#dshAcp/teamMemberModels:lead",
							create: _zaimokuza_dsh_acp_adapter_dshAcp_teamMemberModels_parameter_0_strict$schema,
							jsonSchema: { "type": "string" }
						}
					}, {
						name: "sessionId",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@zaimokuza/dsh-acp-adapter#dshAcp/teamMemberModels:sessionId",
							create: _zaimokuza_dsh_acp_adapter_dshAcp_teamMemberModels_parameter_1$schema,
							jsonSchema: { "type": "string" }
						},
						strictCodec: {
							mode: "strict",
							typeSymbol: "@zaimokuza/dsh-acp-adapter#dshAcp/teamMemberModels:sessionId",
							create: _zaimokuza_dsh_acp_adapter_dshAcp_teamMemberModels_parameter_1_strict$schema,
							jsonSchema: { "type": "string" }
						}
					}],
					result: {
						mode: "strict",
						typeSymbol: "@zaimokuza/dsh-acp-adapter/client#AcpTeamMemberModelsView",
						create: _zaimokuza_dsh_acp_adapter_dshAcp_teamMemberModels_result$schema,
						jsonSchema: {
							"type": "object",
							"properties": {
								"currentModel": { "oneOf": [{
									"type": "null",
									"const": null
								}, { "type": "string" }] },
								"pendingModel": { "oneOf": [{
									"type": "null",
									"const": null
								}, { "type": "string" }] },
								"models": {
									"type": "array",
									"items": {
										"type": "object",
										"properties": {
											"id": { "type": "string" },
											"name": { "type": "string" }
										},
										"required": ["id", "name"],
										"additionalProperties": true
									}
								},
								"writable": { "type": "boolean" }
							},
							"required": [
								"currentModel",
								"pendingModel",
								"models",
								"writable"
							],
							"additionalProperties": true
						}
					},
					sourceLocation: {
						"file": "packages/dsh-acp-adapter/src/remote/service.ts",
						"line": 908,
						"column": 9
					}
				},
				"dshAcp/teamMembers": {
					service: "dshAcp",
					invocation: { kind: "direct" },
					parameters: [{
						name: "lead",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@zaimokuza/dsh-acp-adapter#dshAcp/teamMembers:lead",
							create: _zaimokuza_dsh_acp_adapter_dshAcp_teamMembers_parameter_0$schema,
							jsonSchema: { "type": "string" }
						},
						strictCodec: {
							mode: "strict",
							typeSymbol: "@zaimokuza/dsh-acp-adapter#dshAcp/teamMembers:lead",
							create: _zaimokuza_dsh_acp_adapter_dshAcp_teamMembers_parameter_0_strict$schema,
							jsonSchema: { "type": "string" }
						}
					}],
					result: {
						mode: "strict",
						typeSymbol: "@zaimokuza/dsh-acp-adapter#dshAcp/teamMembers:result",
						create: _zaimokuza_dsh_acp_adapter_dshAcp_teamMembers_result$schema,
						jsonSchema: {
							"type": "array",
							"items": {
								"type": "object",
								"properties": {
									"profileId": { "oneOf": [{
										"type": "null",
										"const": null
									}, { "type": "string" }] },
									"sessionId": { "type": "string" },
									"name": { "type": "string" },
									"status": {
										"type": "string",
										"enum": [
											"running",
											"failed",
											"inactive",
											"provisioning"
										]
									},
									"model": { "oneOf": [{
										"type": "null",
										"const": null
									}, { "type": "string" }] },
									"pendingModel": { "oneOf": [{
										"type": "null",
										"const": null
									}, { "type": "string" }] },
									"modelWritable": { "type": "boolean" },
									"description": { "oneOf": [{
										"type": "null",
										"const": null
									}, { "type": "string" }] }
								},
								"required": [
									"profileId",
									"sessionId",
									"name",
									"status",
									"model",
									"description"
								],
								"additionalProperties": true
							}
						}
					},
					sourceLocation: {
						"file": "packages/dsh-acp-adapter/src/remote/service.ts",
						"line": 886,
						"column": 9
					}
				},
				"dshAcp/toolApprovalPolicy": {
					service: "dshAcp",
					invocation: { kind: "direct" },
					parameters: [{
						name: "sessionId",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@zaimokuza/dsh-acp-adapter#dshAcp/toolApprovalPolicy:sessionId",
							create: _zaimokuza_dsh_acp_adapter_dshAcp_toolApprovalPolicy_parameter_0$schema,
							jsonSchema: { "type": "string" }
						},
						strictCodec: {
							mode: "strict",
							typeSymbol: "@zaimokuza/dsh-acp-adapter#dshAcp/toolApprovalPolicy:sessionId",
							create: _zaimokuza_dsh_acp_adapter_dshAcp_toolApprovalPolicy_parameter_0_strict$schema,
							jsonSchema: { "type": "string" }
						}
					}],
					result: {
						mode: "strict",
						typeSymbol: "@zaimokuza/dsh-acp-adapter/client#AcpToolApprovalPolicySnapshot",
						create: _zaimokuza_dsh_acp_adapter_dshAcp_toolApprovalPolicy_result$schema,
						jsonSchema: {
							"type": "object",
							"properties": {
								"sessionId": { "type": "string" },
								"policy": {
									"type": "string",
									"enum": ["auto", "ask"]
								},
								"source": {
									"type": "string",
									"enum": ["session", "lead"]
								},
								"editable": { "type": "boolean" }
							},
							"required": [
								"sessionId",
								"policy",
								"source",
								"editable"
							],
							"additionalProperties": true
						}
					},
					sourceLocation: {
						"file": "packages/dsh-acp-adapter/src/remote/service.ts",
						"line": 1150,
						"column": 9
					}
				},
				"dshAcp/toolApprovalPolicyFollow": {
					service: "dshAcp",
					mode: "stream",
					invocation: { kind: "direct" },
					parameters: [{
						name: "sessionId",
						source: "json",
						codec: {
							mode: "strict",
							typeSymbol: "@zaimokuza/dsh-acp-adapter#dshAcp/toolApprovalPolicyFollow:sessionId",
							create: _zaimokuza_dsh_acp_adapter_dshAcp_toolApprovalPolicyFollow_parameter_0$schema,
							jsonSchema: { "type": "string" }
						},
						strictCodec: {
							mode: "strict",
							typeSymbol: "@zaimokuza/dsh-acp-adapter#dshAcp/toolApprovalPolicyFollow:sessionId",
							create: _zaimokuza_dsh_acp_adapter_dshAcp_toolApprovalPolicyFollow_parameter_0_strict$schema,
							jsonSchema: { "type": "string" }
						}
					}],
					cancellation: { parameter: "signal" },
					result: {
						mode: "strict",
						typeSymbol: "@zaimokuza/dsh-acp-adapter/client#AcpToolApprovalPolicyFrame",
						create: _zaimokuza_dsh_acp_adapter_dshAcp_toolApprovalPolicyFollow_result$schema,
						jsonSchema: { "oneOf": [{
							"type": "object",
							"properties": {
								"type": {
									"type": "string",
									"const": "opened"
								},
								"snapshot": {
									"type": "object",
									"properties": {
										"sessionId": { "type": "string" },
										"policy": {
											"type": "string",
											"enum": ["auto", "ask"]
										},
										"source": {
											"type": "string",
											"enum": ["session", "lead"]
										},
										"editable": { "type": "boolean" }
									},
									"required": [
										"sessionId",
										"policy",
										"source",
										"editable"
									],
									"additionalProperties": true
								}
							},
							"required": ["type", "snapshot"],
							"additionalProperties": true
						}, {
							"type": "object",
							"properties": {
								"type": {
									"type": "string",
									"const": "changed"
								},
								"snapshot": {
									"type": "object",
									"properties": {
										"sessionId": { "type": "string" },
										"policy": {
											"type": "string",
											"enum": ["auto", "ask"]
										},
										"source": {
											"type": "string",
											"enum": ["session", "lead"]
										},
										"editable": { "type": "boolean" }
									},
									"required": [
										"sessionId",
										"policy",
										"source",
										"editable"
									],
									"additionalProperties": true
								}
							},
							"required": ["type", "snapshot"],
							"additionalProperties": true
						}] }
					},
					sourceLocation: {
						"file": "packages/dsh-acp-adapter/src/remote/service.ts",
						"line": 1173,
						"column": 10
					}
				}
			}
		}, zod.z);
		//#endregion
		//#region src/client/index.ts
		const inject = [
			"uiConversation",
			"slots",
			"locale",
			"remote",
			"remoteAccess",
			"sessions",
			"workspaces",
			"uiWorkspace",
			"sidebarRight",
			"configForms",
			"remote.settings",
			"remote.session"
		];
		/** Normalize ACP presentation facts and compose the registered native UI. */
		async function registerUi(ctx) {
			const acpRemote = ctx.remote.dshAcp;
			const sessionAccessSource = (sessionId, action) => {
				const access = ctx.get("remoteAccess");
				return typeof access?.source === "function" ? access.source("session", sessionId, action) : void 0;
			};
			const journalHub = new AcpActivityJournalHub(acpRemote, ctx.remote);
			const sessions = ctx.get("sessions");
			const workspaces = ctx.get("workspaces");
			const openProjectedChild = (parentSessionId, childSessionId) => {
				openSubagentAside(ctx.sidebarRight, {
					parentSessionId,
					childSessionId,
					mode: "one-shot"
				});
			};
			const settingsScope = ctx.configForms.get(ACP_SETTINGS_NS);
			const ownedRoutes = await acpRemote.ownedProviderRoutes().catch(() => void 0);
			const managedRoutes = new ManagedAcpRouteCatalog(settingsScope, ownedRoutes?.ok === true ? ownedRoutes.value.providers : []);
			const panelController = new AcpPanelController({
				scope: settingsScope,
				mutate: (ops, revision) => settingsScope.mutate(ops, revision),
				refusedMessage: () => ctx.locale.bind("settings.acp")("settingsWriteRefused"),
				remote: acpRemote
			});
			const feedback = new AcpUiFeedback();
			ctx.effect(() => followAcpQuestionLimitations((listener) => ctx.remote.$on("api-session/error", listener), feedback, (id) => {
				const summary = sessions.list.getSnapshot().byId[id];
				return summary?.title ?? summary?.displayTitle ?? null;
			}), "dsh-acp: child question limitation feedback");
			const jsonStringWrapping = createAcpJsonStringWrapping();
			const panelWire = {
				refreshHealth: (recheck) => {
					panelController.refreshHealth(recheck);
				},
				refreshAgentHealth: (agentId) => {
					panelController.refreshAgentHealth(agentId);
				},
				saveAgent: (editingId, draft) => panelController.saveAgent(editingId, draft),
				deleteAgent: (id) => panelController.deleteAgent(id),
				notifyOutcome: feedback.report,
				setToolApprovalDefault: (policy) => panelController.setToolApprovalDefault(policy),
				countBoundSessions: (id) => panelController.countBoundSessions(id)
			};
			const settingsT = ctx.locale.bind("settings.acp");
			ctx.uiConversation.events.register(createAcpEffectiveRouteDefinition());
			ctx.uiConversation.events.register(createAcpLiveActivityDefinition(managedRoutes.owns));
			ctx.uiConversation.events.register(acpPromptAnchorDefinition);
			ctx.uiConversation.events.register(createAcpActivityDefinition(managedRoutes.owns));
			ctx.effect(() => ctx.locale.register("acpActivity", {
				zh,
				en
			}), "dsh-acp: activity dictionaries");
			ctx.effect(() => ctx.locale.register("settings.acp", {
				zh,
				en
			}), "dsh-acp: settings dictionaries");
			ctx.slots.inject("conversation.composer", () => followExternalSubagentRecords(sessions.list, (records) => ctx.slots.register({
				name: "conversation.composer",
				priority: -11,
				select: (owner) => selectExternalSubagentRecord(owner, records),
				locale: "acpActivity"
			}, AcpExternalSubagentComposer)));
			ctx.slots.inject("conversation.composer", () => ctx.slots.register({
				name: "conversation.composer",
				priority: -1,
				select: ({ pendingInteraction }) => isAcpPermissionQuestion(pendingInteraction) ? pendingInteraction : null,
				locale: "acpActivity",
				store: createAcpPermissionQuestionStore
			}, AcpPermissionQuestion));
			ctx.effect(() => () => {
				panelController.dispose();
			}, "dsh-acp: settings controller");
			ctx.effect(() => () => {
				managedRoutes.dispose();
			}, "dsh-acp: managed route catalogue");
			ctx.slots.inject("plugins.bundle.config", () => ctx.slots.register({
				name: "plugins.bundle.config",
				key: "@zaimokuza/dsh-acp-adapter",
				locale: "settings.acp",
				store: createAcpPanelStore,
				inject: (actions) => {
					panelController.attach(actions);
					return { panel: panelWire };
				}
			}, AcpSection));
			let setAuditViewVisible = () => void 0;
			ctx.slots.inject("conversation.view", () => {
				let disposeView;
				let ownerSessionId;
				setAuditViewVisible = (sessionId, visible) => {
					if (!visible) {
						if (ownerSessionId !== sessionId) return;
						disposeView?.();
						disposeView = void 0;
						ownerSessionId = void 0;
						return;
					}
					if (ownerSessionId === sessionId && disposeView !== void 0) return;
					disposeView?.();
					ownerSessionId = sessionId;
					disposeView = ctx.slots.register({
						name: "conversation.view",
						id: "dsh-acp-audit",
						order: 20,
						label: () => settingsT("auditOpen"),
						locale: "acpActivity",
						inject: () => ({ remote: acpRemote })
					}, createAcpAuditView(acpRemote, jsonStringWrapping));
				};
				return () => {
					setAuditViewVisible = () => void 0;
					disposeView?.();
				};
			});
			ctx.slots.inject("conversation.session.header.utilities", () => ctx.slots.register({
				name: "conversation.session.header.utilities",
				id: "dsh-acp-audit-visibility",
				order: 100,
				inject: () => ({
					remote: acpRemote,
					ownsRoute: managedRoutes.owns,
					onVisibilityChange: (sessionId, visible) => {
						setAuditViewVisible(sessionId, visible);
					}
				})
			}, AcpAuditVisibilityGate));
			installNativeToolRenderer(ctx);
			installAcpAssistantStream(ctx, {
				journalHub,
				t: ctx.locale.bind("acpActivity"),
				jsonStringWrapping,
				onOpenProjectedChild: openProjectedChild
			});
			ctx.slots.inject("conversation.chat.node", () => ctx.slots.register({
				name: "conversation.chat.node",
				key: "acp-activity",
				locale: "acpActivity",
				inject: () => ({
					journalHub,
					onOpenProjectedChild: openProjectedChild,
					jsonStringWrapping
				})
			}, AcpActivityNode));
			const coordinator = new CrossBackendCoordinator(ctx, managedRoutes.owns);
			ctx.inject(["uiSession"], (approvalCtx) => {
				const actions = {
					status: approvalCtx.uiSession.sessionStatus,
					isCurrent: (sessionId) => isMainSession(sessions, sessionId),
					async loadChildren(parent) {
						const result = await acpRemote.approvalChildren(parent);
						if (!result.ok) throw Object.assign(new Error(result.error.message), { code: result.error.code });
						return result.value;
					},
					async openMember(parent, child) {
						if (!isMainSession(sessions, parent)) return;
						const current = (await actions.loadChildren(parent)).find((entry) => entry.sessionId === child.sessionId && entry.parentSessionId === child.parentSessionId && entry.mode === child.mode);
						if (!isMainSession(sessions, parent) || current === void 0) return;
						openSubagentAside(ctx.sidebarRight, {
							parentSessionId: current.parentSessionId,
							childSessionId: current.sessionId,
							mode: current.mode
						});
					},
					resolveReason: (reason) => reason === void 0 ? void 0 : ctx.locale.resolveText(reason)
				};
				approvalCtx.slots.inject("conversation.input.dock", () => approvalCtx.slots.register({
					name: "conversation.input.dock",
					id: "acp-team-approvals",
					order: 95,
					locale: "acpActivity",
					inject: () => actions
				}, AcpTeamApprovals));
			});
			ctx.effect(() => coordinator.start(), "dsh-acp: model transition coordinator");
			ctx.slots.inject("shell.overlay", () => ctx.slots.register({
				name: "shell.overlay",
				id: "dsh-acp-cross-backend-confirmation",
				locale: "acpActivity",
				inject: () => ({ coordinator })
			}, CrossBackendModal));
			ctx.slots.inject("shell.overlay", () => ctx.slots.register({
				name: "shell.overlay",
				id: "dsh-acp-operation-outcomes",
				locale: "acpActivity",
				inject: () => ({ feedback })
			}, AcpOutcomeToast));
			ctx.slots.inject("conversation.input.dock", () => ctx.slots.register({
				name: "conversation.input.dock",
				id: "dsh-acp-recovery",
				order: 90,
				locale: "acpActivity",
				inject: () => ({
					remote: acpRemote,
					sessionAccessSource,
					streamFactory: ctx.remote,
					ownsRoute: managedRoutes.owns,
					createNewSession: async (sourceSessionId) => {
						const row = sessions.list.getSnapshot().byId[sourceSessionId];
						const location = resolveCrossBackendLocation(sourceSessionId, workspaces.list.getSnapshot().items, row?.cwd);
						if (location === void 0) throw new Error("The original session workspace is unavailable");
						const child = await sessions.create({
							...location.cwd === void 0 ? {} : { cwd: location.cwd },
							...location.workspaceId === void 0 ? {} : { workspaceId: location.workspaceId }
						});
						ctx.uiWorkspace.openSession(child);
					}
				})
			}, AcpRecoveryDock));
			ctx.slots.inject("conversation.input.left", () => ctx.slots.register({
				name: "conversation.input.left",
				id: "dsh-acp-agent-control",
				order: 80,
				locale: "acpActivity",
				inject: () => ({
					remote: acpRemote,
					sessionAccessSource,
					streamFactory: ctx.remote,
					ownsRoute: managedRoutes.owns,
					feedback,
					getDefaultProvider: async () => {
						const result = await ctx.remote.session.modelCatalog();
						return result.ok ? result.value.default.provider : void 0;
					},
					watchDefaultProvider: (changed) => {
						const disposers = [
							ctx.remote.$on("settings/document-updated", changed),
							ctx.remote.$on("llm/adapters-updated", changed),
							ctx.remote.$on("credentials/record-updated", changed),
							ctx.remote.$on("credentials/reference-updated", changed),
							ctx.on("connection/reset", changed)
						];
						return () => {
							for (const dispose of disposers) dispose();
						};
					}
				})
			}, AcpAgentControl));
		}
		/** Mount the generated namespace before starting the fiber that consumes it. */
		async function apply(ctx) {
			const disposeRemote = await ctx.remote.$mount(TYPERT_REMOTE);
			const ui = ctx.inject([...inject, "remote.dshAcp"], registerUi);
			try {
				await ui;
			} catch (error) {
				await ui.dispose();
				await disposeRemote();
				throw error;
			}
			return async () => {
				await ui.dispose();
				await disposeRemote();
			};
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map
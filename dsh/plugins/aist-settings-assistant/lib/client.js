window.__ModuleLoader__.load({
	id: "dsh-client-ui-settings-aist",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		const { jsx, jsxs } = require("react/jsx-runtime");
		const React = require("react");
		const PROXY = "http://127.0.0.1:3091";

		const S = {
			section: { display: "flex", flexDirection: "column", gap: 16, maxWidth: 760 },
			title: { fontSize: 20, fontWeight: 600, margin: 0 },
			intro: { color: "var(--dsw-alias-label-secondary)", margin: 0, lineHeight: "22px" },
			card: { border: "0.5px solid var(--dsw-alias-border-l3)", borderRadius: "var(--dsw-radius-md, 12px)", padding: 16, display: "flex", flexDirection: "column", gap: 12 },
			cardHead: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
			cardTitle: { fontWeight: 600, fontSize: 15, flex: 1, minWidth: 120 },
			badge: { fontSize: 11, padding: "2px 8px", borderRadius: 999, background: "var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.15))", color: "var(--dsw-alias-label-secondary)" },
			grid: { display: "grid", gridTemplateColumns: "minmax(0, 1fr) 140px", gap: 12 },
			row: { display: "flex", flexDirection: "column", gap: 6, minWidth: 0 },
			label: { fontSize: 13, fontWeight: 500 },
			hint: { fontSize: 12, color: "var(--dsw-alias-label-secondary)", lineHeight: "18px" },
			input: { boxSizing: "border-box", width: "100%", padding: "8px 10px", font: "inherit", fontSize: 13, color: "inherit", background: "var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.12))", border: "0.5px solid var(--dsw-alias-border-l3)", borderRadius: 8, outline: "none" },
			mono: { fontFamily: "var(--ds-font-family-code, monospace)" },
			actions: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
			button: { font: "inherit", fontSize: 13, fontWeight: 500, padding: "6px 12px", borderRadius: 8, border: "0.5px solid var(--dsw-alias-border-l3)", background: "var(--dsw-alias-button-elevated-fill, transparent)", color: "inherit", cursor: "pointer" },
			primary: { background: "var(--dsw-alias-label-primary)", color: "var(--dsw-alias-label-primary-inverted)", borderColor: "transparent" },
			danger: { color: "#e5484d" },
			link: { background: "none", border: "none", padding: 0, color: "var(--dsw-alias-state-business-primary, #7c8cff)", cursor: "pointer", font: "inherit", fontSize: 12 },
			status: { fontSize: 13 },
			ok: { color: "#3ba55d" },
			err: { color: "#e5484d" },
			dot: (on) => ({ display: "inline-block", width: 8, height: 8, borderRadius: 4, marginRight: 6, background: on ? "#3ba55d" : "#9a9a9a", verticalAlign: "middle" }),
			addCard: { border: "1px dashed var(--dsw-alias-border-l3)", borderRadius: "var(--dsw-radius-md, 12px)", padding: 14, textAlign: "center", cursor: "pointer", color: "var(--dsw-alias-label-secondary)", background: "none", font: "inherit", fontSize: 14 },
		};
		function fmtDate(iso) { try { return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }); } catch { return iso; } }
		let seq = 0;
		const blank = () => ({ key: "new-" + (++seq), slug: null, name: "", assistant_id: "", token: "", default: false, token_tail: null, token_exp: null, token_user: null, reveal: false });
		const fromServer = (a) => ({ key: a.slug, slug: a.slug, name: a.name, assistant_id: String(a.assistant_id), token: "", default: a.default, token_tail: a.token_tail, token_exp: a.token_exp, token_user: a.token_user, reveal: false });

		function Editor({ initial, isNew, onSave, onCancel, busy, error }) {
			const [a, setA] = React.useState(initial);
			const set = (p) => setA((x) => ({ ...x, ...p }));
			const saved = Boolean(a.slug);
			return jsxs("div", { style: S.card, children: [
				jsx("div", { style: { ...S.cardTitle, fontSize: 16 }, children: isNew ? "Новый ассистент" : "Изменить: " + initial.name }),
				jsxs("div", { style: S.grid, children: [
					jsxs("div", { style: S.row, children: [
						jsx("label", { style: S.label, children: "Название" }),
						jsx("input", { style: S.input, autoFocus: true, placeholder: "Например: Юрист, Маркетолог, Код-ревью", value: a.name, onChange: (e) => set({ name: e.target.value }) }),
						jsx("div", { style: S.hint, children: "Так ассистент называется в селекторе модели в чате." }),
					] }),
					jsxs("div", { style: S.row, children: [
						jsx("label", { style: S.label, children: "ID ассистента" }),
						jsx("input", { style: S.input, type: "number", min: 1, value: a.assistant_id, onChange: (e) => set({ assistant_id: e.target.value }) }),
						jsx("div", { style: S.hint, children: "assistant_id из кабинета AiST." }),
					] }),
				] }),
				jsxs("div", { style: S.row, children: [
					jsx("label", { style: S.label, children: "JWT-токен" }),
					jsx("input", { style: { ...S.input, ...S.mono }, type: a.reveal ? "text" : "password", autoComplete: "off", spellCheck: false, value: a.token, placeholder: saved ? "Оставьте пустым, чтобы сохранить текущий" : "eyJhbGciOiJSUzI1NiIs…", onChange: (e) => set({ token: e.target.value }) }),
					jsxs("div", { style: S.hint, children: [
						saved && a.token_tail ? "Текущий токен …" + a.token_tail + (a.token_user ? ", пользователь " + a.token_user : "") + (a.token_exp ? ", до " + fmtDate(a.token_exp) : "") + ". " : "RS256 JWT с правом agent-api, выдаётся платформой AiST. ",
						jsx("button", { style: S.link, onClick: () => set({ reveal: !a.reveal }), children: a.reveal ? "Скрыть" : "Показать" }),
					] }),
				] }),
				jsxs("label", { style: { ...S.hint, display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }, children: [
					jsx("input", { type: "checkbox", checked: Boolean(a.default), onChange: (e) => set({ default: e.target.checked }) }),
					"Использовать по умолчанию для новых сессий",
				] }),
				jsxs("div", { style: S.actions, children: [
					jsx("button", { style: { ...S.button, ...S.primary, opacity: busy ? 0.5 : 1 }, disabled: busy, onClick: () => onSave(a), children: busy ? "Проверка токена…" : "Сохранить" }),
					jsx("button", { style: S.button, disabled: busy, onClick: onCancel, children: "Отмена" }),
					error && jsx("span", { style: { ...S.status, ...S.err }, children: error }),
				] }),
			] });
		}

		function Row({ a, onEdit, onRemove }) {
			return jsxs("div", { style: { ...S.card, flexDirection: "row", alignItems: "center", gap: 12, padding: "12px 16px" }, children: [
				jsx("span", { style: S.dot(Boolean(a.token_tail)) }),
				jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [
					jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [
						jsx("span", { style: { fontWeight: 600, fontSize: 15 }, children: a.name }),
						a.default && jsx("span", { style: S.badge, children: "по умолчанию" }),
					] }),
					jsx("div", { style: S.hint, children: "ID " + a.assistant_id + (a.token_tail ? " · токен …" + a.token_tail : " · токен не задан") + (a.token_exp ? " · до " + fmtDate(a.token_exp) : "") }),
				] }),
				jsx("button", { style: S.button, onClick: onEdit, children: "Изменить" }),
				jsx("button", { style: { ...S.button, ...S.danger }, onClick: onRemove, children: "Удалить" }),
			] });
		}

		function AssistantSection() {
			const [list, setList] = React.useState(null);
			const [loadError, setLoadError] = React.useState(null);
			const [editing, setEditing] = React.useState(null); // {key, isNew}
			const [confirmRemove, setConfirmRemove] = React.useState(null);
			const [busy, setBusy] = React.useState(false);
			const [error, setError] = React.useState(null);
			const [msg, setMsg] = React.useState(null);
			const [patchSynced, setPatchSynced] = React.useState(true);

			const applyServer = (j) => { setList((j.assistants || []).map(fromServer)); setPatchSynced(Boolean(j.dsh_patch_synced)); };
			const load = React.useCallback(async () => {
				setLoadError(null);
				try {
					const r = await fetch(PROXY + "/config");
					if (!r.ok) throw new Error("HTTP " + r.status);
					applyServer(await r.json());
				} catch (e) { setLoadError("Прокси AiST не отвечает на " + PROXY + ". Запустите ./start.sh в проекте aist-harness-proxy."); }
			}, []);
			React.useEffect(() => { load(); }, [load]);

			async function commit(next, okText) {
				setBusy(true); setError(null); setMsg(null);
				try {
					const payload = { assistants: next.map((a) => ({ slug: a.slug, name: a.name, assistant_id: a.assistant_id, token: a.token || undefined, default: a.default })) };
					const r = await fetch(PROXY + "/config", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
					const j = await r.json().catch(() => ({}));
					if (!r.ok || !j.ok) throw new Error(j.error || ("HTTP " + r.status));
					applyServer(j); setEditing(null); setConfirmRemove(null); setMsg({ ok: true, text: okText });
					return true;
				} catch (e) { setError(e.message || "Не удалось сохранить"); return false; }
				finally { setBusy(false); }
			}
			const saveEdited = (a) => {
				const next = editing.isNew ? [...list, a] : list.map((x) => x.key === a.key ? a : x);
				const withDefault = a.default ? next.map((x) => ({ ...x, default: x.key === a.key })) : next;
				return commit(withDefault, "Сохранено. «" + a.name + "» доступен в селекторе модели.");
			};
			const removeOne = (a) => commit(list.filter((x) => x.key !== a.key), "«" + a.name + "» удалён.");

			let body;
			if (loadError) body = jsxs("div", { style: S.card, children: [jsx("div", { style: { ...S.status, ...S.err }, children: loadError }), jsx("div", { children: jsx("button", { style: S.button, onClick: load, children: "Повторить" }) })] });
			else if (list === null) body = jsx("div", { style: S.hint, children: "Загрузка…" });
			else if (editing) {
				const initial = editing.isNew ? { ...blank(), default: list.length === 0 } : list.find((x) => x.key === editing.key);
				body = jsx(Editor, { initial, isNew: editing.isNew, busy, error, onSave: saveEdited, onCancel: () => { setEditing(null); setError(null); } }, editing.key || "new");
			} else body = jsxs(React.Fragment, { children: [
				list.length === 0 && jsx("div", { style: S.hint, children: "Ассистентов пока нет. Добавьте первого: нужны JWT Agent API и ID ассистента." }),
				...list.map((a) => confirmRemove === a.key
					? jsxs("div", { style: { ...S.card, flexDirection: "row", alignItems: "center", gap: 12 }, children: [
						jsx("span", { style: { flex: 1 }, children: "Удалить «" + a.name + "»? Сессии останутся, но модель исчезнет из селектора." }),
						jsx("button", { style: { ...S.button, ...S.danger }, disabled: busy, onClick: () => removeOne(a), children: busy ? "Удаление…" : "Удалить" }),
						jsx("button", { style: S.button, disabled: busy, onClick: () => setConfirmRemove(null), children: "Отмена" }),
					] }, a.key)
					: jsx(Row, { a, onEdit: () => { setError(null); setMsg(null); setEditing({ key: a.key, isNew: false }); }, onRemove: () => { setError(null); setMsg(null); setConfirmRemove(a.key); } }, a.key)),
				jsx("button", { style: S.addCard, onClick: () => { setError(null); setMsg(null); setEditing({ key: null, isNew: true }); }, children: "+ Добавить ассистента" }),
				(msg || error) && jsx("div", { style: { ...S.status, ...(error ? S.err : S.ok) }, children: error || msg.text }),
				!patchSynced && jsx("div", { style: { ...S.status, ...S.err }, children: "Прокси не нашёл маркеры aist-provider в cordis.patch.yml, список моделей в чате не синхронизируется. Запустите install-dsh.sh." }),
			] });

			return jsxs("div", { style: S.section, children: [
				jsx("h2", { style: S.title, children: "Ассистенты AiST" }),
				jsx("p", { style: S.intro, children: "AiST Cowork работает через ваших ассистентов на agent.aist-ai.com. Каждый ассистент — это пара JWT + ID; все они появляются в селекторе модели в чате, а отмеченный «по умолчанию» используется для новых сессий." }),
				body,
				jsx("p", { style: S.hint, children: "Прокси: " + PROXY + ". Токены хранятся в assistants.json рядом с прокси и в браузер не возвращаются. Смена ассистента по умолчанию применяется после перезапуска приложения." }),
			] });
		}

		// ---- first-run prompt: a plain DOM overlay shown whenever no assistant is configured ----
		function esc(t) { return String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
		async function firstRunPrompt() {
			let cfg;
			try { const r = await fetch(PROXY + "/config"); if (!r.ok) return; cfg = await r.json(); } catch { return; }
			if ((cfg.assistants || []).length) return;
			if (document.getElementById("aist-first-run")) return;
			const root = document.createElement("div");
			root.id = "aist-first-run";
			root.innerHTML = `
<style>
#aist-first-run{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.55);backdrop-filter:blur(4px);font-family:inherit;color:var(--dsw-alias-label-primary,#eee)}
#aist-first-run .box{width:min(560px,92vw);background:var(--dsw-specific-sidebar-fill,#1e1e1e);border:0.5px solid var(--dsw-alias-border-l3,#444);border-radius:16px;padding:28px;box-shadow:0 20px 60px rgba(0,0,0,.5);display:flex;flex-direction:column;gap:16px}
#aist-first-run .head{display:flex;align-items:center;gap:12px}
#aist-first-run h2{margin:0;font-size:20px;font-weight:600}
#aist-first-run p{margin:0;color:var(--dsw-alias-label-secondary,#aaa);line-height:22px;font-size:14px}
#aist-first-run label{display:flex;flex-direction:column;gap:6px;font-size:13px;font-weight:500}
#aist-first-run input{box-sizing:border-box;width:100%;padding:9px 10px;font:inherit;font-size:13px;color:inherit;background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.12));border:0.5px solid var(--dsw-alias-border-l3,#444);border-radius:8px;outline:none}
#aist-first-run input:focus{border-color:var(--dsw-alias-state-business-primary,#7c8cff)}
#aist-first-run .row{display:grid;grid-template-columns:1fr 140px;gap:12px}
#aist-first-run .hint{font-size:12px;color:var(--dsw-alias-label-secondary,#aaa);font-weight:400}
#aist-first-run .actions{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
#aist-first-run button{font:inherit;font-size:14px;font-weight:500;padding:8px 16px;border-radius:8px;border:0.5px solid var(--dsw-alias-border-l3,#444);background:transparent;color:inherit;cursor:pointer}
#aist-first-run button.primary{background:var(--dsw-alias-label-primary,#fff);color:var(--dsw-alias-label-primary-inverted,#111);border-color:transparent}
#aist-first-run button:disabled{opacity:.5;cursor:default}
#aist-first-run .err{color:#e5484d;font-size:13px}
#aist-first-run .ok{color:#3ba55d;font-size:13px}
</style>
<div class="box" role="dialog" aria-modal="true" aria-labelledby="aist-fr-title">
  <div class="head"><img src="${LOGO_URL}" width="36" height="36" style="border-radius:8px" alt=""><h2 id="aist-fr-title">Добавьте ассистента AiST</h2></div>
  <p>Чтобы начать работу в AiST Cowork, подключите вашего ассистента с платформы AiST. Нужны JWT-токен Agent API и ID ассистента; их можно взять в личном кабинете. Позже ассистентов можно добавить и изменить в Настройки → Ассистенты.</p>
  <form id="aist-fr-form" autocomplete="off">
    <div class="row">
      <label>Название<input name="name" placeholder="Например: Мой ассистент" required><span class="hint">Так он называется в селекторе модели.</span></label>
      <label>ID ассистента<input name="assistant_id" type="number" min="1" required><span class="hint">assistant_id из кабинета.</span></label>
    </div>
    <label style="margin-top:12px">JWT-токен<input name="token" type="password" placeholder="eyJhbGciOiJSUzI1NiIs…" required spellcheck="false"><span class="hint">RS256 JWT с правом agent-api. Хранится только на этом компьютере.</span></label>
    <div class="actions" style="margin-top:16px">
      <button type="submit" class="primary">Подключить</button>
      <button type="button" id="aist-fr-later">Позже</button>
      <span id="aist-fr-msg"></span>
    </div>
  </form>
</div>`;
			document.body.appendChild(root);
			const form = root.querySelector("#aist-fr-form"), msg = root.querySelector("#aist-fr-msg"), submit = form.querySelector("button[type=submit]");
			root.querySelector("#aist-fr-later").onclick = () => root.remove();
			form.querySelector("input[name=name]").focus();
			form.onsubmit = async (e) => {
				e.preventDefault();
				const fd = new FormData(form);
				const body = { assistants: [{ name: String(fd.get("name") || "").trim(), assistant_id: String(fd.get("assistant_id") || "").trim(), token: String(fd.get("token") || "").trim(), default: true }] };
				submit.disabled = true; msg.className = ""; msg.textContent = "Проверка токена…";
				try {
					const r = await fetch(PROXY + "/config", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
					const j = await r.json().catch(() => ({}));
					if (!r.ok || !j.ok) throw new Error(j.error || ("HTTP " + r.status));
					msg.className = "ok"; msg.textContent = "Подключено. Перезагружаем…";
					setTimeout(() => location.reload(), 900);
				} catch (err) { msg.className = "err"; msg.textContent = err.message || "Не удалось подключить"; submit.disabled = false; }
			};
		}
		const LOGO_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2b2b33"/><stop offset="0.55" stop-color="#101014"/><stop offset="1" stop-color="#000"/></linearGradient><linearGradient id="ink" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8fa0ff"/><stop offset="0.5" stop-color="#c77be0"/><stop offset="1" stop-color="#ffb070"/></linearGradient></defs><rect width="128" height="128" rx="28" fill="url(#bg)"/><rect x="1" y="1" width="126" height="126" rx="27" fill="none" stroke="#fff" stroke-opacity="0.14" stroke-width="1.5"/><text x="64" y="88" text-anchor="middle" font-family="Inter, -apple-system, Helvetica, Arial, sans-serif" font-size="64" font-weight="700" fill="url(#ink)">Ai</text></svg>';
		const LOGO_URL = "data:image/svg+xml;utf8," + encodeURIComponent(LOGO_SVG);

		const inject = ["slots"];
		function apply(ctx) {
			ctx.slots.inject("settings.section", () => ctx.slots.register({ name: "settings.section", id: "aist-assistant", order: 10, label: () => "Ассистенты" }, AssistantSection));
			setTimeout(() => { firstRunPrompt().catch(() => {}); }, 1500);
		}
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

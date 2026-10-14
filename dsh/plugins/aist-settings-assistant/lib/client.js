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
			section: { display: "flex", flexDirection: "column", gap: 20, maxWidth: 720 },
			title: { fontSize: 20, fontWeight: 600, margin: 0 },
			intro: { color: "var(--dsw-alias-label-secondary)", margin: 0, lineHeight: "22px" },
			card: { border: "0.5px solid var(--dsw-alias-border-l3)", borderRadius: "var(--dsw-radius-md, 12px)", padding: 16, display: "flex", flexDirection: "column", gap: 16 },
			row: { display: "flex", flexDirection: "column", gap: 6 },
			label: { fontSize: 14, fontWeight: 500 },
			hint: { fontSize: 12, color: "var(--dsw-alias-label-secondary)", lineHeight: "18px" },
			input: { boxSizing: "border-box", width: "100%", padding: "8px 10px", font: "inherit", fontSize: 13, color: "inherit", background: "var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.12))", border: "0.5px solid var(--dsw-alias-border-l3)", borderRadius: 8, outline: "none" },
			mono: { fontFamily: "var(--ds-font-family-code, monospace)" },
			actions: { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" },
			button: { font: "inherit", fontSize: 14, fontWeight: 500, padding: "7px 14px", borderRadius: 8, border: "0.5px solid var(--dsw-alias-border-l3)", background: "var(--dsw-alias-button-elevated-fill, transparent)", color: "inherit", cursor: "pointer" },
			primary: { background: "var(--dsw-alias-label-primary)", color: "var(--dsw-alias-label-primary-inverted)", borderColor: "transparent" },
			status: { fontSize: 13 },
			ok: { color: "#3ba55d" },
			err: { color: "#e5484d" },
			dot: (on) => ({ display: "inline-block", width: 8, height: 8, borderRadius: 4, marginRight: 8, background: on ? "#3ba55d" : "#e5484d" }),
		};

		function fmtDate(iso) { try { return new Date(iso).toLocaleString("ru-RU", { dateStyle: "long", timeStyle: "short" }); } catch { return iso; } }

		function AssistantSection() {
			const [cfg, setCfg] = React.useState(null);
			const [loadError, setLoadError] = React.useState(null);
			const [token, setToken] = React.useState("");
			const [id, setId] = React.useState("");
			const [busy, setBusy] = React.useState(false);
			const [msg, setMsg] = React.useState(null); // {ok, text}
			const [reveal, setReveal] = React.useState(false);

			const load = React.useCallback(async () => {
				setLoadError(null);
				try {
					const r = await fetch(PROXY + "/config");
					if (!r.ok) throw new Error("HTTP " + r.status);
					const j = await r.json();
					setCfg(j); setId(j.assistant_id ? String(j.assistant_id) : "");
				} catch (e) { setLoadError("Прокси AiST не отвечает на " + PROXY + ". Запустите ./start.sh в проекте aist-harness-proxy."); }
			}, []);
			React.useEffect(() => { load(); }, [load]);

			const dirty = token.trim() !== "" || (cfg && String(cfg.assistant_id ?? "") !== id.trim());
			async function save() {
				setBusy(true); setMsg(null);
				try {
					const body = { assistant_id: id.trim() };
					if (token.trim()) body.token = token.trim();
					const r = await fetch(PROXY + "/config", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
					const j = await r.json().catch(() => ({}));
					if (!r.ok || !j.ok) throw new Error(j.error || ("HTTP " + r.status));
					setCfg(j); setToken(""); setMsg({ ok: true, text: "Сохранено и проверено. Новые сессии используют ассистента " + j.assistant_id + "." });
				} catch (e) { setMsg({ ok: false, text: e.message || "Не удалось сохранить" }); }
				finally { setBusy(false); }
			}

			return jsxs("div", { style: S.section, children: [
				jsx("h2", { style: S.title, children: "Ассистент AiST" }),
				jsx("p", { style: S.intro, children: "Harness работает через вашего ассистента на agent.aist-ai.com. Укажите JWT-токен Agent API и ID ассистента; значения проверяются и сохраняются в .env прокси без перезапуска." }),
				loadError ? jsxs("div", { style: S.card, children: [
					jsx("div", { style: { ...S.status, ...S.err }, children: loadError }),
					jsx("div", { children: jsx("button", { style: S.button, onClick: load, children: "Повторить" }) }),
				] }) : jsxs("div", { style: S.card, children: [
					cfg && jsxs("div", { style: S.status, children: [
						jsx("span", { style: S.dot(cfg.token_set) }),
						cfg.token_set
							? "Токен задан (…" + cfg.token_tail + ")" + (cfg.token_user ? ", пользователь " + cfg.token_user : "") + (cfg.token_exp ? ", действует до " + fmtDate(cfg.token_exp) : "")
							: "Токен не задан",
					] }),
					jsxs("div", { style: S.row, children: [
						jsx("label", { style: S.label, htmlFor: "aist-jwt", children: "JWT-токен" }),
						jsx("input", { id: "aist-jwt", type: reveal ? "text" : "password", autoComplete: "off", spellCheck: false, style: { ...S.input, ...S.mono }, placeholder: cfg && cfg.token_set ? "Оставьте пустым, чтобы сохранить текущий" : "eyJhbGciOiJSUzI1NiIs…", value: token, onChange: (e) => setToken(e.target.value) }),
						jsxs("div", { style: S.hint, children: ["RS256 JWT с правом agent-api, выдаётся платформой AiST. ", jsx("a", { href: "#", onClick: (e) => { e.preventDefault(); setReveal(!reveal); }, children: reveal ? "Скрыть" : "Показать" })] }),
					] }),
					jsxs("div", { style: S.row, children: [
						jsx("label", { style: S.label, htmlFor: "aist-id", children: "ID ассистента" }),
						jsx("input", { id: "aist-id", type: "number", min: 1, style: { ...S.input, maxWidth: 160 }, value: id, onChange: (e) => setId(e.target.value) }),
						jsx("div", { style: S.hint, children: "Числовой assistant_id из личного кабинета AiST. Все новые задачи уходят этому ассистенту." }),
					] }),
					jsxs("div", { style: S.actions, children: [
						jsx("button", { style: { ...S.button, ...S.primary, opacity: busy || !dirty ? 0.5 : 1 }, disabled: busy || !dirty, onClick: save, children: busy ? "Проверка…" : "Сохранить" }),
						jsx("button", { style: S.button, disabled: busy, onClick: () => { setToken(""); setId(cfg ? String(cfg.assistant_id ?? "") : ""); setMsg(null); }, children: "Отменить" }),
						msg && jsx("span", { style: { ...S.status, ...(msg.ok ? S.ok : S.err) }, children: msg.text }),
					] }),
				] }),
				jsx("p", { style: S.hint, children: "Прокси: " + PROXY + " → " + (cfg ? cfg.base_url : "agent.aist-ai.com") + ". Модель в селекторе диалога — «AiST Агент», она всегда указывает на выбранного здесь ассистента." }),
			] });
		}

		const inject = ["slots"];
		function apply(ctx) {
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "aist-assistant",
				order: 10,
				label: () => "Ассистент",
			}, AssistantSection));
		}
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

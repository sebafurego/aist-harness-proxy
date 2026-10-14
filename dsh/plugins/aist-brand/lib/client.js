window.__ModuleLoader__.load({
	id: "dsh-client-ui-brand-aist",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		const { jsx, jsxs } = require("react/jsx-runtime");

		// AiST logo: gradient tile with white "Ai" (recreated from the brand image).
		const LOGO_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5b6cff"/><stop offset="0.45" stop-color="#5a3fd6"/><stop offset="0.75" stop-color="#c25a9a"/><stop offset="1" stop-color="#f2a35c"/></linearGradient></defs><rect width="128" height="128" rx="28" fill="url(#g)"/><text x="64" y="88" text-anchor="middle" font-family="Inter, -apple-system, Helvetica, Arial, sans-serif" font-size="64" font-weight="700" fill="#fff">Ai</text></svg>';
		const LOGO_URL = "data:image/svg+xml;utf8," + encodeURIComponent(LOGO_SVG);
		function AistMark({ size = 24, className }) {
			return jsx("img", { src: LOGO_URL, width: size, height: size, className, alt: "AiST", style: { borderRadius: Math.round(size * 0.22), display: "block" } });
		}
		function AistName() {
			return jsx("span", { style: { fontWeight: 700, fontSize: 18, letterSpacing: "0.02em" }, children: "AiST" });
		}
		function AistHeroMark({ size = 34, className }) {
			return jsx(AistMark, { size, className });
		}

		// Browser tab title: the shell writes "<session> — DeepSeek Harness"; rewrite it live.
		function watchTitle() {
			const fix = () => {
				const t = document.title;
				const n = t.replace(/DeepSeek Harness/g, "AiST.Ai").replace(/Harness/g, "AiST.Ai");
				if (n !== t) document.title = n;
			};
			fix();
			const el = document.querySelector("title");
			if (el) new MutationObserver(fix).observe(el, { childList: true, characterData: true, subtree: true });
		}

		function setFavicon() {
			for (const el of document.querySelectorAll('link[rel~="icon"], link[rel="apple-touch-icon"]')) el.remove();
			const link = document.createElement("link");
			link.rel = "icon"; link.type = "image/svg+xml"; link.href = LOGO_URL;
			document.head.appendChild(link);
		}

		const inject = ["slots"];
		function apply(ctx) {
			try { watchTitle(); setFavicon(); } catch {}
			ctx.slots.inject("sidebar.brand.mark", () => ctx.slots.inject("sidebar.brand.name", function* () {
				yield ctx.slots.register({ name: "sidebar.brand.mark" }, AistMark);
				yield ctx.slots.register({ name: "sidebar.brand.name" }, AistName);
			}));
			ctx.slots.inject("conversation.hero.brand.mark", function* () {
				yield ctx.slots.register({ name: "conversation.hero.brand.mark" }, AistHeroMark);
			});
		}
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

// Rebuilds dsh/plugins/aist-locale-ru/lib/client.js from ru_all.json.
const fs = require('fs'), path = require('path');
const ru = JSON.parse(fs.readFileSync(path.join(__dirname, 'ru_all.json'), 'utf8'));
const out = path.join(__dirname, '..', 'plugins', 'aist-locale-ru', 'lib', 'client.js');
const js = `window.__ModuleLoader__.load({
\tid: "dsh-client-locale-ru",
\tfactory: (require) => {
\t\tvar module = { exports: {} };
\t\tvar exports = module.exports;
\t\tObject.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
\t\tconst DICTS = ${JSON.stringify(ru)};
\t\tconst inject = ["locale"];
\t\tfunction apply(ctx) {
\t\t\tctx.effect(() => ctx.locale.addLanguage({ id: "ru", label: "Русский", fallback: "en" }), "locale-ru: language");
\t\t\tfor (const ns of Object.keys(DICTS)) ctx.effect(() => ctx.locale.register(ns, "ru", DICTS[ns]), "locale-ru: " + ns);
\t\t}
\t\texports.apply = apply;
\t\texports.inject = inject;
\t\treturn module.exports;
\t}
});
`;
fs.writeFileSync(out, js);
console.log('wrote', out, js.length, 'bytes');

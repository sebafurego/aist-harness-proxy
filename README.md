# aist-harness-proxy

Локальный прокси, который выдаёт агента AiST (agent.aist-ai.com) за Anthropic Messages API.
Нужен, чтобы DeepSeek Harness (и любой клиент с протоколом `anthropic-messages`) работал
поверх ассистента AiST вместо DeepSeek.

## Как это работает

| Anthropic Messages (клиент)         | AiST Agent API                               |
|-------------------------------------|----------------------------------------------|
| `POST /v1/messages`, новый user-msg | `POST /api/tasks` (+ `turns` прошлых ходов)  |
| `tools[]`                           | `client_tools[]`                             |
| ответ `tool_use`                    | задача в `interrupted`, `pending_tool_calls` |
| user-msg с `tool_result`            | `POST /api/tasks/{uuid}/tool-results`        |
| `text`-блоки                        | `turn.output[type=text]`                     |
| `stream: true`                      | SSE эмулируется после завершения шага        |

Системный промпт клиента уходит первым элементом `input` в тегах `<system>`.
История хранится в памяти процесса (ключ = system + первое сообщение); после перезапуска
прокси начните новый чат.

## Запуск

```bash
cp .env.example .env   # вписать AIST_TOKEN и AIST_ASSISTANT_ID
npm start              # http://localhost:3091/v1
```

Проверка:

```bash
curl localhost:3091/v1/messages -H 'content-type: application/json' \
  -d '{"model":"aist-87","max_tokens":200,"messages":[{"role":"user","content":"Привет"}]}'
```

## DeepSeek Harness

Провайдер уже прописан в `~/.dsh/profiles/web/cordis.patch.yml` (копия в `dsh/cordis.patch.yml`):
провайдер `aist` → `http://127.0.0.1:3091`, модель `aist-87`, выбран по умолчанию.

```bash
./start.sh   # поднимает прокси и dsh web, печатает ссылку с токеном
```

Либо вручную: `AIST_PROXY_KEY=local npx @deepseek-ai/dsh web`.

## Ограничения

- Каждый шаг агента = polling задачи AiST, поэтому медленнее нативного стриминга.
- Лимит AiST: 5 активных задач на пользователя. При старте прокси отменяет все
  `interrupted` задачи этого пользователя (`CANCEL_INTERRUPTED_ON_START=false` чтобы отключить).
- Картинки из сообщений пользователя загружаются в AiST через `POST /api/files`. Картинки из результатов инструментов (скриншоты, превью) AiST принять не может, поэтому прокси описывает их текстом через vision-модель (`VISION_API_URL`, `VISION_API_KEY`).

## Брендинг AiST вместо DeepSeek

Плагин `dsh/plugins/aist-brand` занимает слоты `sidebar.brand.mark`, `sidebar.brand.name`,
`conversation.hero.brand.mark`, подменяет заголовок вкладки и фавикон. Установка:

```bash
cp -R dsh/plugins/aist-brand ~/.dsh/profiles/web/plugins/
mkdir -p ~/.dsh/profiles/web/node_modules
ln -sfn ../plugins/aist-brand ~/.dsh/profiles/web/node_modules/dsh-client-ui-brand-aist
cp dsh/cordis.patch.yml ~/.dsh/profiles/web/   # отключает ui-brand-official, включает ui-brand-aist
```

Логотип задан inline-SVG в `lib/client.js` (`LOGO_SVG`); чтобы подставить оригинальный PNG,
замените `LOGO_URL` на data-URI картинки.

## Русский интерфейс

Плагин `dsh/plugins/aist-locale-ru` регистрирует язык `ru` и словари для всех 58 пространств
имён интерфейса (2615 строк). Источники: `dsh/i18n/en_all.json` (извлечено из бандлов dsh
скриптами `extract2.cjs`/`extract3.cjs`) и `dsh/i18n/ru_all.json` (перевод). После правки перевода:

```bash
node dsh/i18n/build.cjs          # пересобирает lib/client.js плагина
cp -R dsh/plugins/aist-locale-ru ~/.dsh/profiles/web/plugins/
ln -sfn ../plugins/aist-locale-ru ~/.dsh/profiles/web/node_modules/dsh-client-locale-ru
```

Русский выбран по умолчанию через `- id: locale` → `preference: ru` в `cordis.patch.yml`;
переключить можно в Настройки → Общие → Язык. При обновлении dsh новые строки появятся
на английском (fallback), нужно заново извлечь `en_all.json` и дополнить перевод.

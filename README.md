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
- Картинки в сообщениях не передаются (только текст).

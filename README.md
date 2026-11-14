# OpenAI Reto Correos

Send every attendee of an event their ChatGPT credit, but make them build it first.

Organizers upload two CSVs (attendees and credits). Each attendee gets an email with a personal
link to a game: 16 blocks of a QR code fall from the sky, they catch them with a gift box and dodge
the bugs that knock blocks off. When the QR is complete it shows their credit, ready to scan,
copy or claim.

> Los builders no reciben premios: los construyen.

## How it works

1. **Upload** the attendees CSV and the credits CSV at `/`. Columns are auto-detected
   (`email`, `correo`, `correo participante`, `nombre`, `nombres` + `apellidos`, `código`, `link`…)
   and can be changed by hand.
2. **Assign**: one credit per attendee, in order. Extra attendees become "usuarios pendientes";
   extra credits stay "libres".
3. **Send** with the admin password. Emails go out through the [Resend](https://resend.com)
   batch API, 100 per request.
4. **Play**: each email links to `/reto#<data>`. The attendee builds the QR to see the credit.
5. **Report**: a CSV downloads after sending, one row per credit (`enviado`, `fallido`, `libre`).
   Upload it again in **Ver reporte** to see it as a chart and download the leftovers for the
   next batch.

## The game link

```
<site>/reto#<data>
```

`<data>` is unpadded base64url of the UTF-8 JSON `{"c": "<code or link>", "n": "<first name>"}`
(`n` is optional). See `encodeReward` in `lib/token.ts`; it produces the same bytes as reto-qr's
`link_for`.

> [!IMPORTANT]
> The credit travels inside the link, so anyone with the link can read it without playing.
> The game is the experience, not the protection: **use single-use codes**.

## Run it

```bash
cp .env.example .env.local   # fill RESEND_API_KEY, ADMIN_PASSWORD, NEXT_PUBLIC_SITE_URL
npm install
npm run dev                  # http://localhost:3100
npm run check                # typecheck + tests
```

Requires Node 22.18 or newer (tests run TypeScript natively with `node --test`).
Sample files live in `examples/`.

| Variable | Purpose |
| --- | --- |
| `RESEND_API_KEY` | Resend key used to send the emails |
| `EMAIL_SENDER` | Sender shown in the inbox, on a domain verified in Resend |
| `ADMIN_PASSWORD` | Required to send the batch |
| `NEXT_PUBLIC_SITE_URL` | Base URL for the game links (falls back to the request origin) |

## Routes

| Route | What it is |
| --- | --- |
| `/` | Upload, send and report (admin) |
| `/reto#<data>` | The QR game an attendee opens from the email |
| `/play` | "¿Humano o IA?", a second mini game |
| `/slides` | Presentation of the project |

## Project layout

```
app/            Next.js app: admin page, report dashboard, send API, /play game
lib/            CSV parsing, credit assignment, email rendering, reward links (with tests)
public/reto/    The QR game: a single HTML file plus its illustrations
public/slides/  Standalone HTML presentation
examples/       Sample attendee and credit CSVs
```

## Credits

The QR game and its illustrations in `public/reto/` come from
[DweskZ/reto-qr](https://github.com/DweskZ/reto-qr), **built by Ruray**. The "Built by ruray"
seal stays visible in the game and in every email.

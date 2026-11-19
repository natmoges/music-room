# music-room

**natftp.com** — NatFromThisPlanet, the music room of NatFTP.

> You don't arrive at natftp.com, you drop out of hyperspace into it. While the page loads, the light stretches into bars and speeds up, faster and faster, and the jump ends as soon as the room is ready, so it never makes anyone wait. You come out in slow motion, like a ship leaving a portal, and land at the planet: NatFromThisPlanet, the music room of NatFTP. The HUD opens with it, like the start of a game, and that's where everything happens: playing, searching, choosing a beat, the outside links, buying.
>
> Coming from a YouTube link to one beat, the drop-out is short and you land with the HUD already open on that beat. Been here before, the jump is shorter. Hyperspace is always there: jump again and you come out at a random beat.
>
> Buying is a trip, not a button. Picking a license launches you out toward checkout, and the launch is the reward. No big red arrows. If a beat is gone, or the feed or the store is down, the HUD shows lost signal, same as the 404, with a way back.
>
> With reduced motion on, the room plays like my Pro Page video: the screen comes on with the glitch and retro effect, and the starfield drifts slow, no streaks. On a phone, everything bends toward browsing the catalog and acting on it.

## How it's built

- **Next.js + TypeScript, plain CSS Modules**, the same stack as [Accretion](https://github.com/natmoges/component-rebuilds). `output: "export"` writes static HTML that Cloudflare Pages hosts for free.
- **The catalog** comes from the BeatStars feed (the same file Meta's catalog reads hourly). `npm run sync` turns it into `data/catalog.json`, one row per beat. If the feed is down, the last good copy stays.
- **Every beat answers at two addresses:** `/beat/<id>` (the links in the YouTube descriptions) and `/beat/<slug>-<id>` (the BeatStars links). Both are written out at build time, so no old link breaks.
- **Checkout, files and contracts stay on BeatStars.** The room is the front; the store is the engine. Change `STORE` in `lib/site.ts` once and every buy link follows.
- **Tags carried over** from the store: GA4, the Meta pixel and the TikTok pixel. A license pick fires `begin_checkout` / `InitiateCheckout` before the launch.

| Piece | File | What it does |
| --- | --- | --- |
| Hyperspace | `components/Hyperspace.tsx` | Canvas warp: accelerates, breaks with a flash, exits in slow motion (arrive) or ends white (launch) |
| CRT boot | `components/CrtBoot.tsx` | The reduced-motion arrival: one line opens into the screen, boot text, no streaks |
| Starfield | `components/Starfield.tsx` | The calm sky after the jump |
| Planet | `components/Planet.tsx` | NatFromThisPlanet. Touch it to jump to a random beat |
| HUD | `components/Hud.tsx` | Catalog, search, filters, liner notes with the license ladder, lost signal, links |
| Room | `components/Room.tsx` | Decides the jump length (first visit, return, YouTube landing) and runs arrive → land → launch |

## Run it

```bash
npm install
npm run sync   # pull the catalog
npm run dev    # localhost:3000
npm run build  # static site in out/
```

## Credits

Built by Nat Moges. The planet, satellite and deep-space HUD carry over from natmoges.com and Accretion. Claude (Anthropic) was used as co-pilot.

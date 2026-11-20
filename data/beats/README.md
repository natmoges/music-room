# data/beats — one file per beat that's up in the room

The BeatStars feed (`data/catalog.json`) knows every beat. A file here is what makes a beat
**public** in the room, and it carries everything the feed doesn't: tempo, key, mood, the
YouTube video, the preview audio, the visualizer.

`<beatstars-id>.json`:

```json
{
  "id": "5200324",
  "published": true,
  "bpm": 146,
  "key": "Am",
  "mood": ["dark", "philly"],
  "tags": ["drill"],
  "youtube": "VIDEO_ID",
  "preview": null,
  "freeDownload": false,
  "visualizer": "https://…/5200324.mp4",
  "note": ""
}
```

- `preview`: leave it `null` and put the **tagged** MP3 at `public/previews/<id>.mp3` (named by the
  BeatStars ID, never by title: two beats can share a title). It can also be
  `"/previews/<id>.mp3"` or an `https://` URL. `false` means "the file here is not this beat":
  nothing plays.
- `key`: written like `Am`, `C#m`, `Ebmaj`, `G`. `bpm`: a whole number, as on BeatStars.
- `freeDownload: true` only after checking the beat's BeatStars page shows the Download button.
- `published: false` takes a beat down without deleting its file.
- Anything else can be added; the site ignores keys it doesn't know, so tools can attach data.

Add a beat: `npm run beat -- <id>` writes the file with the fields empty. Fill what you know.

## December workflow (new beats)
1. Upload to BeatStars, download the feed to `data/feed.csv`, run `npm run sync`.
2. `npm run beat -- <id>` creates `data/beats/<id>.json` as a draft (`"published": false`).
3. Put the tagged MP3 at `public/previews/<id>.mp3`; fill `youtube`, `bpm`, `key`, `mood`, `tags`.
4. Set `"published": true`, run `npm run check`. It names anything missing. `npm run build` runs the same check and stops if a beat isn't ready.

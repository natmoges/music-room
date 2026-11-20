# The NatFTP license ladder

One rule: every tier gives more than the one below it, and "Unlimited" means unlimited.
Prices stay as they are. No deals.

| | MP3 lease | WAV lease | Trackout | Unlimited | Exclusive |
|---|---|---|---|---|---|
| Price | $29.99 | $49.99 | $99.99 | $199.99 | Make an offer |
| Files | Untagged MP3 | MP3 + WAV | MP3 + WAV + stems | MP3 + WAV + stems | MP3 + WAV + stems |
| Copies | 3,000 | 10,000 | 10,000 | Unlimited | Unlimited |
| Audio streams | 500,000 | 1,000,000 | 1,000,000 | Unlimited | Unlimited |
| Music videos | 1 | 1 | 1 | Unlimited | Unlimited |
| Radio stations | 2 | 2 | 2 | Unlimited | Unlimited |
| For-profit live shows | Yes | Yes | Yes | Yes | Yes |
| Credit "Prod. NatFTP" | Required | Required | Required | Required | Required |
| Ownership | Producer keeps it (lease) | same | same | same | Beat comes off the store |

**Done on BeatStars, Nov 20, 2026** (Trackout and Unlimited contracts edited; the Basic, WAV and Unlimited feature lists rewritten). What changed: two lines, both in your buyers' favour.
- Trackout: audio streams 500,000 → **1,000,000**. It was the only tier giving less than the cheaper WAV lease.
- Unlimited: audio streams 500,000 → **Unlimited**; music videos 1 → **Unlimited**; radio stations 2 → **Unlimited**.

Basic and WAV stay exactly as they are; Exclusive stays negotiated.

## Why this shape
- Pro stores step every limit up with the price. Unlimited leases are sold as no caps on streams or sales; Trackout is the WAV lease plus stems.
- $199.99 Unlimited with real unlimited streams is in line with the market. A cap of 500,000 at that price was below what WAV buyers already get.
- Once these are set, a buyer never has a reason to email asking which license covers them. That's the "don't touch it again" part.

## Doing it on BeatStars (Nat)
1. BeatStars Studio → Contracts → **Trackout** → Online Audio Streams: `1000000`. Save.
2. **Unlimited License** → Online Audio Streams: Unlimited · Music Videos: Unlimited · Radio Stations: Unlimited. Save.
3. Licensing Info page: change the bullets to the table above. "All Streaming Services" comes out of Basic, WAV and Unlimited; it reads as unlimited when the contract says otherwise.
4. In this repo: `lib/licenses.ts`, set `LADDER` to `"next"`. Commit and push. The room shows the new terms.

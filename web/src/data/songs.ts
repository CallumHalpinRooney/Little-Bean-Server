import type { Song } from '../types'

// A handful of starter songs. "Creep" is the excerpt from the reference
// screenshot; the rest are traditional / public-domain songs so the demo
// library ships without copyright risk. Add your own songs by pushing more
// objects onto this array — `body` uses the same [Chord]lyric syntax
// throughout, see lib/chordpro.ts for the format.
export const songs: Song[] = [
  {
    id: 'creep',
    title: 'Creep',
    artist: 'Radiohead',
    key: 'G',
    body: `[[Verse]]
[G]When you were here be[B]fore
[C]Couldn't look you in the [Cm]eyes
[G]You just like an [B]angel
[C]Your skin makes me [Cm]cry

[[Verse]]
[G]You float like a [B]feather
[C]In a beautiful [Cm]world
[G]I wish I was [B]special
[C]You're so very [Cm]special

[[Chorus]]
But [G]I'm a creep, I'm a [B]wierdo
[C]What the hell am I doing here
[Cm]I don't belong here

[[Bridge]]
[G]I don't care if it [B]hurts
I [C]wanna have control
I [Cm]wanna perfect body
I [G]want a perfect [B]soul`,
  },
  {
    id: 'amazing-grace',
    title: 'Amazing Grace',
    artist: 'Traditional',
    key: 'G',
    body: `[[Verse 1]]
[G]Amazing grace, how [G7]sweet the sound
That saved a [C]wretch like [G]me
I once was [G]lost but [Em]now am found
Was [D]blind, but [G]now I [D]see

[[Verse 2]]
[G]'Twas grace that [G7]taught my heart to fear
And grace my [C]fears re[G]lieved
How precious [G]did that [Em]grace appear
The [D]hour I first be[G]lieved`,
  },
  {
    id: 'auld-lang-syne',
    title: 'Auld Lang Syne',
    artist: 'Traditional (Robert Burns)',
    key: 'G',
    body: `[[Verse 1]]
Should [G]auld acquaintance [C]be for[G]got
And [G]never brought to [D]mind
Should [G]auld acquaintance [C]be for[G]got
And [D]days of auld lang [G]syne

[[Chorus]]
For [G]auld lang [C]syne, my [G]dear
For [G]auld lang [D]syne
We'll [G]take a cup of [C]kindness [G]yet
For [D]auld lang [G]syne`,
  },
  {
    id: 'house-of-the-rising-sun',
    title: 'House of the Rising Sun',
    artist: 'Traditional',
    key: 'Am',
    body: `[[Verse 1]]
There [Am]is a house in [C]New Or[D]leans
They [F]call the Rising [Am]Sun
And it's [Am]been the ruin of [C]many a poor [D]boy
And [F]God I know I'm [Am]one

[[Verse 2]]
My [Am]mother was a [C]tailor [D]
She [F]sewed my new blue [Am]jeans
My [Am]father was a [C]gamblin' [D]man
Down [F]in New Orle[Am]ans`,
  },
]

export function getSong(id: string): Song | undefined {
  return songs.find((s) => s.id === id)
}

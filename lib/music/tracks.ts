// Bundled music library (public domain / CC0 tracks in public/music/).
// Optional everywhere: composers work fine without music.
export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  url: string; // public path
}

export const MUSIC_TRACKS: MusicTrack[] = [
  {
    id: "nocturne-27-1",
    title: "Nocturne Op. 27 No. 1",
    artist: "F. Chopin (dominio público)",
    url: "/music/nocturne-27-1.oga",
  },
  {
    id: "nocturne-37-2",
    title: "Nocturne Op. 37 No. 2",
    artist: "F. Chopin (CC0)",
    url: "/music/nocturne-37-2.oga",
  },
];

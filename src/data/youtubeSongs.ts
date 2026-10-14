/**
 * Starter YouTube songs that ship with the site, so visitors have music ready without their own
 * files (§5.7). Titles are shown as written here; the video ID is the 11-character code in the link.
 */
export interface YouTubeSong {
  title: string;
  artist: string;
  videoId: string;
}

export const YOUTUBE_SONGS: readonly YouTubeSong[] = [
  { title: "Maine Payal Hai Chhankai", artist: "Falguni Pathak", videoId: "0tjVtYtZ384" },
  { title: "Gori Radha Ne Kalo Kaan", artist: "Kirtidan Gadhvi", videoId: "ccqg6e2rfLU" },
  { title: "Saibo Re", artist: "Kirtidan Gadhvi, Priya Saraiya", videoId: "LnEmw07VElA" },
  { title: "Navlaakhaai Lobadiyaliyu", artist: "Aditya Gadhavi", videoId: "rPQ3TdzSt-Q" },
];

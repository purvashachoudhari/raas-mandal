// npm run music: scan music/ and write music/manifest.json (title from tags or file name, duration).
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseFile } from "music-metadata";
import { AUDIO_EXTENSIONS, type Manifest, type ManifestSong } from "../src/audio/manifest.ts";

const dir = fileURLToPath(new URL("../music/", import.meta.url));
await mkdir(dir, { recursive: true });

const isAudio = (f: string) => (AUDIO_EXTENSIONS as readonly string[]).includes(extname(f).toLowerCase());
const files = (await readdir(dir)).filter(isAudio).sort((a, b) => a.localeCompare(b));

const songs: ManifestSong[] = [];
for (const file of files) {
  const fallbackTitle = basename(file, extname(file));
  try {
    const { common, format } = await parseFile(join(dir, file), { duration: true });
    songs.push({
      file,
      title: common.title?.trim() || fallbackTitle,
      artist: common.artist?.trim() || null,
      duration: format.duration ? Math.round(format.duration * 10) / 10 : null,
    });
  } catch (err) {
    console.warn(`  ! ${file}: couldn't read tags (${(err as Error).message}), using the file name`);
    songs.push({ file, title: fallbackTitle, artist: null, duration: null });
  }
}

const manifest: Manifest = { version: 1, generated: new Date().toISOString(), songs };
await writeFile(join(dir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

const mmss = (s: number | null) => (s === null ? "?:??" : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`);
console.log(`Wrote music/manifest.json with ${songs.length} song${songs.length === 1 ? "" : "s"}:`);
for (const s of songs) console.log(`  ${mmss(s.duration).padStart(5)}  ${s.title}${s.artist ? ` · ${s.artist}` : ""}`);
if (!songs.length) console.log(`  (none) Add ${AUDIO_EXTENSIONS.join(", ")} files to music/ and run again.`);

/**
 * 音乐推荐模块
 * 使用网易云音乐 API 获取推荐歌曲
 * API: https://github.com/Binaryify/NeteaseCloudMusicApi
 */

const MUSIC_API_BASE =
  process.env.MUSIC_API_BASE || "https://netease-cloud-music-api.vercel.app";

export type Song = {
  id: number;
  name: string;
  artist: string;
  album: string;
  cover: string;
  url?: string;
};

export type MusicRecommendation = {
  songs: Song[];
  mood: string;
};

// 治愈系轻音乐歌单 ID
const PLAYLIST_ID = 2618247147;

export async function recommendSongs(
  mood: string = "neutral",
): Promise<Song[]> {
  try {
    const res = await fetch(
      `${MUSIC_API_BASE}/playlist/detail?id=${PLAYLIST_ID}`,
      {
        headers: { "Content-Type": "application/json" },
      },
    );

    if (!res.ok) {
      console.error(`[music] API error: ${res.status}`);
      return [];
    }

    const data = await res.json();
    console.log("[music] API response keys:", Object.keys(data));
    const tracks = data.playlist?.tracks || data.songs || [];
    console.log("[music] tracks count:", tracks.length);

    if (tracks.length === 0) {
      console.log("[music] no tracks found, using fallback");
      return getFallbackSongs();
    }

    return tracks.slice(0, 5).map((track: any) => ({
      id: track.id,
      name: track.name || "未知歌曲",
      artist: track.ar?.map((a: any) => a.name).join(" / ") || "未知歌手",
      album: track.al?.name || "未知专辑",
      cover: track.al?.picUrl || "",
    }));
  } catch (err) {
    console.error("[music] fetch error:", err);
    return getFallbackSongs();
  }
}

function getFallbackSongs(): Song[] {
  return [
    {
      id: 1,
      name: "月光落在杯底",
      artist: "轻音乐",
      album: "安静时光",
      cover: "",
    },
    {
      id: 2,
      name: "窗外的雨",
      artist: "自然音",
      album: "雨声集",
      cover: "",
    },
    {
      id: 3,
      name: "深夜的钢琴",
      artist: "钢琴曲",
      album: "夜曲",
      cover: "",
    },
    {
      id: 4,
      name: "风吹过树叶",
      artist: "白噪音",
      album: "自然之声",
      cover: "",
    },
    {
      id: 5,
      name: "慢慢来",
      artist: "治愈系",
      album: "温柔时刻",
      cover: "",
    },
  ];
}

export async function getSongUrl(songId: number): Promise<string | null> {
  try {
    const res = await fetch(`${MUSIC_API_BASE}/song/url?id=${songId}`, {
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) return null;

    const data = await res.json();
    const url = data.data?.[0]?.url;
    return url || null;
  } catch {
    return null;
  }
}

export function formatMusicResponse(songs: Song[]): string {
  if (songs.length === 0) {
    return "";
  }

  const lines = songs.map((s, i) => `${i + 1}. ${s.name} - ${s.artist}`);

  return `\n\n【推荐歌曲】\n${lines.join("\n")}\n`;
}

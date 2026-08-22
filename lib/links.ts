const VIDEO_HOSTS = [
  "youtube.com",
  "youtube-nocookie.com",
  "youtu.be",
  "vimeo.com",
  "loom.com",
  "streamable.com",
  "twitch.tv",
  "tiktok.com",
];

const MOVING_IMAGES = [".gif", ".apng", ".mp4", ".webm", ".mov", ".m4v"];

export function isVideoLink(value: string): boolean {
  try {
    const { hostname } = new URL(value);
    return VIDEO_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

export function isMovingImage(value: string): boolean {
  try {
    const { pathname } = new URL(value);
    return MOVING_IMAGES.some((extension) => pathname.toLowerCase().endsWith(extension));
  } catch {
    return false;
  }
}

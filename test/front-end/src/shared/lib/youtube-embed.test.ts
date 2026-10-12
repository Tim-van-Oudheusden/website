import { describe, expect, test } from "bun:test";

import { youTubeEmbedUrl } from "../../../../../front-end/src/shared/lib/youtube-embed";

describe("youTubeEmbedUrl", () => {
  test("turns a youtube.com watch link into a privacy-enhanced embed URL", () => {
    expect(youTubeEmbedUrl("https://www.youtube.com/watch?v=_muNlsJ9VM8"))
      .toBe("https://www.youtube-nocookie.com/embed/_muNlsJ9VM8");
  });

  test.each([
    ["a mobile watch link", "https://m.youtube.com/watch?v=_muNlsJ9VM8"],
    ["a YouTube Music link", "https://music.youtube.com/watch?v=_muNlsJ9VM8&feature=share"],
    ["a bare-domain watch link", "https://youtube.com/watch?list=PL1&v=_muNlsJ9VM8"],
    ["a youtu.be short link", "https://youtu.be/_muNlsJ9VM8"],
    ["a Shorts link", "https://www.youtube.com/shorts/_muNlsJ9VM8"],
    ["an embed link", "https://www.youtube.com/embed/_muNlsJ9VM8"],
    ["a live link", "https://www.youtube.com/live/_muNlsJ9VM8?feature=shared"],
  ])("embeds %s", (_label, href) => {
    expect(youTubeEmbedUrl(href)).toBe("https://www.youtube-nocookie.com/embed/_muNlsJ9VM8");
  });

  test.each([
    ["seconds", "https://youtu.be/_muNlsJ9VM8?t=90"],
    ["seconds with an s suffix", "https://www.youtube.com/watch?v=_muNlsJ9VM8&t=90s"],
    ["minutes and seconds", "https://www.youtube.com/watch?v=_muNlsJ9VM8&t=1m30s"],
    ["an embed start parameter", "https://www.youtube.com/embed/_muNlsJ9VM8?start=90"],
  ])("starts the player at a start time given in %s", (_label, href) => {
    expect(youTubeEmbedUrl(href)).toBe("https://www.youtube-nocookie.com/embed/_muNlsJ9VM8?start=90");
  });

  test("counts hours in a start time", () => {
    expect(youTubeEmbedUrl("https://youtu.be/_muNlsJ9VM8?t=1h2m3s"))
      .toBe("https://www.youtube-nocookie.com/embed/_muNlsJ9VM8?start=3723");
  });

  test("starts from the beginning when the start time is unreadable", () => {
    expect(youTubeEmbedUrl("https://youtu.be/_muNlsJ9VM8?t=soon"))
      .toBe("https://www.youtube-nocookie.com/embed/_muNlsJ9VM8");
  });

  test.each([
    ["another site using a v parameter", "https://example.com/watch?v=_muNlsJ9VM8"],
    ["a lookalike host", "https://notyoutube.com/watch?v=_muNlsJ9VM8"],
    ["a relative link", "/articles/introduction"],
    ["a watch link without a video", "https://www.youtube.com/watch"],
    ["a channel page", "https://www.youtube.com/@somechannel"],
    ["a playlist", "https://www.youtube.com/playlist?list=PL1"],
    ["a malformed video id", "https://www.youtube.com/watch?v=abc%2F..%2Fx"],
    ["a too-short video id", "https://youtu.be/abc"],
  ])("does not embed %s", (_label, href) => {
    expect(youTubeEmbedUrl(href)).toBeNull();
  });
});

import { useCallback, useEffect, useMemo, useState } from "react";

const BOOKMARK_KEY = "arcanum.bookmarks.v1";
const RECENT_KEY = "arcanum.recent.v1";
const STUDY_KEY = "arcanum.study-progress.v1";
const MAX_RECENT = 8;

function safeRead(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function safeWrite(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Local storage is optional; the archive continues to function without persistence.
  }
}

export function useArchiveMemory() {
  const [bookmarks, setBookmarks] = useState(() => safeRead(BOOKMARK_KEY, []));
  const [recent, setRecent] = useState(() => safeRead(RECENT_KEY, []));
  const [completedStudy, setCompletedStudy] = useState(() => safeRead(STUDY_KEY, []));

  useEffect(() => safeWrite(BOOKMARK_KEY, bookmarks), [bookmarks]);
  useEffect(() => safeWrite(RECENT_KEY, recent), [recent]);
  useEffect(() => safeWrite(STUDY_KEY, completedStudy), [completedStudy]);

  const bookmarkSet = useMemo(() => new Set(bookmarks), [bookmarks]);

  const toggleBookmark = useCallback((id) => {
    setBookmarks((current) => (
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [id, ...current]
    ));
  }, []);

  const remember = useCallback((id) => {
    setRecent((current) => [id, ...current.filter((item) => item !== id)].slice(0, MAX_RECENT));
  }, []);

  const clearRecent = useCallback(() => setRecent([]), []);

  const toggleStudyComplete = useCallback((chapterNumber) => {
    setCompletedStudy((current) => (
      current.includes(chapterNumber)
        ? current.filter((item) => item !== chapterNumber)
        : [...current, chapterNumber]
    ));
  }, []);

  return {
    bookmarks,
    bookmarkSet,
    recent,
    toggleBookmark,
    remember,
    clearRecent,
    completedStudy,
    toggleStudyComplete,
  };
}

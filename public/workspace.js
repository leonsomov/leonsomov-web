"use strict";

const STORAGE_PREFIX = "ls.song.workspace.updates.v1:";
const COMMENT_REPO = "leonsomov/leonsomov-web";

const ui = {
  createPanel: null,
  newSongTitle: null,
  newSongFocus: null,
  createWorkspaceBtn: null,
  createFeedback: null,
  workspacePanel: null,
  workspaceIdBadge: null,
  songTitleInput: null,
  songFocusInput: null,
  saveSongMetaBtn: null,
  shareLinkInput: null,
  copyLinkBtn: null,
  workspaceFeedback: null,
  updateText: null,
  addUpdateBtn: null,
  copyUpdateBtn: null,
  updateList: null,
  commentsRoot: null
};

let workspace = null;

document.addEventListener("DOMContentLoaded", initialize);

function initialize() {
  cacheDom();
  bindEvents();

  const urlWorkspace = readWorkspaceFromUrl();
  if (urlWorkspace) {
    activateWorkspace(urlWorkspace, { announce: "Workspace loaded from link." });
  }
}

function cacheDom() {
  ui.createPanel = document.getElementById("create-panel");
  ui.newSongTitle = document.getElementById("new-song-title");
  ui.newSongFocus = document.getElementById("new-song-focus");
  ui.createWorkspaceBtn = document.getElementById("create-workspace-btn");
  ui.createFeedback = document.getElementById("create-feedback");
  ui.workspacePanel = document.getElementById("workspace-panel");
  ui.workspaceIdBadge = document.getElementById("workspace-id-badge");
  ui.songTitleInput = document.getElementById("song-title-input");
  ui.songFocusInput = document.getElementById("song-focus-input");
  ui.saveSongMetaBtn = document.getElementById("save-song-meta-btn");
  ui.shareLinkInput = document.getElementById("share-link-input");
  ui.copyLinkBtn = document.getElementById("copy-link-btn");
  ui.workspaceFeedback = document.getElementById("workspace-feedback");
  ui.updateText = document.getElementById("update-text");
  ui.addUpdateBtn = document.getElementById("add-update-btn");
  ui.copyUpdateBtn = document.getElementById("copy-update-btn");
  ui.updateList = document.getElementById("update-list");
  ui.commentsRoot = document.getElementById("comments-root");
}

function bindEvents() {
  ui.createWorkspaceBtn.addEventListener("click", onCreateWorkspace);
  ui.saveSongMetaBtn.addEventListener("click", onSaveSongMeta);
  ui.copyLinkBtn.addEventListener("click", onCopyShareLink);
  ui.addUpdateBtn.addEventListener("click", onAddUpdate);
  ui.copyUpdateBtn.addEventListener("click", onCopyUpdateForComment);
}

function onCreateWorkspace() {
  const songTitle = normalizeText(ui.newSongTitle.value, 120);
  const songFocus = normalizeText(ui.newSongFocus.value, 280);

  if (!songTitle) {
    ui.createFeedback.textContent = "Write a song title first.";
    ui.newSongTitle.focus();
    return;
  }

  const id = createWorkspaceId(songTitle);
  const created = { id, song: songTitle, focus: songFocus };
  activateWorkspace(created, { announce: "Workspace created. Share the link." });
  ui.updateText.focus();
}

function onSaveSongMeta() {
  if (!workspace) {
    return;
  }

  const songTitle = normalizeText(ui.songTitleInput.value, 120);
  const songFocus = normalizeText(ui.songFocusInput.value, 280);
  if (!songTitle) {
    setWorkspaceFeedback("Song title cannot be empty.");
    ui.songTitleInput.focus();
    return;
  }

  workspace.song = songTitle;
  workspace.focus = songFocus;
  syncWorkspaceToUrl();
  setWorkspaceFeedback("Song info saved to link.");
}

async function onCopyShareLink() {
  if (!workspace) {
    return;
  }

  const copied = await copyText(ui.shareLinkInput.value);
  if (copied) {
    setWorkspaceFeedback("Link copied.");
  } else {
    setWorkspaceFeedback("Copy failed. Select the link and copy manually.");
  }
}

function onAddUpdate() {
  if (!workspace) {
    return;
  }

  const text = normalizeText(ui.updateText.value, 320);
  if (!text) {
    setWorkspaceFeedback("Write an update first.");
    ui.updateText.focus();
    return;
  }

  const updates = readUpdates(workspace.id);
  updates.unshift({
    text,
    timestamp: new Date().toISOString()
  });
  writeUpdates(workspace.id, updates);
  renderUpdates();
  ui.updateText.value = "";
  setWorkspaceFeedback("Update saved. Paste it in comments for collaborators.");
}

async function onCopyUpdateForComment() {
  const updateDraft = normalizeText(ui.updateText.value, 320);
  const latestStored = workspace ? readUpdates(workspace.id)[0] : null;
  const textToCopy = updateDraft || (latestStored ? latestStored.text : "");
  if (!textToCopy) {
    setWorkspaceFeedback("Add or type an update first.");
    return;
  }

  const now = formatTime(new Date().toISOString());
  const payload = `Task update (${now}): ${textToCopy}`;
  const copied = await copyText(payload);
  if (copied) {
    setWorkspaceFeedback("Update copied. Paste it into the comments section.");
  } else {
    setWorkspaceFeedback("Copy failed. Copy the update text manually.");
  }
}

function activateWorkspace(nextWorkspace, options = {}) {
  workspace = nextWorkspace;
  ui.workspacePanel.classList.remove("is-hidden");
  ui.workspaceIdBadge.textContent = `ID: ${workspace.id}`;
  ui.songTitleInput.value = workspace.song;
  ui.songFocusInput.value = workspace.focus;
  ui.newSongTitle.value = workspace.song;
  ui.newSongFocus.value = workspace.focus;

  syncWorkspaceToUrl();
  renderUpdates();
  renderComments(workspace.id);

  ui.createFeedback.textContent = options.announce || "";
}

function syncWorkspaceToUrl() {
  if (!workspace) {
    return;
  }

  const relativePath = buildWorkspaceRelativeUrl(workspace);
  window.history.replaceState({}, "", relativePath);
  ui.shareLinkInput.value = new URL(relativePath, window.location.origin).toString();
}

function buildWorkspaceRelativeUrl(activeWorkspace) {
  const params = new URLSearchParams();
  params.set("id", activeWorkspace.id);
  params.set("song", activeWorkspace.song);
  if (activeWorkspace.focus) {
    params.set("focus", activeWorkspace.focus);
  }
  return `${window.location.pathname}?${params.toString()}`;
}

function readWorkspaceFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const rawId = params.get("id");
  const id = sanitizeWorkspaceId(rawId);
  if (!id) {
    return null;
  }

  const song = normalizeText(params.get("song"), 120) || "Untitled song";
  const focus = normalizeText(params.get("focus"), 280);
  return { id, song, focus };
}

function sanitizeWorkspaceId(value) {
  if (!value) {
    return "";
  }
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

function createWorkspaceId(songTitle) {
  const slug = songTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 18) || "song";

  const randomPart = createSecureToken(16);
  return `${slug}-${randomPart}`;
}

function createSecureToken(byteLength) {
  const bytes = new Uint8Array(byteLength);
  if (window.crypto && typeof window.crypto.getRandomValues === "function") {
    window.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function normalizeText(value, maxLength) {
  if (!value) {
    return "";
  }
  return String(value).replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function updatesKey(workspaceId) {
  return `${STORAGE_PREFIX}${workspaceId}`;
}

function readUpdates(workspaceId) {
  try {
    const raw = window.localStorage.getItem(updatesKey(workspaceId));
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item) => item && typeof item.text === "string" && item.timestamp);
  } catch (error) {
    return [];
  }
}

function writeUpdates(workspaceId, updates) {
  window.localStorage.setItem(updatesKey(workspaceId), JSON.stringify(updates.slice(0, 80)));
}

function renderUpdates() {
  if (!workspace) {
    return;
  }

  const updates = readUpdates(workspace.id);
  ui.updateList.innerHTML = "";

  if (updates.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "update-item update-item-empty";
    emptyItem.textContent = "No updates yet.";
    ui.updateList.appendChild(emptyItem);
    return;
  }

  updates.forEach((update) => {
    const item = document.createElement("li");
    item.className = "update-item";

    const head = document.createElement("div");
    head.className = "update-item-head";
    head.textContent = formatTime(update.timestamp);

    const text = document.createElement("p");
    text.className = "update-item-text";
    text.textContent = update.text;

    item.appendChild(head);
    item.appendChild(text);
    ui.updateList.appendChild(item);
  });
}

function formatTime(isoString) {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function renderComments(workspaceId) {
  ui.commentsRoot.innerHTML = "";

  const script = document.createElement("script");
  script.src = "https://utteranc.es/client.js";
  script.async = true;
  script.setAttribute("repo", COMMENT_REPO);
  script.setAttribute("issue-term", `song-workspace:${workspaceId}`);
  script.setAttribute("theme", "github-dark");
  script.setAttribute("crossorigin", "anonymous");
  ui.commentsRoot.appendChild(script);
}

function setWorkspaceFeedback(message) {
  ui.workspaceFeedback.textContent = message;
}

async function copyText(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (error) {
    // Fall through to legacy copy method.
  }

  const temp = document.createElement("textarea");
  temp.value = text;
  temp.setAttribute("readonly", "");
  temp.style.position = "fixed";
  temp.style.left = "-9999px";
  document.body.appendChild(temp);
  temp.focus();
  temp.select();

  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch (error) {
    copied = false;
  }
  temp.remove();
  return copied;
}

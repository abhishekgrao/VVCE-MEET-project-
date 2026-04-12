'use strict';

/**
 * Custom Room page: build /join URL from form settings.
 *
 * Query params used by client.js:
 * - room, name, avatar, audio, video, screen, chat, hide, notify, duration, token
 */

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('customizeRoomForm');
    const errorEl = document.getElementById('crError');
    const statusEl = document.getElementById('crStatus');
    const previewEl = document.getElementById('crPreviewUrl');
    const copyBtn = document.getElementById('crCopy');
    const shareBtn = document.getElementById('crShare');
    const randomRoomBtn = document.getElementById('crRandomRoom');

    const roomEl = document.getElementById('room');
    const nameEl = document.getElementById('name');
    const usnEl = document.getElementById('usn');

    const durationEl = document.getElementById('duration');

    const audioEl = document.getElementById('audio');
    const videoEl = document.getElementById('video');
    const screenEl = document.getElementById('screen');
    const chatEl = document.getElementById('chat');
    const hideEl = document.getElementById('hide');
    const notifyEl = document.getElementById('notify');

    // Modal elements
    const customModal = document.getElementById('customModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const modalYes = document.getElementById('modalYes');
    const modalNo = document.getElementById('modalNo');

    // Reasonable defaults
    if (audioEl) audioEl.checked = true;
    if (videoEl) videoEl.checked = true;

    const setError = (msg) => {
        if (!errorEl) return;
        if (!msg) {
            errorEl.hidden = true;
            errorEl.textContent = '';
            return;
        }
        errorEl.hidden = false;
        errorEl.textContent = msg;
    };

    const setStatus = (msg) => {
        if (!statusEl) return;
        statusEl.textContent = msg || '';
    };

    const safe = (value) => {
        const v = (value ?? '').toString().trim();
        return typeof window.filterXSS === 'function' ? window.filterXSS(v) : v;
    };

    const boolToFlag = (checked) => (checked ? '1' : '0');

    const canWebShare = typeof navigator?.share === 'function';
    if (shareBtn) {
        shareBtn.hidden = !canWebShare;
    }

    const showModal = (title, message, showCancel = true) => {
        return new Promise((resolve) => {
            modalTitle.textContent = title;
            modalMessage.textContent = message;
            modalNo.style.display = showCancel ? 'inline-block' : 'none';
            customModal.style.display = 'flex';

            const onYes = () => {
                cleanup();
                resolve(true);
            };
            const onNo = () => {
                cleanup();
                resolve(false);
            };
            const cleanup = () => {
                modalYes.removeEventListener('click', onYes);
                modalNo.removeEventListener('click', onNo);
                customModal.style.display = 'none';
            };

            modalYes.addEventListener('click', onYes);
            modalNo.addEventListener('click', onNo);
        });
    };

    const uuidv4 = () => {
        if (typeof crypto?.randomUUID === 'function') return crypto.randomUUID();
        const bytes = new Uint8Array(16);
        crypto.getRandomValues(bytes);
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    };

    const normalizeDuration = (raw) => {
        const value = safe(raw);
        if (!value) return 'unlimited';
        if (value.toLowerCase() === 'unlimited') return 'unlimited';
        const re = /^(\d{2}):(\d{2}):(\d{2})$/;
        if (!re.test(value)) {
            throw new Error('Duration must be HH:MM:SS (e.g. 00:30:00) or left empty for unlimited');
        }
        return value;
    };

    const buildJoinUrl = () => {
        const room = safe(roomEl?.value);
        if (!room) throw new Error('Room name is required');

        const nameValue = safe(nameEl?.value);
        const usnValue = safe(usnEl?.value);

        let finalName = 'random';
        if (nameValue && usnValue) {
            finalName = `${nameValue} (${usnValue})`;
        } else if (nameValue) {
            finalName = nameValue;
        } else if (usnValue) {
            finalName = usnValue;
        }

        const duration = normalizeDuration(durationEl?.value);

        const url = new URL('/join', window.location.origin);
        url.searchParams.set('room', room);
        url.searchParams.set('name', finalName);
        url.searchParams.set('avatar', '0'); // Default to 0 as avatar is removed from UI

        url.searchParams.set('audio', boolToFlag(!!audioEl?.checked));
        url.searchParams.set('video', boolToFlag(!!videoEl?.checked));
        url.searchParams.set('screen', boolToFlag(!!screenEl?.checked));
        url.searchParams.set('chat', boolToFlag(!!chatEl?.checked));
        url.searchParams.set('hide', boolToFlag(!!hideEl?.checked));
        url.searchParams.set('notify', boolToFlag(!!notifyEl?.checked));

        url.searchParams.set('duration', duration);

        return url;
    };

    const buildJoinUrlForPreview = () => {
        const room = safe(roomEl?.value) || 'random';
        const url = new URL('/join', window.location.origin);
        if (!room) return url;
        try {
            return buildJoinUrl();
        } catch {
            return url;
        }
    };

    const updatePreview = () => {
        if (!previewEl) return;
        const url = buildJoinUrlForPreview();
        const room = safe(roomEl?.value);
        previewEl.value = room ? url.toString() : `${window.location.origin}/join?room=...`;
        if (copyBtn) copyBtn.disabled = !room;

        if (shareBtn) {
            shareBtn.disabled = !room;
        }
    };

    const copyToClipboard = async (text) => {
        if (navigator.clipboard?.writeText && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return;
        }
        const tmp = document.createElement('textarea');
        tmp.value = text;
        tmp.setAttribute('readonly', '');
        tmp.style.position = 'fixed';
        tmp.style.left = '-9999px';
        document.body.appendChild(tmp);
        tmp.select();
        document.execCommand('copy');
        document.body.removeChild(tmp);
    };

    if (!form) return;

    if (randomRoomBtn && roomEl) {
        randomRoomBtn.addEventListener('click', () => {
            setError('');
            setStatus('');
            roomEl.value = uuidv4();
            updatePreview();
            roomEl.focus();
        });
    }

    updatePreview();

    const inputs = [roomEl, nameEl, usnEl, audioEl, videoEl, screenEl, chatEl, hideEl, notifyEl];
    inputs.forEach((el) => {
        if (!el) return;
        el.addEventListener('input', updatePreview);
        el.addEventListener('change', updatePreview);
    });

    if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
            setError('');
            setStatus('');
            try {
                const joinUrl = buildJoinUrl();
                await copyToClipboard(joinUrl.toString());
                setStatus('Link copied to clipboard.');
            } catch (err) {
                setError(err?.message || 'Unable to copy join URL');
            }
        });
    }

    if (shareBtn && canWebShare) {
        shareBtn.addEventListener('click', async () => {
            setError('');
            setStatus('');
            try {
                const joinUrl = buildJoinUrl();
                await navigator.share({
                    title: document.title || 'vvce-meet',
                    url: joinUrl.toString(),
                });
            } catch (err) {
                const msg = err && err.name === 'AbortError' ? '' : err?.message;
                if (msg) setError(msg);
            }
        });
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        setError('');
        setStatus('');

        const nameValue = safe(nameEl?.value);
        const usnValue = safe(usnEl?.value);

        // Logic: IF i enter ONLY usn ask the user that USN will become name
        if (usnValue && !nameValue) {
            const ok = await showModal('Notice', 'You have only entered a USN. This will be used as your display name. Is that okay?');
            if (!ok) return;
        }

        // Logic: IF i enter ONLY name, ask USN
        if (nameValue && !usnValue) {
            const ok = await showModal('Missing USN', 'Entering a USN is recommended for better identification. Do you want to proceed without it?');
            if (!ok) {
                usnEl.focus();
                return;
            }
        }

        // Logic: if NO name and NO USN, we can default to random or ask
        if (!nameValue && !usnValue) {
             const ok = await showModal('Notice', 'No name or USN entered. You will join with a random name. Proceed?');
             if (!ok) {
                 nameEl.focus();
                 return;
             }
        }

        try {
            const joinUrl = buildJoinUrl();
            window.location.href = joinUrl.toString();
        } catch (err) {
            setError(err?.message || 'Unable to build join URL');
        }
    });
});

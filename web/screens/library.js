import { uploadRom, listRoms, deleteRom } from '../library.js';
import { hasState } from '../saves.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const badge = (r) => `<span class="badge${r.cgb ? ' cgb' : ''}">${r.cgb ? 'GBC' : 'GB'}</span>`;

function ago(t) {
  if (!t) return 'Not played yet';
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return 'Played just now';
  if (m < 60) return `Played ${m} min ago`;
  if (m < 48 * 60) return `Played ${Math.round(m / 60)} h ago`;
  return `Played ${new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

export async function mount(root, ctx) {
  root.innerHTML = `<header class="bar">
      <h1 class="wordmark">gbc-to-go</h1>
      <span class="upload-pill pill" role="status" hidden></span>
      <label class="icon-btn" title="Upload a ROM" aria-label="Upload a ROM">＋<input type="file" accept=".gb,.gbc" hidden></label>
      <button class="icon-btn" type="button" data-settings title="Settings" aria-label="Settings">⚙</button>
    </header>
    <section class="library"><p class="muted">Loading your games…</p></section>`;
  const list = root.querySelector('.library');
  const pill = root.querySelector('.upload-pill');
  const input = root.querySelector('input[type=file]');
  root.querySelector('[data-settings]').onclick = () => ctx.show('settings');

  input.onchange = async () => {
    const file = input.files[0];
    input.value = '';
    if (!file) return;
    pill.hidden = false;
    pill.textContent = 'Uploading…';
    try {
      // onProgress may report a fraction or (done, total).
      await uploadRom(file, (a, b) => { pill.textContent = `Uploading ${Math.round((b ? a / b : a) * 100)}%`; });
      ctx.toast(`Added ${file.name}`);
      await render();
    } catch (e) {
      console.error(e);
      ctx.toast(e.message || 'Upload failed.');
    } finally {
      pill.hidden = true;
    }
  };

  async function render() {
    let roms;
    try {
      roms = await listRoms();
    } catch (e) {
      console.error(e);
      list.innerHTML = '<p class="muted">Could not load your games. Check your connection and reload.</p>';
      return;
    }
    if (!roms.length) {
      list.innerHTML = '<p class="empty">No games yet. Tap ＋ to upload a .gb or .gbc file you own.</p>';
      return;
    }
    const last = roms.filter((r) => r.lastPlayedAt).sort((a, b) => b.lastPlayedAt - a.lastPlayedAt)[0];
    list.innerHTML = `${last ? `<button class="continue" type="button" data-play="${esc(last.id)}">
        <span class="continue-label">Continue</span>
        <span class="cart-title">${esc(last.title)}</span>
        <span class="continue-meta">${badge(last)} <span class="state-mark" hidden>state</span> ${ago(last.lastPlayedAt)}</span>
      </button>` : ''}
      <ul class="grid">${roms.map((r) => `<li class="cart">
        <button class="cart-play" type="button" data-play="${esc(r.id)}">
          <span class="cart-label"><span class="cart-title">${esc(r.title)}</span></span>
          <span class="cart-meta">${badge(r)} <span class="muted">${ago(r.lastPlayedAt)}</span></span>
        </button>
        <button class="cart-more" type="button" data-delete="${esc(r.id)}" aria-label="Delete ${esc(r.title)}">⋯</button>
      </li>`).join('')}</ul>`;
    const byId = new Map(roms.map((r) => [r.id, r]));
    list.querySelectorAll('[data-play]').forEach((b) => { b.onclick = () => ctx.show('play', { rom: byId.get(b.dataset.play) }); });
    list.querySelectorAll('[data-delete]').forEach((b) => {
      b.onclick = async () => {
        const r = byId.get(b.dataset.delete);
        if (!(await ctx.confirmDialog(`Delete ${r.title} from your library? This removes the ROM from this site.`, 'Delete'))) return;
        try {
          await deleteRom(r.id);
          ctx.toast(`Deleted ${r.title}`);
          await render();
        } catch (e) {
          console.error(e);
          ctx.toast('Could not delete. Check your connection and try again.');
        }
      };
    });
    // shortcut: state marker only on the Continue card (one hasState call), per-tile needs a cheap index of states.
    if (ctx.settings.saveStates && last) {
      hasState(last.id).then((has) => { const m = list.querySelector('.state-mark'); if (m) m.hidden = !has; }).catch(() => {});
    }
  }
  await render();
}

/** Gestione delle modali <dialog data-modal>. */

const openers = new WeakMap<HTMLDialogElement, HTMLElement | null>();

export function openModal(id: string, opener?: HTMLElement | null): HTMLDialogElement | null {
  const dialog = document.getElementById(id);
  if (!(dialog instanceof HTMLDialogElement) || dialog.open) return null;
  openers.set(dialog, opener ?? (document.activeElement as HTMLElement | null));
  dialog.showModal();
  return dialog;
}

export function closeModal(dialog: HTMLDialogElement): void {
  if (dialog.open) dialog.close();
}

let initialized = false;

export function initModals(): void {
  if (initialized) return;
  initialized = true;

  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const opener = target.closest<HTMLElement>('[data-modal-open]');
    if (opener) {
      e.preventDefault();
      openModal(opener.dataset.modalOpen ?? '', opener);
      return;
    }
    const closer = target.closest<HTMLElement>('[data-modal-close]');
    const dialog = target.closest<HTMLDialogElement>('dialog[data-modal]');
    if (closer && dialog) {
      closeModal(dialog);
      return;
    }
    // click sul backdrop: il target è il <dialog> stesso, fuori dalla card
    if (target instanceof HTMLDialogElement && target.matches('[data-modal]')) {
      const r = target.getBoundingClientRect();
      const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (!inside) closeModal(target);
    }
  });

  // Alla chiusura (anche con Esc) il focus torna all'elemento che ha aperto la modale
  document.querySelectorAll<HTMLDialogElement>('dialog[data-modal]').forEach((dialog) => {
    dialog.addEventListener('close', () => {
      const opener = openers.get(dialog);
      if (opener && document.contains(opener)) opener.focus();
    });
  });
}

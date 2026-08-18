import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Modal } from "./Modal";

function ModalHarness({ onClose = vi.fn() }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Abrir detalle</button>
      <Modal
        isOpen={open}
        onClose={() => {
          onClose();
          setOpen(false);
        }}
        title="Detalle accesible"
      >
        <button type="button">Primera acción</button>
        <button type="button">Última acción</button>
      </Modal>
    </>
  );
}

describe("Modal", () => {
  it("nombra el diálogo, mueve el foco y lo restaura al cerrar con Escape", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ModalHarness onClose={onClose} />);

    const opener = screen.getByRole("button", { name: "Abrir detalle" });
    await user.click(opener);

    const dialog = screen.getByRole("dialog", { name: "Detalle accesible" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    await waitFor(() => expect(screen.getByRole("button", { name: "Cerrar modal" })).toHaveFocus());

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it("mantiene Tab y Shift+Tab dentro del diálogo", async () => {
    const user = userEvent.setup();
    render(<ModalHarness />);
    await user.click(screen.getByRole("button", { name: "Abrir detalle" }));
    const close = screen.getByRole("button", { name: "Cerrar modal" });
    const last = screen.getByRole("button", { name: "Última acción" });

    await waitFor(() => expect(close).toHaveFocus());
    await user.keyboard("{Shift>}{Tab}{/Shift}");
    expect(last).toHaveFocus();
    await user.tab();
    expect(close).toHaveFocus();
  });
});

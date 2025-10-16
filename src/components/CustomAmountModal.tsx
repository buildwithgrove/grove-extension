import { FormEvent, useEffect, useState } from "react";

import { Modal } from "./Modal";

interface CustomAmountModalProps {
  open: boolean;
  initialAmount: number;
  onClose: () => void;
  onSave: (amountUsd: number) => void;
  mode?: "edit" | "confirm";
}

export function CustomAmountModal({ open, initialAmount, onClose, onSave, mode = "edit" }: CustomAmountModalProps) {
  const [amount, setAmount] = useState(initialAmount.toFixed(2));
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (open) {
      setAmount(initialAmount.toFixed(2));
      setError(undefined);
    }
  }, [open, initialAmount]);

  if (open && Number.parseFloat(amount) !== Number.parseFloat(initialAmount.toFixed(2))) {
    // Keep modal input in sync when reopened with a different default.
    // eslint-disable-next-line react-compiler/react-compiler
    setAmount(initialAmount.toFixed(2));
  }

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = Number.parseFloat(amount);
    if (Number.isNaN(parsed) || parsed <= 0) {
      setError("Enter a positive amount in USD.");
      return;
    }
    setError(undefined);
    onSave(parsed);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "confirm" ? "Choose tip amount" : "Custom tip amount"}
      width={360}
    >
      <form className="add-account-form" onSubmit={submit}>
        <div className="form-block">
          <label htmlFor="custom-amount">Amount (USD)</label>
          <input
            id="custom-amount"
            type="number"
            min={0.1}
            step={0.1}
            value={amount}
            onChange={event => setAmount(event.target.value)}
            autoFocus
          />
        </div>
        {error && <div className="form-error">{error}</div>}
        <div className="form-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="primary">
            {mode === "confirm" ? "Tip" : "Save"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

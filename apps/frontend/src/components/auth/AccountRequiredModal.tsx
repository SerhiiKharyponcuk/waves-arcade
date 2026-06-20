import { LogIn, UserPlus } from "lucide-react";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";

interface AccountRequiredModalProps {
  title?: string;
  message?: string;
  onLogin: () => void;
  onRegister: () => void;
  onContinue: () => void;
}

export function AccountRequiredModal({
  title = "Account required",
  message = "You need an account to use this feature.",
  onLogin,
  onRegister,
  onContinue
}: AccountRequiredModalProps) {
  return (
    <Modal title={title} closeLabel="Continue as guest" onClose={onContinue}>
      <div className="grid gap-4">
        <p className="text-sm leading-6 text-slate-300">{message}</p>
        <Button type="button" onClick={onLogin} icon={<LogIn size={18} />}>
          Log in
        </Button>
        <Button type="button" variant="secondary" onClick={onRegister} icon={<UserPlus size={18} />}>
          Create account
        </Button>
        <Button type="button" variant="ghost" onClick={onContinue}>
          Continue as guest
        </Button>
      </div>
    </Modal>
  );
}

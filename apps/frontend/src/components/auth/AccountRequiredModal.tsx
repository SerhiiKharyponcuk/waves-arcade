import { LogIn, UserPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
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
  title,
  message,
  onLogin,
  onRegister,
  onContinue
}: AccountRequiredModalProps) {
  const { t } = useTranslation();
  const resolvedTitle = title ?? t("guest.accountRequired");
  const resolvedMessage = message ?? t("guest.accountRequiredMessage");

  return (
    <Modal title={resolvedTitle} closeLabel={t("guest.continue")} onClose={onContinue}>
      <div className="grid gap-4">
        <p className="text-sm leading-6 text-slate-300">{resolvedMessage}</p>
        <Button type="button" onClick={onLogin} icon={<LogIn size={18} />}>
          {t("auth.login")}
        </Button>
        <Button type="button" variant="secondary" onClick={onRegister} icon={<UserPlus size={18} />}>
          {t("guest.createAccount")}
        </Button>
        <Button type="button" variant="ghost" onClick={onContinue}>
          {t("guest.continue")}
        </Button>
      </div>
    </Modal>
  );
}

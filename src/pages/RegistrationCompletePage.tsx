import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { RegistrationCompleteScreen } from "../components/figma/dyve/RegistrationCompleteScreen";
import { NavHeader } from "../components/figma/dyve/NavHeader";

const VALID_TYPES = ["performance", "artist", "venue", "project"] as const;
type RegistrationType = (typeof VALID_TYPES)[number];

export function RegistrationCompletePage() {
  const navigate = useNavigate();
  const { type } = useParams<{ type: RegistrationType }>();

  const resolvedType = VALID_TYPES.find((value) => value === type);

  useEffect(() => {
    if (!resolvedType) {
      navigate("/", { replace: true });
    }
  }, [resolvedType, navigate]);

  if (!resolvedType) {
    return (
      <div className="flex min-h-0 flex-1 flex-col bg-[var(--color-canvas)]">
        <NavHeader title="등록 완료" />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[var(--color-canvas)]">
      <NavHeader title="등록 완료" />
      <main className="min-h-0 flex-1 overflow-y-auto">
        <RegistrationCompleteScreen
          type={resolvedType}
          onConfirm={() => {
            if (resolvedType === "performance" || resolvedType === "project") {
              navigate("/ticket");
            } else {
              navigate("/network");
            }
          }}
        />
      </main>
    </div>
  );
}

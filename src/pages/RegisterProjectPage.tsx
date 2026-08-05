import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { RegisterProjectScreen } from "../components/figma/dyve/RegisterProjectScreen";
import { api, formatApiError } from "../services/api";

export function RegisterProjectPage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  return (
    <RegisterProjectScreen
      onBack={() => navigate(-1)}
      onSubmit={async (payload) => {
        try {
          setSubmitError(null);
          setIsSubmitting(true);
          await api.createProject({
            title: payload.title,
            description: payload.description,
            image: payload.imageData,
            targetAmount: payload.targetAmount,
            minPledgeAmount: payload.minPledgeAmount,
            deadline: payload.deadline,
            rewards: payload.rewards,
          });
          navigate("/registration-complete/project");
        } catch (error) {
          console.error("Failed to create project", error);
          setSubmitError(formatApiError(error, "후원 등록에 실패했어요."));
        } finally {
          setIsSubmitting(false);
        }
      }}
      isSubmitting={isSubmitting}
      submitError={submitError}
    />
  );
}

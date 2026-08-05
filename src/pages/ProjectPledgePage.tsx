import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ProjectPledgeScreen } from "../components/figma/dyve/ProjectPledgeScreen";
import { LoginPromptDialog } from "../components/figma/dyve/LoginPromptDialog";
import { PageState } from "../components/figma/dyve/PageState";
import { normalizeProject, type Project } from "../api/projects";
import { api, formatApiError } from "../services/api";
import { useAuth } from "../contexts/AuthContext";

export function ProjectPledgePage() {
  const navigate = useNavigate();
  const { isMember, user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [project, setProject] = useState<Project | null | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);
  const [isPromptOpen, setPromptOpen] = useState(false);

  const stateProject = useMemo(() => {
    const state = location.state as { project?: Project } | null;
    return state?.project ? normalizeProject(state.project) : undefined;
  }, [location.state]);

  useEffect(() => {
    if (stateProject) {
      setProject(stateProject);
    }
  }, [stateProject]);

  useEffect(() => {
    if (!id) return;
    const loadProject = async () => {
      try {
        setLoadErrorMessage(null);
        const response = await api.getProject(id);
        setProject(normalizeProject(response.data as Record<string, unknown>));
      } catch (error) {
        console.error("Failed to load project", error);
        setLoadErrorMessage(formatApiError(error, "후원 정보를 불러오지 못했어요."));
        if (!stateProject) {
          setProject(null);
        }
      }
    };
    void loadProject();
  }, [id, stateProject]);

  const resolvedProject = project || stateProject;
  if (!resolvedProject) {
    return (
      <PageState
        eyebrow="Pledge"
        title="후원 정보를 찾지 못했어요"
        description={loadErrorMessage ?? "후원이 종료되었거나 주소가 올바르지 않아요."}
        secondaryAction={{ label: "뒤로가기", onClick: () => navigate(-1) }}
      />
    );
  }

  return (
    <div className="bg-[var(--color-canvas)]">
      <main>
        <ProjectPledgeScreen
        project={resolvedProject}
        onBack={() => navigate(-1)}
        onComplete={async ({ rewardId, amount }) => {
          if (!isMember || !user) {
            setPromptOpen(true);
            return;
          }
          if (!id) return;
          try {
            setErrorMessage(null);
            setIsSubmitting(true);
            const checkout = await api.createPledge(id, {
              rewardId: rewardId ?? null,
              amount,
            });
            const checkoutRecord =
              checkout && typeof checkout === "object" ? (checkout as Record<string, unknown>) : null;
            const pledgeId =
              typeof checkoutRecord?.id === "string"
                ? checkoutRecord.id
                : typeof checkoutRecord?.pledgeId === "string"
                  ? checkoutRecord.pledgeId
                  : "";
            const paymentId =
              typeof checkoutRecord?.paymentId === "string" ? checkoutRecord.paymentId : "";
            if (!pledgeId) {
              throw new Error("Missing pledge id");
            }
            if (!paymentId) {
              throw new Error("Missing pledge payment id");
            }
            await api.confirmPledge(pledgeId, paymentId);
            navigate("/payment-complete", {
              state: {
                mode: "pledge",
                projectTitle: resolvedProject.title,
              },
            });
          } catch (error) {
            console.error("Pledge creation failed", error);
            setErrorMessage(formatApiError(error, "후원 요청에 실패했어요."));
          } finally {
            setIsSubmitting(false);
          }
        }}
        isSubmitting={isSubmitting}
        errorMessage={errorMessage}
      />
      </main>
      <LoginPromptDialog
        open={isPromptOpen}
        onOpenChange={setPromptOpen}
        onConfirm={() => navigate("/my")}
        title="후원은 로그인이 필요해요"
        description="로그인 후 후원할 수 있어요."
      />
    </div>
  );
}

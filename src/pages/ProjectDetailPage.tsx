import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ProjectDetailScreen } from "../components/figma/dyve/ProjectDetailScreen";
import { LoadingIndicator } from "../components/LoadingIndicator";
import { PageState } from "../components/figma/dyve/PageState";
import { normalizeProject, type Project } from "../api/projects";
import { api, formatApiError } from "../services/api";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function ProjectDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();

  const fallbackProject = useMemo(() => {
    const state = location.state as { project?: Project } | null;
    return state?.project ? normalizeProject(state.project) : undefined;
  }, [location.state]);

  const [project, setProject] = useState<Project | null | undefined>(fallbackProject);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadProject = useCallback(async () => {
    if (!id) {
      setErrorMessage("후원 정보를 찾지 못했어요.");
      setProject(null);
      setIsLoading(false);
      return;
    }
    if (!UUID_REGEX.test(id)) {
      setErrorMessage("후원 주소가 올바르지 않아요.");
      setProject(null);
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const response = await api.getProject(id);
      setProject(normalizeProject(response.data as Record<string, unknown>));
    } catch (error) {
      console.error("Failed to load project", error);
      setErrorMessage(formatApiError(error, "후원 정보를 불러오지 못했어요."));
      if (!fallbackProject) {
        setProject(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [id, fallbackProject]);

  useEffect(() => {
    void loadProject();
  }, [loadProject]);

  if (isLoading) {
      return (
        <div className="flex min-h-screen w-full items-center justify-center bg-[var(--color-canvas)] px-6 text-center text-[var(--color-muted)]">
          <LoadingIndicator className="text-lg text-[var(--color-ink)]" />
        </div>
      );
  }

  if (!project) {
    return (
      <PageState
        className="min-h-screen"
        eyebrow="Project"
        title="후원 정보를 불러오지 못했어요"
        description={errorMessage ?? "주소가 잘못되었거나 더 이상 공개되지 않은 후원입니다."}
        primaryAction={{ label: "다시 시도", onClick: loadProject }}
        secondaryAction={{ label: "뒤로가기", onClick: () => navigate(-1) }}
      />
    );
  }

  return (
    <div className="bg-[var(--color-canvas)]">
      <main>
        <ProjectDetailScreen
          project={project}
          onBack={() => navigate(-1)}
          onPledge={() => navigate(`/project/${project.id}/pledge`, { state: { project } })}
        />
      </main>
    </div>
  );
}

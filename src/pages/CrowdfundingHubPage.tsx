import { useNavigate } from "react-router-dom";
import { CrowdfundingHubScreen } from "../components/figma/dyve/CrowdfundingHubScreen";
import { Header } from "../components/figma/dyve/Header";

export function CrowdfundingHubPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <Header
        onSearchClick={() => navigate("/search")}
        onNotificationClick={() => navigate("/notifications")}
        onChatClick={() => navigate("/chats")}
      />
      <main className="flex-1 overflow-y-auto pb-24">
        <CrowdfundingHubScreen />
      </main>
    </div>
  );
}

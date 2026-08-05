import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { SearchScreen } from "../components/figma/dyve/SearchScreen";
import { api } from "../services/api";
import { mapEventToUi, mapProfileToUi } from "../utils/apiMappers";
import { formatDateDisplay } from "../utils/formatters";

export function SearchPage() {
  const navigate = useNavigate();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  type SearchResult = {
    id: string;
    type: "performance" | "artist" | "venue";
    name: string;
    image: string;
    title?: string;
    venue?: string;
    date?: string;
    subtitle?: string;
    address?: string;
  };

  const handleSearch = useCallback(async (query: string, signal?: AbortSignal) => {
    try {
      const results: SearchResult[] = [];
      const [eventsResponse, artistsResponse, venuesResponse] = await Promise.allSettled([
        api.getEvents({ q: query, limit: 20 }, signal),
        api.listArtistProfiles({ q: query, limit: 20 }, signal),
        api.listProfiles({ q: query, type: "venue", limit: 20 }, signal),
      ]);

      if (eventsResponse.status === "fulfilled") {
        const eventResults: SearchResult[] = eventsResponse.value.data.map((event): SearchResult => {
          const mapped = mapEventToUi(event);
          const record = event as { startAt?: string };
          return {
            id: mapped.id,
            type: "performance",
            title: mapped.title,
            name: mapped.title,
            image: mapped.image,
            venue: mapped.venue,
            date: mapped.date || formatDateDisplay(record.startAt),
          };
        });
        results.push(...eventResults);
      }

      if (artistsResponse.status === "fulfilled") {
        const artistResults: SearchResult[] = artistsResponse.value.data.map((profile): SearchResult => {
          const mapped = mapProfileToUi(profile);
          return {
            id: mapped.id,
            type: "artist",
            name: mapped.name,
            image: mapped.image,
            subtitle: mapped.subtitle,
          };
        });
        results.push(...artistResults);
      }

      if (venuesResponse.status === "fulfilled") {
        const venueResults: SearchResult[] = venuesResponse.value.data.map((profile): SearchResult => {
          const mapped = mapProfileToUi(profile);
          return {
            id: mapped.id,
            type: "venue",
            name: mapped.name,
            image: mapped.image,
            address: mapped.address ?? mapped.subtitle,
          };
        });
        results.push(...venueResults);
      }

      return results;
    } catch (error) {
      console.error("Search failed", error);
      throw error;
    }
  }, []);

  const handleResultClick = (result: { type: string; id: string }) => {
    if (result.type === "performance") {
      if (!uuidRegex.test(String(result.id))) {
        return;
      }
      navigate(`/events/${result.id}`, { state: { event: result } });
      return;
    }
    if (result.type === "artist") {
      navigate(`/artist/${result.id}`, { state: { profile: result } });
      return;
    }
    if (result.type === "venue") {
      navigate(`/venue/${result.id}`, { state: { profile: result } });
    }
  };

  return (
    <SearchScreen
      onClose={() => navigate(-1)}
      onResultClick={handleResultClick}
      onSearch={handleSearch}
    />
  );
}

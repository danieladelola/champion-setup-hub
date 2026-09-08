import { useQuery } from "@tanstack/react-query";

export type PublicAd = {
  id: string;
  title: string;
  image_url: string;
  link_url: string | null;
  placement: string;
  sort_order: number;
};

async function fetchAds(placement: string): Promise<PublicAd[]> {
  const res = await fetch(`/api/ads?placement=${encodeURIComponent(placement)}`);
  if (!res.ok) return [];
  const data = (await res.json().catch(() => ({}))) as { ads?: PublicAd[] };
  return data.ads ?? [];
}

function isExternal(url: string) {
  return /^https?:\/\//i.test(url);
}

export function AdSlot({ placement, className = "" }: { placement: string; className?: string }) {
  const { data } = useQuery({
    queryKey: ["ads", placement],
    queryFn: () => fetchAds(placement),
    staleTime: 60_000,
  });

  const ads = data ?? [];
  if (ads.length === 0) return null;

  return (
    <div className={`w-full px-6 py-8 md:px-12 ${className}`}>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        {ads.map((ad) => {
          const image = (
            <img
              src={ad.image_url}
              alt={ad.title || "Advertisement"}
              loading="lazy"
              className="block h-auto w-full max-w-full rounded-2xl object-contain"
            />
          );
          if (!ad.link_url) {
            return (
              <div key={ad.id} className="w-full overflow-hidden">
                {image}
              </div>
            );
          }
          const external = isExternal(ad.link_url);
          return (
            <a
              key={ad.id}
              href={ad.link_url}
              {...(external ? { target: "_blank", rel: "noopener noreferrer nofollow" } : {})}
              className="block w-full overflow-hidden transition-opacity hover:opacity-90"
            >
              {image}
            </a>
          );
        })}
      </div>
    </div>
  );
}

import logoAsset from "@/assets/royal-broiler-logo.asset.json";

export const ROYAL_BROILER_LOGO_URL = logoAsset.url;

export function BrandLogo({
  className = "",
  alt = "ROYAL BROILER",
}: {
  className?: string;
  alt?: string;
}) {
  return (
    <img
      src={logoAsset.url}
      alt={alt}
      className={className}
      draggable={false}
      loading="eager"
      decoding="async"
    />
  );
}

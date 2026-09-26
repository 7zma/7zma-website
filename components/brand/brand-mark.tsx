import Image from "next/image";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`brand-lockup${compact ? " brand-lockup--compact" : ""}`} aria-label="7ZMA حزمة">
      <span className="brand-symbol-wrap"><Image className="brand-symbol" src="/7zma-avatar.jpg" alt="" width={70} height={70} /></span>
      <span className="brand-word-stack">
        <span className="brand-latin">7ZMA</span>
        <span className="brand-arabic">حزمة</span>
      </span>
    </span>
  );
}

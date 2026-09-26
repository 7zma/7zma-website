"use client";

import Image from "next/image";
import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import { ImagePlus, LoaderCircle, RefreshCw } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { StoreCategory } from "@/types/storefront";

const MIME_EXT: Record<string, string> = { "image/webp": "webp", "image/png": "png", "image/jpeg": "jpg", "image/avif": "avif" };

export function CategoryImageManager() {
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [status, setStatus] = useState("Loading categories…");
  const [busyId, setBusyId] = useState("");
  const client = createSupabaseBrowserClient();

  const load = useCallback(async () => {
    if (!client) { setStatus("Connect Supabase to manage category images."); return; }
    const { data, error } = await client.from("categories").select("id,slug,name_ar,name_en,icon_key,cover_url,accent_color,sort_order").order("sort_order");
    if (error) { setStatus("Could not load categories. Confirm this account has owner or manager access and AAL2 MFA."); return; }
    setCategories((data ?? []) as StoreCategory[]);
    setStatus(data?.length ? "Choose a cover image for a category. Changes appear on the homepage automatically." : "There are no categories to edit yet.");
  }, [client]);

  useEffect(() => { void load(); }, [load]);

  async function upload(category: StoreCategory, event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    const extension = MIME_EXT[file.type];
    if (!extension) { setStatus("Use a WebP, PNG, JPG, or AVIF image."); return; }
    if (file.size > 2 * 1024 * 1024) { setStatus("Images must be 2 MB or smaller."); return; }
    if (!client) { setStatus("Connect Supabase before uploading an image."); return; }
    setBusyId(category.id); setStatus(`Uploading ${category.name_en}…`);
    const path = `category-covers/${category.id}/${Date.now()}.${extension}`;
    const { error: uploadError } = await client.storage.from("product-media").upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false });
    if (uploadError) { setBusyId(""); setStatus(uploadError.message === "The resource already exists" ? "Please choose the image again." : "Image upload failed. Confirm the product-media bucket is set up and admin access is active."); return; }
    const { data: publicFile } = client.storage.from("product-media").getPublicUrl(path);
    const { error: updateError } = await client.from("categories").update({ cover_url: publicFile.publicUrl }).eq("id", category.id);
    if (updateError) { setBusyId(""); setStatus("The image uploaded but the category could not be updated. Check admin access and retry."); return; }
    setCategories((rows) => rows.map((row) => row.id === category.id ? { ...row, cover_url: publicFile.publicUrl } : row));
    setBusyId(""); setStatus(`${category.name_en} updated. The homepage carousel will refresh automatically.`);
  }

  return <section className="admin-card-image-manager" aria-labelledby="category-image-title">
    <header className="admin-image-heading"><div><p className="admin-image-kicker">HOMEPAGE CAROUSEL</p><h2 id="category-image-title">Category cover images</h2><p>Upload the images visitors see rotate through on the homepage.</p></div><button type="button" onClick={() => void load()} aria-label="Refresh category list"><RefreshCw size={17} /></button></header>
    <p className="admin-image-status" role="status">{busyId && <LoaderCircle size={15} className="admin-image-spinner" />}{status}</p>
    <div className="admin-category-grid">{categories.map((category) => <article className="admin-category-card" key={category.id}>
      <div className="admin-category-preview">{category.cover_url ? <Image src={category.cover_url} alt="" fill sizes="(max-width:700px) 90vw, 360px" /> : <span><ImagePlus size={26} /></span>}</div>
      <div className="admin-category-meta"><strong>{category.name_en}</strong><span dir="rtl">{category.name_ar}</span></div>
      <label className="admin-image-upload">{busyId === category.id ? <LoaderCircle size={16} className="admin-image-spinner" /> : <ImagePlus size={16} />}{category.cover_url ? "Replace image" : "Upload image"}<input type="file" accept="image/webp,image/png,image/jpeg,image/avif" disabled={Boolean(busyId)} onChange={(event) => void upload(category, event)} /></label>
    </article>)}</div>
    <p className="admin-image-footnote">WebP, PNG, JPG, or AVIF · 2 MB maximum · Images are stored in the existing protected media bucket.</p>
  </section>;
}

import { z } from "zod";
import { notFound } from "next/navigation";
import { ProductEditorPage } from "@/components/products/product-editor-page";
import { getProduct } from "@/lib/server/products";
export const metadata = { title: "Edit product" };
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const product = await getProduct(id);
  if (!product) notFound();
  return <ProductEditorPage product={product} />;
}

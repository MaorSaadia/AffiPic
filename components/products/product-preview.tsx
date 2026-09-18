"use client";
import { Plus, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export function ProductPreview({ label = "Add product" }: { label?: string }) {
  return (
    <Dialog>
      <DialogTrigger render={<Button className="h-11 px-5" />}>
        <Plus size={17} />
        {label}
      </DialogTrigger>
      <DialogContent className="product-dialog sm:max-w-xl">
        <DialogHeader>
          <span className="eyebrow">UI PREVIEW ONLY</span>
          <DialogTitle className="text-xl">Add a product</DialogTitle>
          <DialogDescription>
            Take a look at your future product workflow. Nothing entered here is
            saved.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => event.preventDefault()}
          className="product-form"
        >
          <div className="form-field">
            <Label htmlFor="product-name">Product name</Label>
            <Input
              id="product-name"
              placeholder="A find worth sharing"
              autoComplete="off"
            />
          </div>
          <div className="form-field">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="What makes this product special?"
              rows={3}
            />
          </div>
          <div className="form-field">
            <Label htmlFor="image-url">Image URL</Label>
            <Input
              id="image-url"
              type="url"
              placeholder="https://example.com/product.jpg"
              aria-describedby="image-hint"
            />
            <p id="image-hint" className="field-hint">
              Preview only. Images are not fetched or uploaded.
            </p>
          </div>
          <div className="form-columns">
            <div className="form-field">
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                defaultValue=""
                aria-describedby="category-hint"
              >
                <option value="" disabled>
                  No categories yet
                </option>
              </select>
              <p id="category-hint" className="field-hint">
                Create categories in milestone 4.
              </p>
            </div>
            <div className="form-field">
              <Label htmlFor="merchant">Merchant name</Label>
              <Input id="merchant" placeholder="e.g. Your favorite store" />
            </div>
          </div>
          <div className="form-field">
            <Label htmlFor="affiliate-url">Affiliate URL</Label>
            <Input
              id="affiliate-url"
              type="url"
              placeholder="https://merchant.com/your-affiliate-link"
            />
          </div>
          <div className="form-notice" id="saving-explanation">
            <Info size={18} />
            <p>
              Saving will be connected in the product-management milestone (Day
              5). This preview does not create products.
            </p>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>
              Close preview
            </DialogClose>
            <Button
              type="submit"
              disabled
              aria-describedby="saving-explanation"
            >
              Save product
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

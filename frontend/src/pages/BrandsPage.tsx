import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { useBrands, useCreateBrand } from "@/hooks/queries/useBrands";

/** Brand monitoring list, with an inline "create brand" dialog -- the
 * entry point for Section 13 of the product spec (create/edit/delete a
 * brand monitor with keywords). Edit/delete live on BrandDetailPage. */
export default function BrandsPage() {
  const brands = useBrands();
  const createBrand = useCreateBrand();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [keywords, setKeywords] = useState("");

  const handleCreate = () => {
    if (!name.trim()) return;
    createBrand.mutate(
      { name: name.trim(), keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean) },
      {
        onSuccess: () => {
          setOpen(false);
          setName("");
          setKeywords("");
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Brands</h1>
          <p className="text-sm text-ink-muted">Brand monitors tracking mentions, sentiment, and crisis risk.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              New brand
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Monitor a new brand</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="brand-name">Brand name</Label>
                <Input id="brand-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nike" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="brand-keywords">Keywords (comma-separated)</Label>
                <Input
                  id="brand-keywords"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="nike, air jordan, nike delivery"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={!name.trim() || createBrand.isPending}>
                {createBrand.isPending ? "Creating…" : "Create brand"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {brands.isLoading && <LoadingState variant="cards" count={4} />}
      {brands.isError && <ErrorState onRetry={() => brands.refetch()} />}
      {brands.data && brands.data.length === 0 && (
        <EmptyState icon={ShieldAlert} title="No brands yet" message="Add a brand to start monitoring its mentions, sentiment, and risk." />
      )}
      {brands.data && brands.data.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {brands.data.map((brand) => (
            <Link key={brand.id} to={`/brands/${brand.id}`}>
              <Card className="p-5 hover:-translate-y-0.5 hover:border-signal-300 hover:shadow-raised">
                <p className="font-display text-base font-semibold text-ink">{brand.name}</p>
                <p className="mt-1 truncate text-xs text-ink-faint">
                  {brand.keywords && brand.keywords.length > 0 ? brand.keywords.join(", ") : "No keywords set"}
                </p>
                <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-muted">
                  <span
                    className={
                      brand.monitoring_enabled
                        ? "h-1.5 w-1.5 rounded-full bg-operational-500"
                        : "h-1.5 w-1.5 rounded-full bg-ink-faint"
                    }
                    aria-hidden="true"
                  />
                  {brand.monitoring_enabled ? "Monitoring active" : "Monitoring paused"}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

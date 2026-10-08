import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FileText, Folder, ListVideo, PlayCircle, ExternalLink, ChevronDown, Link2, FileSpreadsheet, Image as ImageIcon, Presentation, Film } from "lucide-react";
import { driveFileUrl, drivePreviewUrl } from "@/lib/learning";

type Viewer = { title: string; src: string; external?: string } | null;

export function FreeLearning() {
  const [viewer, setViewer] = useState<Viewer>(null);
  const [filter, setFilter] = useState<string>("All");
  const { data, isLoading } = useQuery({
    queryKey: ["learning-items"],
    queryFn: async () => {
      const { data, error } = await supabase.from("learning_items").select("*").eq("is_published", true).order("sort_order").order("created_at");
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (!data?.length) return null;

  const cats = [...new Set(data.map((d) => d.category))];
  const shown = filter === "All" ? cats : [filter];

  return (
    <div className="space-y-6">
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
        {["All", ...cats].map((c) => (
          <Button key={c} size="sm" variant={filter === c ? "default" : "outline"} className="rounded-full shrink-0 tap-scale" onClick={() => setFilter(c)}>{c}</Button>
        ))}
      </div>
      {shown.map((cat) => (
        <div key={cat}>
          <h2 className="font-display font-bold text-lg mb-3">{cat}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.filter((d) => d.category === cat).map((i) => <ItemCard key={i.id} item={i} onOpen={setViewer} />)}
          </div>
        </div>
      ))}
      <Dialog open={!!viewer} onOpenChange={(v) => !v && setViewer(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <DialogHeader className="p-3 pb-0 flex-row items-center justify-between gap-2">
            <DialogTitle className="text-sm truncate">{viewer?.title}</DialogTitle>
          </DialogHeader>
          {viewer && (
            <>
              <div className="aspect-video sm:aspect-[16/10] bg-muted">
                <iframe className="w-full h-full" src={viewer.src} title={viewer.title} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
              </div>
              {viewer.external && (
                <div className="p-3 pt-0 text-right">
                  <Button asChild size="sm" variant="outline"><a href={viewer.external} target="_blank" rel="noreferrer">Open / Download <ExternalLink className="h-3 w-3 ml-1" /></a></Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ItemCard({ item, onOpen }: { item: any; onOpen: (v: Viewer) => void }) {
  if (item.kind === "yt_video" || item.kind === "yt_playlist") {
    const isList = item.kind === "yt_playlist";
    const src = isList ? `https://www.youtube.com/embed/videoseries?list=${item.ref}` : `https://www.youtube.com/embed/${item.ref}?autoplay=1`;
    return (
      <button className="text-left group" onClick={() => onOpen({ title: item.title, src })}>
        <Card className="overflow-hidden shadow-card group-hover:shadow-elevated transition-all hover-lift">
          <div className="relative aspect-video bg-hero">
            {!isList && <img src={`https://i.ytimg.com/vi/${item.ref}/hqdefault.jpg`} alt={item.title} loading="lazy" className="w-full h-full object-cover" />}
            <div className="absolute inset-0 grid place-items-center">
              {isList ? <ListVideo className="h-12 w-12 text-primary-foreground/80" /> : <PlayCircle className="h-12 w-12 text-primary-foreground drop-shadow-lg" />}
            </div>
            {isList && <Badge className="absolute top-2 left-2">Series</Badge>}
          </div>
          <CardContent className="p-3">
            <p className="font-semibold text-sm line-clamp-2">{item.title}</p>
            {item.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{item.description}</p>}
          </CardContent>
        </Card>
      </button>
    );
  }
  if (item.kind === "drive_folder") return <FolderCard item={item} onOpen={onOpen} />;

  const isDrive = item.kind === "drive_file" && !/^https?:/.test(item.ref);
  return (
    <Card className="shadow-card hover-lift">
      <CardContent className="p-3 flex items-center gap-3">
        <div className="h-11 w-11 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
          {item.kind === "link" ? <Link2 className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{item.title}</p>
          {item.description && <p className="text-xs text-muted-foreground truncate">{item.description}</p>}
        </div>
        {isDrive ? (
          <Button size="sm" variant="outline" onClick={() => onOpen({ title: item.title, src: drivePreviewUrl(item.ref), external: driveFileUrl(item.ref) })}>Open</Button>
        ) : (
          <Button asChild size="sm" variant="outline"><a href={item.kind === "drive_file" ? driveFileUrl(item.ref) : item.ref} target="_blank" rel="noreferrer">Open</a></Button>
        )}
      </CardContent>
    </Card>
  );
}

const iconFor = (mime: string) => {
  if (mime.includes("folder")) return Folder;
  if (mime.includes("spreadsheet") || mime.includes("excel") || mime.includes("csv")) return FileSpreadsheet;
  if (mime.includes("presentation") || mime.includes("powerpoint")) return Presentation;
  if (mime.startsWith("image/")) return ImageIcon;
  if (mime.startsWith("video/")) return Film;
  return FileText;
};

function FolderCard({ item, onOpen }: { item: any; onOpen: (v: Viewer) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="sm:col-span-2 lg:col-span-3">
      <Card className="shadow-card">
        <CollapsibleTrigger className="w-full p-3 flex items-center gap-3 text-left">
          <div className="h-11 w-11 rounded-lg bg-accent/15 text-accent grid place-items-center shrink-0"><Folder className="h-5 w-5" /></div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{item.title}</p>
            {item.description && <p className="text-xs text-muted-foreground truncate">{item.description}</p>}
          </div>
          <ChevronDown className={`h-5 w-5 transition-transform ${open ? "rotate-180" : ""}`} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <FolderFiles folderId={item.ref} onOpen={onOpen} depth={0} />
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function FolderFiles({ folderId, onOpen, depth }: { folderId: string; onOpen: (v: Viewer) => void; depth: number }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["drive-folder", folderId],
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("drive-list", { body: { folderId } });
      if (error) throw error;
      return data.files as { id: string; name: string; mimeType: string; webViewLink?: string }[];
    },
  });
  const [sub, setSub] = useState<string | null>(null);
  if (isLoading) return <div className="p-3"><Skeleton className="h-10" /></div>;
  if (isError) return <p className="p-3 text-xs text-destructive">Couldn't load this folder.</p>;
  if (!data?.length) return <p className="p-3 text-xs text-muted-foreground">Folder is empty.</p>;
  return (
    <ul className={`border-t border-border divide-y divide-border ${depth ? "ml-4" : ""}`}>
      {data.map((f) => {
        const Icon = iconFor(f.mimeType);
        const isFolder = f.mimeType.includes("folder");
        return (
          <li key={f.id}>
            <button
              className="w-full px-3 py-2.5 flex items-center gap-3 text-left hover:bg-secondary/60 transition-colors"
              onClick={() => isFolder ? setSub(sub === f.id ? null : f.id) : onOpen({ title: f.name, src: drivePreviewUrl(f.id), external: f.webViewLink ?? driveFileUrl(f.id) })}
            >
              <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm flex-1 truncate">{f.name}</span>
              {isFolder && <ChevronDown className={`h-4 w-4 transition-transform ${sub === f.id ? "rotate-180" : ""}`} />}
            </button>
            {isFolder && sub === f.id && depth < 3 && <FolderFiles folderId={f.id} onOpen={onOpen} depth={depth + 1} />}
          </li>
        );
      })}
    </ul>
  );
}

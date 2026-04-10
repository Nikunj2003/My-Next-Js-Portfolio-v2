import { CheckCircle2, CircleAlert, Info, Loader2, TriangleAlert, X } from "lucide-react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="top-right"
      visibleToasts={3}
      closeButton
      offset={{ top: "calc(max(1rem, env(safe-area-inset-top)) + 5.5rem)", right: "1rem" }}
      mobileOffset={{ top: "calc(max(1rem, env(safe-area-inset-top)) + 5rem)", left: "1rem", right: "1rem" }}
      className="toaster group font-sans"
      icons={{
        success: <CheckCircle2 className="h-4 w-4" />,
        error: <CircleAlert className="h-4 w-4" />,
        info: <Info className="h-4 w-4" />,
        warning: <TriangleAlert className="h-4 w-4" />,
        loading: <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />,
        close: <X className="h-4 w-4" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast items-start gap-3 overflow-hidden rounded-[1.5rem] border border-border/60 bg-[linear-gradient(180deg,hsl(var(--background)/0.985),hsl(var(--background)/0.95))] p-4 pr-12 text-foreground shadow-[inset_0_1px_0_rgba(41,214,185,0.3),0_18px_50px_rgba(15,23,42,0.22)] backdrop-blur-[20px] backdrop-saturate-150 transition-[border-color,box-shadow,background-color] duration-300 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.985),rgba(15,23,42,0.955))]",
          title: "text-[0.95rem] font-semibold tracking-[-0.01em] text-foreground",
          description: "text-[13px] leading-5 text-foreground/65",
          content: "flex flex-col gap-1.5",
          icon: "mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 bg-white/70 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] backdrop-blur-md dark:border-white/10 dark:bg-white/[0.06]",
          closeButton:
            "!left-auto !right-4 !top-4 !translate-x-0 !translate-y-0 h-8 w-8 rounded-full border border-black/5 bg-black/[0.04] text-foreground/60 transition-colors hover:bg-primary/10 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/30 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]",
          actionButton:
            "h-9 rounded-full border border-primary/20 bg-primary px-4 text-[12px] font-semibold text-primary-foreground shadow-[0_10px_24px_rgba(41,214,185,0.14)] transition-all hover:shadow-[0_14px_30px_rgba(41,214,185,0.2)]",
          cancelButton:
            "h-9 rounded-full border border-black/10 bg-black/[0.04] px-4 text-[12px] font-medium text-foreground/70 transition-colors hover:bg-black/[0.08] dark:border-white/10 dark:bg-white/[0.05] dark:hover:bg-white/[0.08]",
          default:
            "[&_[data-icon]]:border-primary/15 [&_[data-icon]]:bg-primary/10 [&_[data-icon]]:text-primary",
          success:
            "border-primary/25 shadow-[inset_0_1px_0_rgba(41,214,185,0.42),0_18px_50px_rgba(41,214,185,0.18)] [&_[data-icon]]:border-primary/20 [&_[data-icon]]:bg-primary/10 [&_[data-icon]]:text-primary",
          error:
            "border-destructive/30 shadow-[inset_0_1px_0_rgba(239,68,68,0.42),0_18px_50px_rgba(239,68,68,0.14)] [&_[data-icon]]:border-destructive/20 [&_[data-icon]]:bg-destructive/10 [&_[data-icon]]:text-destructive",
          info:
            "border-sky-400/25 shadow-[inset_0_1px_0_rgba(56,189,248,0.42),0_18px_50px_rgba(56,189,248,0.12)] [&_[data-icon]]:border-sky-400/20 [&_[data-icon]]:bg-sky-400/10 [&_[data-icon]]:text-sky-500 dark:[&_[data-icon]]:text-sky-300",
          warning:
            "border-amber-400/25 shadow-[inset_0_1px_0_rgba(245,158,11,0.42),0_18px_50px_rgba(245,158,11,0.12)] [&_[data-icon]]:border-amber-400/20 [&_[data-icon]]:bg-amber-400/10 [&_[data-icon]]:text-amber-500 dark:[&_[data-icon]]:text-amber-300",
          loading:
            "border-primary/20 shadow-[inset_0_1px_0_rgba(41,214,185,0.38),0_18px_50px_rgba(41,214,185,0.14)] [&_[data-icon]]:border-primary/20 [&_[data-icon]]:bg-primary/10 [&_[data-icon]]:text-primary",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };

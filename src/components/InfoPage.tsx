import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function InfoPage({
  title,
  lede,
  children,
}: {
  title: string;
  lede?: string;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto max-w-3xl pb-10">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {title}
          </CardTitle>
          {lede ? (
            <CardDescription className="text-base sm:text-lg">
              {lede}
            </CardDescription>
          ) : null}
        </CardHeader>
        <CardContent className="prose-site flex flex-col gap-4 pb-8 text-sm leading-relaxed text-foreground/90 sm:text-base">
          {children}
        </CardContent>
      </Card>
    </article>
  );
}

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background p-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-foreground">
          mosaic
        </h1>
        <p className="text-sm text-muted-foreground">
          Next.js 16 · React 19 · Base UI · Tailwind CSS 4
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Button>Get started</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Stay in the loop</CardTitle>
          <CardDescription>
            Subscribe to the mosaic newsletter for updates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" action="#">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                required
              />
            </div>
            <Button type="submit">Subscribe</Button>
          </form>
        </CardContent>
        <CardFooter>
          <p className="text-xs text-muted-foreground">
            We&apos;ll never share your email.
          </p>
        </CardFooter>
      </Card>
    </main>
  );
}

import { FileQuestion, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center p-8 bg-background">
            <div className="max-w-md w-full text-center space-y-6">
                <div className="mx-auto w-20 h-20 rounded-2xl bg-accent/10 flex items-center justify-center">
                    <FileQuestion className="w-10 h-10 text-accent" />
                </div>

                <div className="space-y-2">
                    <h1 className="text-4xl font-bold">404</h1>
                    <p className="text-lg text-muted-foreground">
                        Page not found
                    </p>
                    <p className="text-sm text-muted-foreground/80">
                        The page you&apos;re looking for doesn&apos;t exist or has been moved.
                    </p>
                </div>

                <Button variant="default" asChild>
                    <Link href="/">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Home
                    </Link>
                </Button>
            </div>
        </div>
    );
}

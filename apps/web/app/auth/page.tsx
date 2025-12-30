"use client";

import { authClient, signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Chrome } from "lucide-react";
import { useAuthSession } from "@/hooks/use-auth-session";
import { redirect } from "next/navigation";

export default function AuthPage() {
  const { data } = authClient.useSession();
  const handleSignIn = async () => {
    try {
      await signIn();
    } catch (error) {
      console.error("Sign in error:", error);
    }
  };

  if (data?.session.id) {
    return redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4  bg-muted">
      <Card className="w-full max-w-md  tracking-tighter ">
        <CardHeader className=" text-left gap-0 px-5 py-2">
          <CardTitle className="text-2xl font-bold">Welcome to DashMail</CardTitle>
          <CardDescription>Sign in to your account to continue</CardDescription>
        </CardHeader>
        <CardContent className=" mt-4">
          <Button
            onClick={handleSignIn}
            className=" py-5"
            size="lg"
            variant="default"
          >
            <span>
              <svg xmlns="http://www.w3.org/2000/svg" className="size-6 fill-white" viewBox="0 0 256 256"><path d="M228,128a100,100,0,1,1-22.86-63.64,12,12,0,0,1-18.51,15.28A76,76,0,1,0,203.05,140H128a12,12,0,0,1,0-24h88A12,12,0,0,1,228,128Z"></path></svg>
            </span>
            Continue with Google
          </Button>
        </CardContent>
        <CardFooter className="px-6 py-3 bg-card">
          <p className="text-xs text-muted-foreground text-left">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

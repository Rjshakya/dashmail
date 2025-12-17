import { Wifi, Zap } from "lucide-react";

import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";

interface Hero115Props {
  icon?: React.ReactNode;
  heading: string;
  description: string;
  button: {
    text: string;
    icon?: React.ReactNode;
    url: string;
    className?: string;
  };
  trustText?: string;
  imageSrc?: string;
  imageAlt?: string;
  className?: string;
}

const Hero115 = ({
  icon = <Wifi className="size-6" />,
  heading = "Blocks built with Shadcn & Tailwind",
  description = "Finely crafted components built with React, Tailwind and Shadcn UI. Developers can copy and paste these blocks directly into their project.",
  button = {
    text: "Discover Features",
    icon: <Zap className="ml-2 size-4" />,
    url: "https://www.shadcnblocks.com",
  },
  trustText = "Trusted by 25.000+ Businesses Worldwide",
  imageSrc = "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/placeholder-1.svg",
  imageAlt = "placeholder",
  className,
}: Hero115Props) => {
  return (
    <section className={cn("overflow-hidden py-32", className)}>
      <div className="container">
        <div className="flex flex-col gap-5">
          <div className="relative flex flex-col gap-5 px-2">
            {/* <div
              style={{
                transform: "translate(-50%, -50%)",
              }}
              className="absolute top-1/2 left-1/2 -z-10 mx-auto size-[800px] rounded-full border [mask-image:linear-gradient(to_top,transparent,transparent,white,white,white,transparent,transparent)] p-16 md:size-[1300px] md:p-32"
            >
              <div className="size-full rounded-full border p-16 md:p-32">
                <div className="size-full rounded-full border"></div>
              </div>
            </div> */}
            {/* <span className="mx-auto flex size-16 items-center justify-center rounded-full border md:size-20">
              {icon}
            </span> */}
            <h2 className="tracking-tighter md:mx-auto max-w-5xl text-left md:text-center text-3xl font-semibold text-balance md:text-6xl">
              {heading}
            </h2>
            <p className="tracking-tight text-xs md:text-sm md:mx-auto max-w-xl md:max-w-xl text-pretty  text-left md:text-center text-muted-foreground">
              {description}
            </p>
            <div className="flex flex-col items-start md:items-center justify-center gap-3 pt-3 pb-12">
              <Button className="w-52 py-5" size="lg" asChild>
                <Link href={button.url}>
                  {button.text} {button.icon}
                </Link>
              </Button>
              {trustText && (
                <div className="text-xs text-muted-foreground">{trustText}</div>
              )}
            </div>
          </div>
          <Image
            src={imageSrc}
            alt={imageAlt}
            className="mx-auto h-full max-h-131 w-full max-w-5xl rounded-2xl object-cover"
            width={100}
            height={100}
          />
        </div>
      </div>
    </section>
  );
};

export { Hero115 };

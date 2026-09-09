import type { Metadata } from "next";
import InfoPageView from "@/components/InfoPageView";
import { infoPages } from "@/lib/content";

export const metadata: Metadata = { title: infoPages.about.title, description: infoPages.about.description, alternates: { canonical: "/about" } };
export default function AboutPage() { return <InfoPageView page={infoPages.about} />; }

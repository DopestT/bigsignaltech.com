import type { Metadata } from "next";
import InfoPageView from "@/components/InfoPageView";
import { infoPages } from "@/lib/content";

export const metadata: Metadata = { title: infoPages.contact.title, description: infoPages.contact.description, alternates: { canonical: "/contact" } };
export default function ContactPage() { return <InfoPageView page={infoPages.contact} />; }

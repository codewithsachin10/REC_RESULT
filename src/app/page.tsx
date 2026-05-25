import { redirect } from "next/navigation";

export default function Home() {
  // Redirect to the student dashboard automatically
  redirect("/dashboard");
}

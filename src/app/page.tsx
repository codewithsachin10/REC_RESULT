import { redirect } from "next/navigation";

export default function Home() {
  // Redirect to the faculty dashboard automatically
  redirect("/faculty/dashboard");
}

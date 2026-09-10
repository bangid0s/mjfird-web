import NotFoundContent from "@/components/layout/NotFoundContent";

// Reached when a route inside the site group calls notFound() — an unknown
// project or post slug. The site layout already supplies nav and footer.
export default function NotFound() {
  return <NotFoundContent />;
}

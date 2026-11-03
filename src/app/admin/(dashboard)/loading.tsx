/*
  Shown inside the shell while a section's data loads, so a click in the
  sidebar answers immediately instead of freezing on the old page.
*/
export default function AdminLoading() {
  const bar = "animate-pulse bg-bg-raised-2";
  return (
    <div aria-busy="true" aria-label="Loading" className="flex flex-col gap-10">
      <div className="flex flex-col gap-3 border-b border-line pb-8">
        <div className={`${bar} h-4 w-28`} />
        <div className={`${bar} h-10 w-72 max-w-full`} />
        <div className={`${bar} h-4 w-96 max-w-full`} />
      </div>
      <div className="flex flex-col border border-line">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 border-t border-line px-4 py-4 first:border-t-0">
            <div className={`${bar} h-10 w-14`} />
            <div className="flex flex-1 flex-col gap-2">
              <div className={`${bar} h-4 w-1/3`} />
              <div className={`${bar} h-3 w-1/2`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

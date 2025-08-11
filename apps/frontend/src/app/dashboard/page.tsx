'use client';
import React from 'react';

export default function Dashboard() {
  return (
    // Use h-full to fill the parent container, and p-4 for padding.
    <div className="p-4 h-full">
      <div
        className="bg-sidebar border border-sidebar-border
                   rounded-[var(--radius)] shadow-md ring-1 ring-[color:var(--border)/25]
                   w-full h-full overflow-hidden"
      >
        {/* Your iframe will now correctly fill this container. */}
        {/* <iframe
          src="your_dashboard_url"
          className="w-full h-full"
          frameBorder="0"
          loading="lazy"
        /> */}
      </div>
    </div>
  );
}
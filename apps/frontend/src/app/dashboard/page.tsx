'use client';
import React from 'react';

export default function Dashboard() {
  return (
    <div
      className="bg-sidebar border border-sidebar-border
                 rounded-[var(--radius)] shadow-md ring-1 ring-[color:var(--border)/25]
                 w-full h-[calc(100svh-6.25rem)]  
                 overflow-hidden">                  
      {/* <iframe
        src="https://adb-1676947424761045.5.azuredatabricks.net/embed/dashboardsv3/01f06fb145e51cd49e9eb1d907531d68?o=1676947424761045&f_dcc2a427%7Ef297ad85=%257B%2522columns%2522%253A%255B%2522color%2522%252C%2522x%2522%252C%2522y%2522%255D%252C%2522rows%2522%253A%255B%255B%2522success%2522%252C%25222025-08-02T00%253A00%253A00.000Z%2522%252C%25222%2522%255D%255D%257D"
        className="w-full h-full"  
        frameBorder="0"
        loading="lazy"
      /> */}
    </div>
  );
}
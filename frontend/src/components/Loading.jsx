import React from 'react';

export default function Loading({ message = 'در حال بارگذاری...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="w-10 h-10 border-4 border-medish-200 border-t-medical-600 rounded-full animate-spin mb-4"></div>
      <p className="text-gray-500 text-sm">{message}</p>
    </div>
  );
}

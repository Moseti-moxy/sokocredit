import React from 'react';

export default function AuthHeroPanel() {
  return (
    <div className="hidden lg:block relative bg-brand-900">
      <img
        src="/market-trader-sokocredit.png"
        alt="SokoCredit customer at her fresh-produce market stall"
        className="absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: '42% center' }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      <div className="relative h-full flex flex-col justify-end p-10 text-white">
        <h2 className="font-display text-2xl font-semibold mb-2">Empowering Market Traders</h2>
        <p className="text-brand-100 text-sm max-w-sm">Reliable microfinance solutions designed for the rhythm of the modern market. Secure, fast, and transparent.</p>
      </div>
    </div>
  );
}

import React from "react";

interface IconProps {
  className?: string;
  size?: number;
}

// 1. Shielded Balances: Shield outline with protected inner note
export function ShieldedBalancesIcon({ className = "text-[var(--forest)]", size = 40 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 5L7 10.5V19C7 27 12.5 33.5 20 35C27.5 33.5 33 27 33 19V10.5L20 5Z" />
      <circle cx="20" cy="20" r="3.5" strokeWidth="1.5" />
      <path d="M20 13V15M20 25V27M13 20H15M25 20H27" strokeWidth="1.5" />
    </svg>
  );
}

// 2. Custom Anonymizer Router: Routing/branch icon
export function CustomRouterIcon({ className = "text-[var(--forest)]", size = 40 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="10" cy="20" r="3.5" />
      <circle cx="30" cy="11" r="3.5" />
      <circle cx="30" cy="29" r="3.5" />
      <path d="M13.5 20H19C21.5 20 23.5 18 24.5 15.5L26.5 11" />
      <path d="M19 20C21.5 20 23.5 22 24.5 24.5L26.5 29" />
    </svg>
  );
}

// 3. Multi-Call Composability: Three connected atomic loop nodes
export function MultiCallIcon({ className = "text-[var(--forest)]", size = 40 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="20" cy="9" r="3.5" />
      <circle cx="30" cy="28" r="3.5" />
      <circle cx="10" cy="28" r="3.5" />
      <path d="M22.5 12L27.5 24.5" />
      <path d="M26.5 28H13.5" />
      <path d="M12.5 24.5L17.5 12" />
    </svg>
  );
}

// 4. Protocol Allow-List: Checklist / verified list matrix
export function AllowListIcon({ className = "text-[var(--forest)]", size = 40 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="7" y="7" width="26" height="26" rx="4" />
      <path d="M12 14L15 17L21 11" />
      <path d="M12 25L15 28L21 22" />
      <path d="M23 14H28" />
      <path d="M23 25H28" />
    </svg>
  );
}

// 5. Consent-Gated Reads: Gated-lock / eye-with-slash
export function ConsentGatedIcon({ className = "text-[var(--forest)]", size = 40 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 20C10.5 13.5 15.5 10 20 10C24.5 10 29.5 13.5 33 20C29.5 26.5 24.5 30 20 30C15.5 30 10.5 26.5 7 20Z" />
      <circle cx="20" cy="20" r="4" />
      <line x1="8" y1="8" x2="32" y2="32" />
    </svg>
  );
}

// 6. Wallet-Mediated Compliance: Key with document credential
export function ComplianceIcon({ className = "text-[var(--forest)]", size = 40 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 9C8 7.34315 9.34315 6 11 6H23L31 14V31C31 32.6569 29.6569 34 28 34H11C9.34315 34 8 32.6569 8 31V9Z" />
      <path d="M22 6V15H31" />
      <circle cx="17" cy="24" r="3" />
      <path d="M19.5 25.5L25 29M23 27.5L25 25.5" />
    </svg>
  );
}

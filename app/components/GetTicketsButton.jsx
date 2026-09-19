"use client";

export default function GetTicketsButton({ className, children, ...props }) {
  const handleClick = (e) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-get-tickets'));
    }
  };

  return (
    <button 
      type="button" 
      onClick={handleClick} 
      className={className} 
      {...props}
    >
      {children || 'GET TICKETS'}
    </button>
  );
}

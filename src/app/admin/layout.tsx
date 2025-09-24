interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  // Simplified admin layout - bypass auth checks for now
  // TODO: Re-implement proper authentication later
  
  return (
    <div>
      {children}
    </div>
  );
}

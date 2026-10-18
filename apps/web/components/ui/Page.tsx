import { Plus } from 'lucide-react';

export function PageHeader({ title, description, actionLabel, onAction, extra }: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  extra?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{title.toUpperCase()}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="heading-actions">
        {extra}
        {actionLabel && onAction && <button className="btn primary" onClick={onAction}><Plus size={17} /> {actionLabel}</button>}
      </div>
    </div>
  );
}

export function ListPanel({ title, description, toolbar, children }: {
  title: string;
  description: string;
  toolbar?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="panel list-panel">
      <div className="panel-head list-toolbar">
        <div><h3>{title}</h3><p>{description}</p></div>
        <div className="toolbar-controls">{toolbar}</div>
      </div>
      {children}
    </div>
  );
}

export function PersonCell({ name, tone }: { name: string; tone: 'doctor' | 'patient' }) {
  const letters = name.split(' ').filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="person-cell">
      <div className={`avatar ${tone}-avatar`}>{letters}</div>
      <b>{name}</b>
    </div>
  );
}
